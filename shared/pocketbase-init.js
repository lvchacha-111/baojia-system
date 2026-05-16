// PocketBase 共享初始化模块 - 替代 Firebase
// 用法：HTML 中先加载 <script src="../shared/pocketbase.umd.js"></script>
//       再 import { ... } from '../shared/pocketbase-init.js'
//
// 多账号自动隔离：每个标签页使用独立的 localStorage key
// 如需跨标签页共享同一账号，URL 加 ?as=标识
// 例如：/admin/myorders.html?as=sales02

// -------- 确定隔离的 localStorage key --------
var _pbStorageKey;
(function() {
  var params = new URLSearchParams(window.location.search);
  var storageKey = params.get('as');

  if (!storageKey) {
    var prevKey = sessionStorage.getItem('_pb_tab_key');
    var newKey = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('_pb_tab_key', newKey);

    if (prevKey) {
      var oldData = localStorage.getItem('pocketbase_auth_' + prevKey);
      if (oldData) {
        localStorage.setItem('pocketbase_auth_' + newKey, oldData);
      }
    }

    storageKey = newKey;
  }

  _pbStorageKey = 'pocketbase_auth_' + storageKey;
})();

// -------- 创建隔离的 auth store（不 monkey-patch localStorage）--------
var _token = '';
var _model = null;
var _listeners = [];

try {
  var raw = localStorage.getItem(_pbStorageKey);
  if (raw) {
    var data = JSON.parse(raw);
    _token = data.token || '';
    _model = data.record || data.model || null;
  }
} catch (e) {}

var _isolatedAuthStore = {
  get token() { return _token; },
  get record() { return _model; },
  get model() { return _model; },
  get isValid() { return !!_token; },
  save: function(token, record) {
    _token = token;
    _model = record;
    localStorage.setItem(_pbStorageKey, JSON.stringify({ token: token, record: record }));
    _listeners.forEach(function(fn) { fn && fn(token, record); });
  },
  clear: function() {
    _token = '';
    _model = null;
    localStorage.removeItem(_pbStorageKey);
    _listeners.forEach(function(fn) { fn && fn('', null); });
  },
  onChange: function(callback) {
    _listeners.push(callback);
    return function() { _listeners = _listeners.filter(function(f) { return f !== callback; }); };
  }
};

const pb = new PocketBase('http://127.0.0.1:8090', _isolatedAuthStore);

// ===== Auth 适配 =====
export const auth = {
  _pb: pb,
  get currentUser() { return pb.authStore.isValid ? pb.authStore.model : null; }
};

export function getCurrentUser() {
  return new Promise((resolve) => {
    resolve(pb.authStore.isValid ? pb.authStore.model : null);
  });
}

export function logout() {
  pb.authStore.clear();
  return Promise.resolve();
}

export function signInWithEmailAndPassword(authRef, email, password) {
  return pb.collection('users').authWithPassword(email, password);
}

export async function createUserWithEmailAndPassword(authRef, email, password) {
  const record = await pb.collection('users').create({ email, password, passwordConfirm: password });
  // 自动登录，否则后续 client_profiles 创建会因未认证而失败
  await pb.collection('users').authWithPassword(email, password);
  return record;
}

export function requestVerification(email) {
  return pb.collection('users').requestVerification(email);
}

export function confirmVerification(token) {
  return pb.collection('users').confirmVerification(token);
}

export function onAuthStateChanged(authRef, callback, errorCallback) {
  callback(pb.authStore.isValid ? pb.authStore.model : null);
  const unsub = pb.authStore.onChange((token, model) => {
    callback(model || null);
  });
  return unsub;
}

export function signOut(authRef) {
  pb.authStore.clear();
  return Promise.resolve();
}

// ===== Firestore 适配：集合引用 =====
function _resolve(colOrDb, path, ...subPaths) {
  const parts = [];
  if (typeof path === 'string') parts.push(path);
  if (subPaths.length) parts.push(...subPaths);

  if (parts.length >= 2 && parts[0] === 'users' && parts[1].length > 0 && parts[2] === 'quotes') {
    return { collectionName: 'quotes', filter: `ownerUid = "${parts[1]}"` };
  }
  if (parts.length >= 2 && parts[0] === 'users' && parts[1].length > 0 && parts[2] === 'customers') {
    return { collectionName: 'my_customers', filter: `ownerUid = "${parts[1]}"` };
  }
  if (parts.length >= 2 && parts[0] === 'users' && parts[1].length > 0 && parts[2] === 'conversations' && parts[3] === 'main' && parts[4] === 'messages') {
    return { collectionName: 'messages', filter: null };
  }
  if (parts.length >= 2 && parts[0] === 'users' && parts[1].length > 0 && parts[2] === 'conversations' && parts[3] === 'main') {
    return { collectionName: 'conversations', filter: `ownerUid = "${parts[1]}"` };
  }

  const colMap = {
    'clientProfiles': 'client_profiles',
    'notifications': 'notifications',
    'creditTransactions': 'credit_transactions',
    'billingStatements': 'billing_statements',
    'quotes': 'quotes',
    'users': 'users',
    'conversations': 'conversations',
    'messages': 'messages',
    'myCustomers': 'my_customers',
    'salespersonProfiles': 'salesperson_profiles',
  };

  // collection(db, 'clientProfiles')
  if (parts.length === 1) {
    return { collectionName: colMap[parts[0]] || parts[0], filter: null };
  }

  // doc(db, 'clientProfiles', uid)
  if (parts.length === 2 && colMap[parts[0]]) {
    return { collectionName: colMap[parts[0]], filter: null };
  }

  return { collectionName: parts[parts.length - 1], filter: null };
}

export const db = { _pb: pb };

export function collection(dbRef, path, ...subPaths) {
  const resolved = _resolve(dbRef, path, ...subPaths);
  return {
    _collectionName: resolved.collectionName,
    _baseFilter: resolved.filter,
    _filters: [],
    _sort: null,
    _limit: 0,
  };
}

export function doc(dbRef, path, id, ...subPaths) {
  if (!id) {
    const resolved = _resolve(dbRef, path, ...subPaths);
    return { _collectionName: resolved.collectionName, _id: null, _subPaths: subPaths };
  }
  // Pass id to _resolve so it can match patterns like 'users' -> uid -> 'quotes' -> quoteId
  const resolved = _resolve(dbRef, path, id, ...subPaths);
  // If subPaths exist, the last subPath element is the actual doc ID (e.g., quoteId, 'main')
  // Otherwise id itself is the doc ID (e.g., user.id for clientProfiles)
  const actualId = subPaths.length ? subPaths[subPaths.length - 1] : id;
  return { _collectionName: resolved.collectionName, _id: actualId, _isDoc: true };
}

export function query(colRef, ...constraints) {
  const q = { ...colRef, _filters: [...colRef._filters], _sort: colRef._sort, _limit: colRef._limit };
  for (const c of constraints) {
    if (c._isWhere) q._filters.push(c);
    else if (c._isOrderBy) q._sort = (c._dir === 'desc' ? '-' : '') + c._field;
    else if (c._isLimit) q._limit = c._limit;
  }
  return q;
}

export function where(field, op, value) {
  return { _isWhere: true, field, op, value };
}

export function orderBy(field, dir) {
  return { _isOrderBy: true, _field: field, _dir: dir || 'asc' };
}

export function limit(n) {
  return { _isLimit: true, _limit: n };
}

function _buildFilter(queryRef) {
  const parts = [];
  if (queryRef._baseFilter) parts.push(queryRef._baseFilter);
  for (const f of queryRef._filters) {
    let valStr;
    if (typeof f.value === 'string') valStr = `"${f.value}"`;
    else if (typeof f.value === 'boolean') valStr = f.value ? 'true' : 'false';
    else valStr = String(f.value);

    const opMap = { '==': '=', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
    parts.push(`${f.field} ${opMap[f.op] || f.op} ${valStr}`);
  }
  return parts.join(' && ') || null;
}

export function serverTimestamp() {
  return new Date().toISOString();
}

// ===== 数据操作 =====
export async function getDocs(queryRef) {
  const filter = _buildFilter(queryRef);
  const options = { $autoCancel: false };
  if (filter) options.filter = filter;
  if (queryRef._sort) options.sort = queryRef._sort;

  let records = [];
  let page = 1, totalPages = 1;
  while (page <= totalPages) {
    const result = await pb.collection(queryRef._collectionName).getList(page, 500, options);
    records.push(...result.items);
    totalPages = result.totalPages;
    page++;
  }

  return {
    forEach(callback) {
      records.forEach(r => callback({ id: r.id, data: () => ({ ...r }) }));
    },
    get docs() {
      return records.map(r => ({ id: r.id, data: () => ({ ...r }) }));
    },
    get empty() { return records.length === 0; },
    get size() { return records.length; },
    _records: records,
  };
}

export async function getDoc(docRef) {
  try {
    const r = await pb.collection(docRef._collectionName).getOne(docRef._id, { $autoCancel: false });
    return { id: r.id, exists: () => true, data: () => ({ ...r }) };
  } catch (e) {
    return { exists: () => false, data: () => null };
  }
}

export async function addDoc(colRef, data) {
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === '__SERVER_TIMESTAMP__') cleaned[k] = new Date().toISOString();
    else if (v && typeof v === 'object' && v._isTimestamp) cleaned[k] = new Date().toISOString();
    else cleaned[k] = v;
  }
  const record = await pb.collection(colRef._collectionName).create(cleaned, { $autoCancel: false });
  return { id: record.id };
}

export async function setDoc(docRef, data, options) {
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === '__SERVER_TIMESTAMP__') cleaned[k] = new Date().toISOString();
    else cleaned[k] = v;
  }
  if (docRef._id) {
    try {
      await pb.collection(docRef._collectionName).update(docRef._id, cleaned, { $autoCancel: false });
    } catch (e) {
      if (options && options.merge) {
        await pb.collection(docRef._collectionName).create({ id: docRef._id, ...cleaned }, { $autoCancel: false });
      } else {
        throw e;
      }
    }
  } else {
    await pb.collection(docRef._collectionName).create(cleaned, { $autoCancel: false });
  }
}

export async function updateDoc(docRef, data) {
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === '__SERVER_TIMESTAMP__') cleaned[k] = new Date().toISOString();
    else cleaned[k] = v;
  }
  await pb.collection(docRef._collectionName).update(docRef._id, cleaned, { $autoCancel: false });
}

export async function deleteDoc(docRef) {
  await pb.collection(docRef._collectionName).delete(docRef._id, { $autoCancel: false });
}

// ===== Real-time subscriptions =====
const _colNameMap = {
  'clientProfiles': 'client_profiles',
  'notifications': 'notifications',
  'creditTransactions': 'credit_transactions',
  'billingStatements': 'billing_statements',
  'quotes': 'quotes',
  'myCustomers': 'my_customers',
  'conversations': 'conversations',
  'messages': 'messages',
  'salesperson_profiles': 'salesperson_profiles',
  'users': 'users',
    'conversations': 'conversations',
    'messages': 'messages',
    'myCustomers': 'my_customers',
    'salespersonProfiles': 'salesperson_profiles',
};

/**
 * Subscribe to real-time changes on a collection.
 * @param {string} collectionName - logical name (e.g. 'clientProfiles', 'quotes', 'messages')
 * @param {function} callback - ({ action, record }) => void
 * @param {string} [filter] - optional PocketBase filter string
 * @returns {function} unsubscribe function
 */
export function subscribe(collectionName, callback, filter) {
  if (!pb || !pb.realtime) {
    console.warn('PocketBase realtime not available, falling back to polling');
    return () => {};
  }
  try {
    const realName = _colNameMap[collectionName] || collectionName;
    const topic = filter ? `${realName}/?filter=${encodeURIComponent(filter)}` : realName;
    const unsubPromise = pb.realtime.subscribe(topic, (data) => {
      callback({ action: data.action, record: data.record });
    });
    return () => { unsubPromise.then(fn => { if (fn) fn(); }).catch(() => {}); };
  } catch (e) {
    console.warn('subscribe failed for', collectionName, ':', e.message);
    return () => {};
  }
}

/**
 * Subscribe to changes on a specific record.
 */
export function subscribeRecord(collectionName, recordId, callback) {
  if (!pb) {
    console.warn('PocketBase not available');
    return () => {};
  }
  try {
    const realName = _colNameMap[collectionName] || collectionName;
    const unsubPromise = pb.collection(realName).subscribe(recordId, (data) => {
      callback({ action: data.action, record: data.record });
    });
    return () => { unsubPromise.then(fn => { if (fn) fn(); }).catch(() => {}); };
  } catch (e) {
    console.warn('subscribeRecord failed for', collectionName, recordId, ':', e.message);
    return () => {};
  }
}

export { pb };

// 保存报价（兼容旧函数名）
window.saveQuoteToFirestore = async function(quoteData, freightData, quoteNumber) {
  const user = await getCurrentUser();
  if (!user) throw new Error('未登录，请重新登录后再试');

  const freightTotal = freightData && freightData.totalPrice ? freightData.totalPrice : 0;
  const rec = {
    ownerUid: user.id,
    quoteNumber,
    customerName: quoteData.customerName || '',
    userEmail: user.email,
    svgContent: window._svgContent || '',
    productId: quoteData.productId,
    productName: quoteData.productName,
    usageArea: quoteData.usageArea,
    fontPrices: quoteData.fontPrices || [],
    surfaceColor: quoteData.surfaceColor,
    surfacePrice: quoteData.surfacePrice,
    paint: quoteData.paint,
    paintPrice: quoteData.paintPrice,
    power: quoteData.power,
    powerPrice: quoteData.powerPrice,
    fixing: quoteData.fixing,
    laborFee: quoteData.laborFee || 0,
    totalLetterPrice: quoteData.totalLetterPrice || 0,
    freight: freightTotal > 0 ? {
      destination: freightData.destination || '',
      volumetricWeight: freightData.volumetricWeight || 0,
      chargeableWeight: freightData.chargeableWeight || 0,
      price: freightTotal
    } : null,
    status: 'pending',
    totalPrice: quoteData.totalPrice + freightTotal,
    createdAt: new Date().toISOString(),
  };

  await pb.collection('quotes').create(rec);
  console.log('报价已保存:', quoteNumber);

  const customerName = quoteData.customerName;
  if (customerName) {
    try {
      const records = await pb.collection('client_profiles').getFullList({ filter: `name = "${customerName}"` });
      records.forEach(async (d) => {
        if (!d.assignedTo) {
          await pb.collection('client_profiles').update(d.id, { assignedTo: user.email });
        }
      });
    } catch (e) { /* ignore */ }
  }
};

// ===== 订单修改日志 =====
function _fmtVal(v) {
  if (v === null || v === undefined) return '空';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * 记录订单修改日志
 */
export async function auditLog(quoteId, action, field, oldValue, newValue) {
  try {
    const user = pb.authStore.model;
    const changedBy = user ? user.email : 'unknown';
    await pb.collection('order_audit_logs').create({
      quoteId: quoteId,
      action: action,
      field: field || '',
      oldValue: _fmtVal(oldValue),
      newValue: _fmtVal(newValue),
      changedBy: changedBy
    }, { $autoCancel: false });
  } catch (e) {
    console.warn('auditLog failed:', e.message);
  }
}

/**
 * 获取订单的修改日志
 */
export async function getAuditLogs(quoteId) {
  try {
    const records = await pb.collection('order_audit_logs').getFullList({
      filter: `quoteId = "${quoteId}"`,
      sort: '-created',
      $autoCancel: false
    });
    return records;
  } catch (e) {
    console.warn('getAuditLogs failed:', e.message);
    return [];
  }
}
