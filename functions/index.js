const functions = require('firebase-functions');

// DHL Express Tracking API
async function trackDHL(trackingNumber) {
  const apiKey = process.env.DHL_API_KEY;
  if (!apiKey) throw new Error('DHL_API_KEY not configured');

  const url = `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}&service=express`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'DHL-API-Key': apiKey, 'Accept': 'application/json' }
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DHL API ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const shipments = data.shipments || [];

  if (shipments.length === 0) {
    return {
      status: 'not_found', statusText: '未找到物流信息',
      estimatedDelivery: '', origin: '', destination: '', events: []
    };
  }

  const ship = shipments[0];
  const statusCode = ship.status?.statusCode || ship.status?.status || 'unknown';
  const statusMap = {
    'pre-transit': '运输前', 'transit': '运输中',
    'delivered': '已签收', 'failure': '异常', 'unknown': '未知'
  };

  const events = (ship.events || []).map(ev => ({
    time: ev.timestamp || '',
    location: ev.location?.address?.addressLocality || '',
    status: ev.status || '',
    description: ev.description || ''
  })).sort((a, b) => (a.time < b.time ? -1 : 1));

  return {
    status: statusCode,
    statusText: statusMap[statusCode] || '运输中',
    estimatedDelivery: ship.estimatedDeliveryDate || '',
    origin: ship.origin?.address?.addressLocality || '',
    destination: ship.destination?.address?.addressLocality || '',
    events: events
  };
}

// FedEx Basic Integrated Visibility (Track API)
async function trackFedEx(trackingNumber) {
  const clientId = process.env.FEDEX_API_KEY;
  const clientSecret = process.env.FEDEX_SECRET_KEY;
  if (!clientId || !clientSecret) throw new Error('FEDEX_API_KEY or FEDEX_SECRET_KEY not configured');

  // 1. Get OAuth token
  const tokenResp = await fetch('https://apis.fedex.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
  });

  if (!tokenResp.ok) {
    throw new Error(`FedEx OAuth failed: ${await tokenResp.text()}`);
  }

  const { access_token } = await tokenResp.json();

  // 2. Call tracking API
  const trackResp = await fetch('https://apis.fedex.com/track/v1/trackingnumbers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
      'X-locale': 'zh_CN'
    },
    body: JSON.stringify({
      includeDetailedScans: true,
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }]
    })
  });

  if (!trackResp.ok) {
    throw new Error(`FedEx Track failed: ${await trackResp.text()}`);
  }

  const trackData = await trackResp.json();
  const results = trackData.output?.completeTrackResults || [];
  if (results.length === 0) {
    return { status: 'not_found', statusText: '未找到物流信息', estimatedDelivery: '', origin: '', destination: '', events: [] };
  }

  const trackResults = results[0].trackResults || [];
  if (trackResults.length === 0) {
    return { status: 'not_found', statusText: '未找到物流信息', estimatedDelivery: '', origin: '', destination: '', events: [] };
  }

  const detail = trackResults[0];
  const derivedCode = detail.latestStatusDetail?.derivedCode || '';

  const statusMap = {
    'PU': '已取件', 'AR': '到达', 'DP': '派送中', 'DL': '已签收',
    'OD': '已出关', 'IT': '运输中', 'OC': '已揽收', 'CC': '清关中'
  };

  const events = (detail.scanEvents || []).map(ev => ({
    time: ev.date || '',
    location: ev.scanLocation?.city || '',
    status: ev.eventDescription || '',
    description: ev.derivedStatus || ''
  })).sort((a, b) => (a.time < b.time ? -1 : 1));

  return {
    status: derivedCode || detail.latestStatusDetail?.code || 'unknown',
    statusText: statusMap[derivedCode] || detail.latestStatusDetail?.description || '运输中',
    estimatedDelivery: detail.dateAndTimes?.find(d => d.type === 'ESTIMATED_DELIVERY')?.dateTime || '',
    origin: '',
    destination: detail.destinationLocation?.locationContactAndAddress?.address?.city || '',
    events: events
  };
}

// Main Cloud Function
exports.trackPackage = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { trackingNumber, carrier } = req.body || {};

    if (!trackingNumber) {
      res.status(400).json({ error: 'trackingNumber is required' });
      return;
    }

    const carrierName = (carrier || 'DHL').toUpperCase();
    console.log(`Tracking: ${trackingNumber} via ${carrierName}`);

    let result;
    if (carrierName === 'FEDEX') {
      result = await trackFedEx(trackingNumber);
    } else {
      result = await trackDHL(trackingNumber);
    }

    res.json(result);
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(500).json({
      error: err.message,
      status: 'error',
      statusText: '查询失败',
      estimatedDelivery: '',
      origin: '',
      destination: '',
      events: []
    });
  }
});
