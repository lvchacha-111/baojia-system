// 作者：王睿哲 18912609149
// Shared Bell Notification Component
// Usage: import { initBell, BELL_HTML } from '../shared/bell-notification.js';
// 1. Include BELL_HTML in your page where you want the bell to appear
// 2. Call initBell(config) after DOM is ready

import { subscribe } from './pocketbase-init.js';

// ===== CSS (injected once, idempotent) =====
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.header-bell{position:relative;cursor:pointer;padding:6px;border-radius:8px;border:none;background:none;}
.header-bell:hover{background:#f5f5f5;}
.header-bell svg{width:20px;height:20px;color:#666;display:block;}
.header-bell-badge{position:absolute;top:1px;right:1px;min-width:16px;height:16px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 4px;}
.header-bell-badge.show{display:flex;}
.notif-dropdown{display:none;position:absolute;top:calc(100% + 8px);right:0;width:380px;max-height:480px;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,0.12);border:1px solid #eee;z-index:200;flex-direction:column;overflow:hidden;}
.notif-dropdown.show{display:flex;}
.notif-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#1a1a1a;}
.notif-mark-all{font-size:12px;color:#6366f1;cursor:pointer;border:none;background:none;font-weight:500;}
.notif-mark-all:hover{color:#4f46e5;}
.notif-list{overflow-y:auto;max-height:400px;}
.notif-item{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;cursor:pointer;border-bottom:1px solid #f9f9f9;transition:background 0.1s;position:relative;}
.notif-item:hover{background:#f8f9fa;}
.notif-item.unread{background:#fafaff;}
.notif-item.unread:hover{background:#f0f0ff;}
.notif-dot{width:8px;height:8px;border-radius:50%;background:#6366f1;flex-shrink:0;margin-top:6px;}
.notif-dot.read{visibility:hidden;}
.notif-content{flex:1;min-width:0;}
.notif-title{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;}
.notif-body{font-size:12px;color:#888;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.notif-time{font-size:11px;color:#bbb;flex-shrink:0;margin-top:2px;}
.notif-empty{text-align:center;padding:40px 20px;color:#ccc;font-size:13px;}
.notif-empty svg{width:36px;height:36px;margin-bottom:8px;color:#ddd;}
@media(max-width:600px){.notif-dropdown{width:calc(100vw - 32px);right:-60px;}}
`;
  document.head.appendChild(style);
}

// ===== HTML template =====
const BELL_HTML = `
<div style="position:relative">
  <button class="header-bell" id="headerBell" onclick="BellNotif.toggle()" title="通知">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span class="header-bell-badge" id="bellBadge">0</span>
  </button>
  <div class="notif-dropdown" id="notifDropdown">
    <div class="notif-header">
      <span>消息通知</span>
      <button class="notif-mark-all" id="btnMarkAllRead" onclick="event.stopPropagation();BellNotif.markAllRead()">全部已读</button>
    </div>
    <div class="notif-list" id="notifList"></div>
  </div>
</div>`;

// ===== Type icons =====
const TYPE_ICONS = {
  chat: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bill: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/></svg>',
  order: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6366f1" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  system: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

function escHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== Internal state =====
let notifList = [];
let _config = null;
let _pollTimer = null;

function updateBadge() {
  const count = notifList.filter(function(n) { return !n.read; }).length;
  const badge = document.getElementById('bellBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

function renderList() {
  const container = document.getElementById('notifList');
  if (!container) return;
  if (!notifList.length) {
    container.innerHTML = '<div class="notif-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>暂无新消息</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < notifList.length; i++) {
    var n = notifList[i];
    var time = n.createdAt ? new Date(n.createdAt).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
    var icon = TYPE_ICONS[n.type] || TYPE_ICONS.system;
    html += '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-idx="' + i + '" onclick="BellNotif.clickItem(' + i + ')">';
    html += '<div class="notif-dot' + (n.read ? ' read' : '') + '"></div>';
    html += '<div style="flex-shrink:0;margin-top:2px">' + icon + '</div>';
    html += '<div class="notif-content"><div class="notif-title">' + escHTML(n.title || '') + '</div>';
    html += '<div class="notif-body">' + escHTML(n.body || '') + '</div></div>';
    html += '<div class="notif-time">' + time + '</div>';
    html += '</div>';
  }
  container.innerHTML = html;
}

// ===== window.BellNotif API (for inline onclick handlers) =====
window.BellNotif = {
  toggle: function() {
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.toggle('show');
  },

  clickItem: function(idx) {
    var n = notifList[idx];
    if (!n) return;
    document.getElementById('notifDropdown').classList.remove('show');
    if (!n.read) {
      n.read = true;
      updateBadge();
      renderList();
    }
    if (_config && _config.onNotificationClick) {
      _config.onNotificationClick(n);
    }
  },

  markAllRead: function() {
    for (var i = 0; i < notifList.length; i++) {
      notifList[i].read = true;
    }
    updateBadge();
    renderList();
    if (_config && _config.onMarkAllRead) {
      _config.onMarkAllRead();
    }
  },

  // Remove notifications matching a predicate: function(item) => boolean
  dismiss: function(predicate) {
    notifList = notifList.filter(function(n) { return !predicate(n); });
    updateBadge();
    renderList();
  }
};

// ===== Close dropdown on outside click =====
document.addEventListener('click', function(e) {
  var dd = document.getElementById('notifDropdown');
  var bell = document.getElementById('headerBell');
  if (dd && dd.classList.contains('show') && !dd.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
    dd.classList.remove('show');
  }
});

// ===== initBell(config) =====
// config: {
//   loadNotifications: async () => notifArray,   // required
//   onNotificationClick: (notifItem) => {},       // optional
//   onMarkAllRead: () => {},                      // optional
//   pollInterval: 5000,                           // optional, default 5000ms
//   subscribeCollection: 'conversations',         // optional
//   subscribeFilter: 'field = "value"',           // optional
// }
// notifArray item: { id, type, title, body, read, createdAt, _data }
export function initBell(config) {
  _config = config || {};
  notifList = [];
  injectCSS();

  async function poll() {
    try {
      if (_config.loadNotifications) {
        var items = await _config.loadNotifications();
        if (Array.isArray(items)) {
          // Preserve read state for existing items
          var oldMap = {};
          for (var i = 0; i < notifList.length; i++) {
            oldMap[notifList[i].id] = notifList[i].read;
          }
          notifList = items;
          for (var j = 0; j < notifList.length; j++) {
            if (oldMap[notifList[j].id] === true) {
              notifList[j].read = true;
            }
          }
        }
      }
    } catch (e) {
      console.warn('BellNotif poll error:', e);
    }
    updateBadge();
    renderList();
  }

  // Initial poll
  poll();

  // Polling interval
  var interval = config.pollInterval || 5000;
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(poll, interval);

  // Real-time subscription
  if (config.subscribeCollection) {
    subscribe(config.subscribeCollection, function() {
      poll();
    }, config.subscribeFilter || '');
  }

  return {
    refresh: poll,
    destroy: function() {
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
      notifList = [];
      updateBadge();
      renderList();
    }
  };
}
