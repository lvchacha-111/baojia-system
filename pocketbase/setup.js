// PocketBase 数据表初始化脚本
const BASE = 'http://127.0.0.1:8090';
const EMAIL = '1934633054@qq.com';
const PASS = 'Zhe123123.';

async function auth() {
  const r = await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  });
  const d = await r.json();
  return d.token;
}

async function createCollection(token, config) {
  const r = await fetch(`${BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(config)
  });
  const d = await r.json();
  if (r.ok) {
    console.log(`✅ ${config.name}`);
  } else {
    if (d.data && d.data.name) {
      console.log(`⚠️  ${config.name} 已存在，跳过`);
    } else {
      console.log(`❌ ${config.name}: ${JSON.stringify(d)}`);
    }
  }
  return d;
}

async function updatePaymentMethodField(token) {
  // Fetch existing client_profiles collection
  const listR = await fetch(`${BASE}/api/collections?filter=(name='client_profiles')`, {
    headers: { 'Authorization': token }
  });
  const listD = await listR.json();
  if (!listD.items || listD.items.length === 0) {
    console.log('⚠️ client_profiles 不存在，无需更新');
    return;
  }
  const col = listD.items[0];
  // Find paymentMethod field
  const pmField = col.fields.find(f => f.name === 'paymentMethod');
  if (!pmField) {
    console.log('⚠️ paymentMethod 字段不存在');
    return;
  }
  if (pmField.values && pmField.values.includes('pay_before_ship')) {
    console.log('✅ paymentMethod 已包含 pay_before_ship，无需更新');
    return;
  }
  pmField.values = [...(pmField.values || []), 'pay_before_ship'];
  const patchR = await fetch(`${BASE}/api/collections/${col.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: col.fields })
  });
  if (patchR.ok) {
    console.log('✅ paymentMethod 已更新，新增 pay_before_ship 选项');
  } else {
    const err = await patchR.json();
    console.log('❌ 更新 paymentMethod 失败:', JSON.stringify(err));
  }
}

async function main() {
  console.log('认证中...');
  const token = await auth();
  console.log('已认证\n');

  await createCollection(token, {
    name: 'client_profiles',
    type: 'base',
    fields: [
      { name: 'name', type: 'text', required: true, max: 200 },
      { name: 'country', type: 'text', required: false, max: 100 },
      { name: 'contactEmail', type: 'email', required: false },
      { name: 'company', type: 'text', required: false, max: 200 },
      { name: 'registeredAt', type: 'date', required: false },
      { name: 'assignedTo', type: 'email', required: false },
      { name: 'creditUsed', type: 'number', required: false, min: 0 },
      { name: 'creditLimit', type: 'number', required: false, min: 0 },
      { name: 'paymentMethod', type: 'select', required: false, values: ['full', 'prepaid', 'credit', 'monthly', 'pay_before_ship'] },
      { name: 'billingDay', type: 'number', required: false, min: 1, max: 28 },
      { name: 'depositPercent', type: 'number', required: false, min: 0, max: 100 },
      { name: 'uid', type: 'text', required: false, max: 100 },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'notifications',
    type: 'base',
    fields: [
      { name: 'clientUid', type: 'text', required: true, max: 200 },
      { name: 'type', type: 'select', required: true, values: ['bill', 'order', 'system'] },
      { name: 'title', type: 'text', required: true, max: 300 },
      { name: 'body', type: 'text', required: false, max: 1000 },
      { name: 'read', type: 'bool', required: false },
      { name: 'link', type: 'text', required: false, max: 500 },
      { name: 'statementId', type: 'text', required: false, max: 100 },
      { name: 'createdAt', type: 'date', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'credit_transactions',
    type: 'base',
    fields: [
      { name: 'clientUid', type: 'text', required: true, max: 200 },
      { name: 'type', type: 'select', required: true, values: ['recharge', 'deduction'] },
      { name: 'amount', type: 'number', required: true },
      { name: 'previousUsed', type: 'number', required: false },
      { name: 'newUsed', type: 'number', required: false },
      { name: 'note', type: 'text', required: false, max: 1000 },
      { name: 'createdBy', type: 'email', required: false },
      { name: 'createdAt', type: 'date', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'billing_statements',
    type: 'base',
    fields: [
      { name: 'clientUid', type: 'text', required: true, max: 200 },
      { name: 'clientName', type: 'text', required: true, max: 200 },
      { name: 'billingDay', type: 'number', required: false, min: 1, max: 28 },
      { name: 'periodStart', type: 'text', required: false, max: 50 },
      { name: 'periodEnd', type: 'text', required: false, max: 50 },
      { name: 'orders', type: 'json', required: false },
      { name: 'totalAmount', type: 'number', required: false },
      { name: 'status', type: 'select', required: true, values: ['pending', 'confirming', 'paid', 'settled'] },
      { name: 'paidAt', type: 'date', required: false },
      { name: 'createdAt', type: 'date', required: false },
      { name: 'generatedAt', type: 'date', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'quotes',
    type: 'base',
    fields: [
      { name: 'ownerUid', type: 'text', required: true, max: 200 },
      { name: 'quoteNumber', type: 'text', required: true, max: 100 },
      { name: 'customerName', type: 'text', required: true, max: 200 },
      { name: 'userEmail', type: 'email', required: false },
      { name: 'svgContent', type: 'text', required: false, max: 1000000 },
      { name: 'productId', type: 'text', required: false, max: 100 },
      { name: 'productName', type: 'text', required: false, max: 200 },
      { name: 'usageArea', type: 'text', required: false, max: 500 },
      { name: 'fontPrices', type: 'json', required: false },
      { name: 'surfaceColor', type: 'text', required: false, max: 100 },
      { name: 'surfacePrice', type: 'number', required: false },
      { name: 'paint', type: 'text', required: false, max: 100 },
      { name: 'paintPrice', type: 'number', required: false },
      { name: 'power', type: 'text', required: false, max: 100 },
      { name: 'powerPrice', type: 'number', required: false },
      { name: 'fixing', type: 'text', required: false, max: 100 },
      { name: 'laborFee', type: 'number', required: false },
      { name: 'totalLetterPrice', type: 'number', required: false },
      { name: 'freight', type: 'json', required: false },
      { name: 'status', type: 'text', required: false, max: 50 },
      { name: 'totalPrice', type: 'number', required: false },
      { name: 'publishedByUid', type: 'text', required: false, max: 200 },
      { name: 'publishedBy', type: 'email', required: false },
      { name: 'published', type: 'bool', required: false },
      { name: 'publishedTo', type: 'text', required: false, max: 200 },
      { name: 'publishedToUid', type: 'text', required: false, max: 200 },
      { name: 'publishedToRecordId', type: 'text', required: false, max: 200 },
      { name: 'originalRecordId', type: 'text', required: false, max: 200 },
      { name: 'process', type: 'json', required: false },
      { name: 'processPublished', type: 'bool', required: false },
      { name: 'depositAmount', type: 'number', required: false },
      { name: 'remainderAmount', type: 'number', required: false },
      { name: 'depositPercent', type: 'number', required: false },
      { name: 'depositPaid', type: 'bool', required: false },
      { name: 'depositPaidAt', type: 'date', required: false },
      { name: 'remainderPaid', type: 'bool', required: false },
      { name: 'remainderPaidAt', type: 'date', required: false },
      { name: 'clientConfirmedDeposit', type: 'bool', required: false },
      { name: 'clientConfirmedDepositAt', type: 'date', required: false },
      { name: 'clientConfirmedRemainder', type: 'bool', required: false },
      { name: 'clientConfirmedRemainderAt', type: 'date', required: false },
      { name: 'finalized', type: 'bool', required: false },
      { name: 'finalizedAt', type: 'date', required: false },
      { name: 'statementId', type: 'text', required: false, max: 100 },
      { name: 'billedAt', type: 'date', required: false },
      { name: 'settled', type: 'bool', required: false },
      { name: 'shipments', type: 'json', required: false },
      { name: 'createdAt', type: 'date', required: false },
      { name: 'publishedAt', type: 'date', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'my_customers',
    type: 'base',
    fields: [
      { name: 'ownerUid', type: 'text', required: true, max: 200 },
      { name: 'name', type: 'text', required: true, max: 200 },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollection(token, {
    name: 'conversations',
    type: 'base',
    fields: [
      { name: 'ownerUid', type: 'text', required: true, max: 200 },
      { name: 'salesEmail', type: 'email', required: false },
      { name: 'salesUid', type: 'text', required: false, max: 200 },
      { name: 'customerEmail', type: 'email', required: false },
      { name: 'customerName', type: 'text', required: false, max: 200 },
      { name: 'lastMessage', type: 'text', required: false, max: 2000 },
      { name: 'lastTimestamp', type: 'date', required: false },
      { name: 'unreadForSales', type: 'bool', required: false },
      { name: 'unreadForCustomer', type: 'bool', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  // Patch existing client_profiles to include pay_before_ship option
  await updatePaymentMethodField(token);

  await createCollection(token, {
    name: 'messages',
    type: 'base',
    fields: [
      { name: 'conversationId', type: 'text', required: true, max: 200 },
      { name: 'from', type: 'email', required: false },
      { name: 'text', type: 'text', required: false, max: 5000 },
      { name: 'timestamp', type: 'date', required: false },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  console.log('\n全部数据表创建完成！');
}

main().catch(err => console.error('错误:', err));
