// Tracking proxy: calls 17track API server-side to avoid CORS
// GET /api/track?type=dhl&postid=1234567890
// Carrier codes: dhl → 7043, fedex → 100003
//
// Two-step flow: register → gettrackinfo
// Free quota: 200 tracking numbers one-time (new accounts after 2026-01-07)
// API docs: https://asset.17track.net/api/document/v2.4_en/index.html

routerAdd('GET', '/api/track', (e) => {
    const API_KEY = '406DF3DAF17080509AD3B283D37C0C7A';

    const q = e.request.url.query();
    const type = (q.get('type') || 'dhl').toLowerCase();
    const postid = (q.get('postid') || '').trim();

    if (!postid) {
        return e.json(400, { error: 'Missing postid parameter' });
    }

    const carrierMap = { 'dhl': 7043, 'fedex': 100003 };
    const carrier = carrierMap[type] || 0;

    const headers = {
        '17token': API_KEY,
        'Content-Type': 'application/json'
    };
    const payload = [{ number: postid }];
    if (carrier) payload[0].carrier = carrier;
    const body = JSON.stringify(payload);

    try {
        // Step 1: Register the tracking number
        var regRes = $http.send({
            method: 'POST',
            url: 'https://api.17track.net/track/v2.4/register',
            headers: headers,
            body: body,
            timeout: 15
        });

        // Step 2: Get tracking info (even if register failed, try anyway — number may already be registered)
        var trackRes = $http.send({
            method: 'POST',
            url: 'https://api.17track.net/track/v2.4/gettrackinfo',
            headers: headers,
            body: body,
            timeout: 20
        });

        if (trackRes.statusCode === 200 && trackRes.json) {
            return e.json(200, trackRes.json);
        }
        // Fallback: return register response if gettrackinfo failed
        if (regRes.statusCode === 200 && regRes.json) {
            return e.json(200, regRes.json);
        }
        return e.json(502, { error: 'Upstream API error', regStatus: regRes.statusCode, trackStatus: trackRes.statusCode });
    } catch (err) {
        return e.json(500, { error: String(err) });
    }
});
