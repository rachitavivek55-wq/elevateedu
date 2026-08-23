// PWA head tags — added on every page so ElevateEdu can be installed to a
// phone's home screen and use the standalone (no browser chrome) styling.
(function () {
  var head = document.head;
  if (!head) return;
  function add(tag, attrs, probe) {
    if (head.querySelector(probe)) return;
    var el = document.createElement(tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    head.appendChild(el);
  }
  add('link', { rel: 'manifest', href: './manifest.json' }, 'link[rel=\'manifest\']');
  add('link', { rel: 'apple-touch-icon', href: './apple-touch-icon.png' }, 'link[rel=\'apple-touch-icon\']');
  add('link', { rel: 'icon', type: 'image/png', href: './icon-192.png' }, 'link[rel=\'icon\']');
  add('meta', { name: 'theme-color', content: '#4b3832' }, 'meta[name=\'theme-color\']');
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' }, 'meta[name=\'mobile-web-app-capable\']');
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }, 'meta[name=\'apple-mobile-web-app-capable\']');
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, 'meta[name=\'apple-mobile-web-app-status-bar-style\']');
  add('meta', { name: 'apple-mobile-web-app-title', content: 'ElevateEdu' }, 'meta[name=\'apple-mobile-web-app-title\']');
})();

// ElevateEdu — shared app logic

// 1) Live date in the title bar (always current)
function renderDate() {
  const now = new Date();
  const dayEl = document.getElementById('dateDay');
  const monthEl = document.getElementById('dateMonth');
  if (dayEl) dayEl.textContent = now.getDate();
  if (monthEl)
    monthEl.textContent = now.toLocaleDateString('en-US', { month: 'short' });
}
renderDate();
setInterval(renderDate, 60 * 1000);

// 2) Render Lucide icons
if (window.lucide) {
  window.lucide.createIcons();
}

// 2b) Shared Supabase client (one network round-trip per page)
window.eeSupabase = function () {
  if (window.__eeSB) return window.__eeSB;
  if (typeof supabase === 'undefined' || !supabase.createClient) return null;
  window.__eeSB = supabase.createClient('https://vkpmasigkotdmfkmjqoy.supabase.co', 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi');
  return window.__eeSB;
};
window.eeGetPremium = function () {
  // App is free — every signed-in or signed-out user has full access.
  return Promise.resolve({ user: null, isPremium: true });
};


// 3) Routing map — which pages exist for each system.
// As we build more systems, just add them here.
const pages = {
  home: 'index.html',
  planner: 'planner.html',
  wallet: 'wallet.html',
  fitness: 'wellness.html',
  wellness: 'wellness.html',
  mindset: 'mindset.html',
  guides: 'guides.html',
};

// 3b) Tool cards inside a system page: navigate via data-href
document.querySelectorAll('.app-card[data-href]').forEach((card) => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    window.location.href = card.getAttribute('data-href');
  });
});

// 4) Bottom navigation: navigate if a page exists, otherwise just highlight
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    if (pages[tab]) {
      window.location.href = pages[tab];
      return;
    }
    navItems.forEach((n) => n.classList.remove('active'));
    item.classList.add('active');
  });
});

// 5) Home dashboard tiles: open their system page on click
document.querySelectorAll('.tile').forEach((tile) => {
  const name = tile.querySelector('.tile-name');
  if (!name) return;
  const key = name.textContent.trim().toLowerCase();
  if (pages[key]) {
    tile.addEventListener('click', () => {
      window.location.href = pages[key];
    });
  }
});

// 6) Home tiles: show live data from each system instead of placeholders
function updateHomeMetrics() {
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }
  var metrics = {};

  var cal = read('elevate_calendar_entries', []);
  if (Array.isArray(cal)) {
    var _t = new Date(); var todayStr = _t.getFullYear() + '-' + String(_t.getMonth()+1).padStart(2,'0') + '-' + String(_t.getDate()).padStart(2,'0');
    var work = cal.filter(function(e) {
      if (!e) return false;
      var isAssign = (e.type === 'assignment' || e.type === 'exam' || e.type === 'task');
      if (!isAssign) return false;
      if (!e.title || !String(e.title).trim()) return false; // ignore blank/placeholder entries
      if (e.done === true || e.completed === true) return false; // ignore completed
      if (e.date) { var ds = String(e.date).slice(0,10); if (ds && ds < todayStr) return false; } // ignore past (string compare, tz-safe)
      return true;
    });
    if (Array.isArray(work))
      metrics.planner = plural(work.length, 'assignment', 'assignments');
  }

  var bal = read('elevate_balance_state', null);
  if (bal && typeof bal.amount === 'number' && bal.amount !== 0) {
    var amt = Math.round(bal.amount * 100) / 100;
    metrics.wallet = '$' + amt.toLocaleString();
  }

  var wk = read('elevate_workouts', []);
  if (Array.isArray(wk) && wk.length)
    metrics.wellness = plural(wk.length, 'workout', 'workouts');

  var vb = read('elevate_visionboard', null);
  if (vb && Array.isArray(vb.boards) && vb.boards.length) {
    metrics.mindset = plural(vb.boards.length, 'board', 'boards');
  }

  document.querySelectorAll('.tile').forEach(function (tile) {
    var nameEl = tile.querySelector('.tile-name');
    var metricEl = tile.querySelector('.tile-metric');
    if (!nameEl || !metricEl) return;
    var key = nameEl.textContent.trim().toLowerCase();
    if (metrics[key]) metricEl.textContent = metrics[key];
  });
}
updateHomeMetrics();

// 7) Reset all data (two-tap confirm, bottom of home)
(function () {
  var btn = document.getElementById('elevateResetBtn');
  var note = document.getElementById('elevateResetNote');
  if (!btn) return;
  var armed = false,
    t = null;
  var origText = btn.textContent,
    origNote = note ? note.textContent : '';
  function disarm() {
    armed = false;
    btn.classList.remove('confirm');
    btn.textContent = origText;
    if (note) note.textContent = origNote;
    if (t) {
      clearTimeout(t);
      t = null;
    }
  }
  btn.addEventListener('click', function () {
    if (!armed) {
      armed = true;
      btn.classList.add('confirm');
      btn.textContent = 'Tap again to confirm';
      if (note)
        note.textContent =
          'This cannot be undone. Tap again to erase, or wait to cancel.';
      t = setTimeout(disarm, 4000);
      return;
    }
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('elevate') === 0) keys.push(k);
    }
    keys.forEach(function (k) {
      localStorage.removeItem(k);
    });
    location.reload();
  });
})();

// ===== 8) Supabase Auth + Data Sync =====
var elevateAuth = (function () {
  var SUPABASE_URL = 'https://vkpmasigkotdmfkmjqoy.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi';
  var STRIPE_PUBLISHABLE =
    'pk_test_51U1qZzFSE5wY8QPBK66XKK921VnzCLbWrLdCQqs95AJmU61irLsiGNtmrImwktvSzhSdmw1CoDOobLg5sDCLnizS00Ekm1wRoa';
  var STRIPE_PRICE_ID = 'price_1U1qhsFSE5wY8QPBW0pIYMHJ';
  var STRIPE_ACCOUNT_ID = 'acct_1U1qZzFSE5wY8QPB';
  var authScreen = document.getElementById('elevateAuthScreen');
  var authForm = document.getElementById('elevateAuthForm');
  var authMsg = document.getElementById('elevateAuthMsg');
  var authEmail = document.getElementById('elevateAuthEmail');
  var currentSession = null;
  var supabaseClient = null;

  function initSupabase() {
    if (typeof supabase === 'undefined')
      return; /* Library arrives later on some pages; Section 22 re-initializes. */
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }

  function showAuthScreen() {
    if (authScreen) authScreen.style.display = 'flex';
    if (authForm) authForm.reset();
    if (authMsg) authMsg.textContent = '';
  }

  function hideAuthScreen() {
    if (authScreen) authScreen.style.display = 'none';
  }

  function setMsg(text, color) {
    if (!authMsg) return;
    authMsg.textContent = text;
    authMsg.style.color = color || 'var(--coffee)';
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    var email = authEmail.value.trim();
    if (!email) return setMsg('Please enter an email', 'var(--coffee)');
    setMsg('Sending...');
    var { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return setMsg('Error: ' + error.message, 'var(--coffee)');
    setMsg('Check your email for the sign-in link!', 'var(--coffee)');
try { showInstallFirstGuide(email); } catch (e) {}
    authEmail.value = '';
  }

  async function checkSession() {
    var {
      data: { session },
    } = await (supabaseClient ? supabaseClient.auth.getSession() : Promise.resolve({ data: { session: null } }));
    if (session) {
      currentSession = session;
      return true;
    }
    return false;
  }

  async function syncFromSupabase(opts) {
    if (!currentSession) return false;
    var keepLocal = !!(opts && opts.keepLocal);
    var { data, error } = await supabaseClient
      .from("user_data")
      .select("*")
      .eq("user_id", currentSession.user.id);
    if (error) {
      console.error("Sync download error:", error);
      return false;
    }
    var changed = false;
    window.__eeApplyingRemote = true;
    try {
      if (data)
        data.forEach(function (row) {
          var incoming = JSON.stringify(row.data_value);
          var existing = localStorage.getItem(row.data_key);
          if (keepLocal && existing !== null) return;
          if (existing === incoming) return;
          try {
            localStorage.setItem(row.data_key, incoming);
            changed = true;
          } catch (err) {}
        });
    } finally {
      window.__eeApplyingRemote = false;
    }
    return changed;
  }

  /* Makes every device signed in to the same email show the same data.
     First run on a device only fills gaps, so existing work is never lost,
     then everything on this device is pushed up so the account is complete. */
  async function cloudMerge() {
    if (!currentSession) return false;
    var firstRun = true;
    try { firstRun = localStorage.getItem("ee_cloud_merged_v1") !== "1"; } catch (err) {}
    var changed = await syncFromSupabase({ keepLocal: firstRun });
    if (firstRun) {
      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("elevate") === 0) keys.push(k);
        }
      } catch (err) {}
      for (var j = 0; j < keys.length; j++) {
        try {
          await syncToSupabase(keys[j], JSON.parse(localStorage.getItem(keys[j])));
        } catch (err) {}
      }
      try { localStorage.setItem("ee_cloud_merged_v1", "1"); } catch (err) {}
    }
    return changed;
  }

  async function syncToSupabase(key, value) {
    if (!currentSession) return;
    var jsonVal = typeof value === 'string' ? JSON.parse(value) : value;
    var { error } = await supabaseClient.from('user_data').upsert({
      user_id: currentSession.user.id,
      data_key: key,
      data_value: jsonVal,
    }, { onConflict: "user_id,data_key" });
    if (error) console.error('Sync upload error:', error);
  }

  async function logout() {
    await supabaseClient.auth.signOut();
    currentSession = null;
    Object.keys(localStorage).forEach(function (k) {
      localStorage.removeItem(k);
    });
    showAuthScreen();
  }

  function init() {
    initSupabase();
    if (authForm) authForm.addEventListener('submit', handleMagicLink);
  }

  return {
    init,
    checkSession,
    syncFromSupabase,
    cloudMerge,
    syncToSupabase,
    logout,
    showAuthScreen,
    hideAuthScreen,
  };
})();

// ===== 9) Init auth on page load =====
(function () {
  elevateAuth.init();
  elevateAuth.checkSession().then(function (hasSession) {
    if (hasSession) {
      elevateAuth.cloudMerge().then(function (changed) {
        elevateAuth.hideAuthScreen();
        renderDate();
        if (window.eeRefreshIfHydrated) window.eeRefreshIfHydrated(changed);
      });
    } else {
      elevateAuth.showAuthScreen();
    }
  });
})();

// ===== 10) Wrap localStorage.setItem to sync =====
(function () {
  var originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    try {
      originalSetItem.call(this, key, value);
    } catch (err) {
      /* Storage full: warn the user instead of losing data silently. */
      try { window.eeStorageFull && window.eeStorageFull(key); } catch (e2) {}
      if (!window.__eeQuotaWarned) {
        window.__eeQuotaWarned = true;
        alert("This device is out of storage space, so your latest change could not be saved locally. Older items are still safe. Try removing a few large images to free up room.");
      }
      throw err;
    }
    if (key.indexOf('elevate') === 0 && elevateAuth) {
      if (!window.__eeApplyingRemote) elevateAuth.syncToSupabase(key, value);
    }
  };
})();

// Sections 11-13 (Stripe checkout, premium gating, premium page guard) were removed:
// ElevateEdu is completely free, so every tool is open to everyone.

// ===== 14  Account deletion routine (exposed for Settings panel) =====
window.eeDeleteAccount = async function(){
  try {
    if(typeof supabase !== "undefined" && supabase.createClient){
      var c = supabase.createClient("https://vkpmasigkotdmfkmjqoy.supabase.co", "sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi");
      var s = await c.auth.getSession();
      var user = s && s.data && s.data.session ? s.data.session.user : null;
      if(user){
        try { await c.from("user_data").delete().eq("user_id", user.id); } catch(e){}
        try { await c.from("profiles").delete().eq("id", user.id); } catch(e){}
        try { await c.auth.signOut(); } catch(e){}
      }
    }
  } catch(e){}
  try { Object.keys(localStorage).forEach(function(k){ localStorage.removeItem(k); }); } catch(e){}
  alert("Your account and data have been deleted.");
  window.location.href = "index.html";
};/* ============================================================
   SECTION 15 — PWA / Add-to-Home-Screen (installable app)
   Injects manifest, icons, meta tags & registers service worker
   so ElevateEdu installs to the home screen and opens fullscreen.
   ============================================================ */
(function(){
  var COFFEE = '#6F4E37';
  var CREAM  = '#F5E6CA';
  // Graduation-cap (mortarboard) icon in ElevateEdu colors, as SVG.
  function iconSVG(size){
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 512 512">' +
      '<rect width="512" height="512" rx="114" fill="'+CREAM+'"/>' +
      '<g fill="none" stroke="'+COFFEE+'" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M256 150 L410 212 L256 274 L102 212 Z" fill="'+COFFEE+'"/>' +
      '<path d="M154 236 L154 320 C154 356 205 380 256 380 C307 380 358 356 358 320 L358 236"/>' +
      '<path d="M410 212 L410 300"/>' +
      '<circle cx="410" cy="312" r="14" fill="'+COFFEE+'"/>' +
      '</g></svg>';
  }
  function svgDataUri(size){
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(iconSVG(size));
  }
  function addLink(rel, href, extra){
    var l = document.createElement('link'); l.rel = rel; l.href = href;
    if(extra){ for(var k in extra){ l.setAttribute(k, extra[k]); } }
    document.head.appendChild(l);
  }
  function addMeta(name, content){
    var m = document.createElement('meta'); m.name = name; m.content = content;
    document.head.appendChild(m);
  }
  // 1) Web App Manifest (built inline so no extra file needed)
  var manifest = {
    name: 'ElevateEdu',
    short_name: 'ElevateEdu',
    description: 'Your all-in-one student planner, wellness & mindset app.',
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: CREAM,
    theme_color: COFFEE,
    icons: [
      { src: svgDataUri(192), sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: svgDataUri(512), sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: svgDataUri(512), sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
    ]
  };
  try {
    var blob = new Blob([JSON.stringify(manifest)], {type: 'application/manifest+json'});
    addLink('manifest', URL.createObjectURL(blob));
  } catch(e){}
  // 2) Meta tags for install + status bar look
  addMeta('theme-color', COFFEE);
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'default');
  addMeta('apple-mobile-web-app-title', 'ElevateEdu');
  addMeta('application-name', 'ElevateEdu');
  // 3) Icons (Apple home-screen icon + favicon)
  addLink('apple-touch-icon', svgDataUri(180));
  addLink('icon', svgDataUri(512), {type:'image/svg+xml'});
  // 4) Register the service worker (offline + installable)
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    });
  }
})();


/* ============================================================
   SECTION 16 — In-app 'Install app' button
   Chrome/Android: uses beforeinstallprompt for one-tap install.
   iOS Safari: shows a short hint to use Share > Add to Home Screen.
   Hidden automatically once installed / running standalone.
   ============================================================ */
(function(){
  var COFFEE = '#6F4E37';
  var CREAM  = '#F5E6CA';
  // If already installed / running as an app, do nothing.
  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  if(isStandalone()) return;
  if(localStorage.getItem('ee_install_dismissed') === '1') return;

  var deferredPrompt = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function makeBtn(){
    if(!window.__eeAuthed){ return null; }
    if(document.getElementById('eeInstallBtn')) return document.getElementById('eeInstallBtn');
    var b = document.createElement('button');
    b.id = 'eeInstallBtn';
    b.type = 'button';
    b.innerHTML = '\u2193 Install app';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:9999;'+
      'background:'+COFFEE+';color:'+CREAM+';border:none;border-radius:999px;'+
      'padding:11px 20px;font-family:inherit;font-weight:600;font-size:14px;'+
      'box-shadow:0 6px 18px rgba(75,56,50,0.28);cursor:pointer;opacity:0;transition:opacity .3s;';
    var x = document.createElement('span');
    x.innerHTML = '\u00d7';
    x.title = 'Dismiss';
    x.style.cssText = 'margin-left:10px;opacity:.75;font-weight:400;';
    x.addEventListener('click', function(ev){ ev.stopPropagation();
      localStorage.setItem('ee_install_dismissed','1'); b.remove();
    });
    b.appendChild(x);
    document.body.appendChild(b);
    requestAnimationFrame(function(){ b.style.opacity = '1'; });
    return b;
  }

  function showIOSHint(){
    var b = makeBtn();
    if(!b) return;
    b.firstChild.textContent = '\u2193 Add to Home Screen';
    b.addEventListener('click', function(){
      alert('To install ElevateEdu:\n\n1. Tap the Share button (the square with an up-arrow) at the bottom of Safari.\n2. Scroll down and tap \u201cAdd to Home Screen\u201d.\n3. Tap Add \u2014 ElevateEdu will appear as an app icon!');
    });
  }

  // Chrome / Android / desktop Chrome
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    var b = makeBtn();
    if(!b) return;
    b.addEventListener('click', function(){
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(choice){
        if(choice && choice.outcome === 'accepted'){ b.remove(); }
        deferredPrompt = null;
      });
    });
  });

  window.addEventListener('appinstalled', function(){
    var b = document.getElementById('eeInstallBtn'); if(b) b.remove();
    localStorage.setItem('ee_install_dismissed','1');
  });

  // iOS never fires beforeinstallprompt — show hint after load.
  if(isIOS){ window.addEventListener('load', function(){ setTimeout(showIOSHint, 1200); }); }

    // Gate install UI behind sign-in: poll session, reveal once authed
    function eeTryReveal(){
      if(deferredPrompt){ makeBtn(); }
      else if(isIOS){ showIOSHint(); }
    }
    (function eeWatchAuth(){
      try{
        if(typeof getSession === 'function'){
          getSession().then(function(s){
            if(s && !window.__eeAuthed){ window.__eeAuthed = true; eeTryReveal(); }
          }).catch(function(){});
        }
      }catch(e){}
      if(!window.__eeAuthed){ setTimeout(eeWatchAuth, 2000); }
    })();
})();


/* ============================================================
   SECTION 17 - Post-login "Add to Home Screen" instructions
   Shows a clear, dismissible how-to card right after the user
   signs in (e.g. after clicking the magic link), unless the
   app is already installed or the user dismissed it before.
   ============================================================ */
(function(){
  var COFFEE = '#6F4E37', CREAM = '#F5E6CA', ESPRESSO = '#4B3832';
  function installed(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function alreadyDone(){
    return installed() || localStorage.getItem('ee_a2hs_done') === '1';
  }
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /android/i.test(navigator.userAgent);
  function stepsHtml(){
    var ua = navigator.userAgent;
    var iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    var ios = isIOS || iPadOS;
    var safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\//.test(ua);
    var samsung = /SamsungBrowser/i.test(ua);
    var chromium = /Chrome|Chromium|CriOS|Edg\//.test(ua);
    var mac = /Macintosh/.test(ua) && !iPadOS;
    var OL = '<ol style="margin:10px 0 0 18px;padding:0;line-height:1.8;">';
    function tip(t){ return '<div style="font-size:13px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(75,56,50,0.18);opacity:0.85;">' + t + '</div>'; }
    var SIGNIN = 'You stay signed in - the installed app uses the same session as your browser, so everything is already there.';
    var IOSNOTE = 'iPhone keeps apps and Safari separate, so open the new icon and sign in once with the same email. Everything you saved is waiting there.';
    if (ios && !safari) {
      return OL
        + '<li>Home screen apps can only be added from <b>Safari</b> on iPhone and iPad.</li>'
        + '<li>Tap the <b>share</b> or <b>&#8943;</b> icon in this browser and choose <b>Open in Safari</b>.</li>'
        + '<li>In Safari, tap <b>Share</b> (the square with an arrow going up), scroll down, tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>'
        + '</ol>' + tip(IOSNOTE);
    }
    if (ios) {
      return OL
        + '<li>Tap the <b>Share</b> button at the bottom of Safari - the square with an arrow pointing up.</li>'
        + '<li>Scroll down the grey list and tap <b>Add to Home Screen</b>.</li>'
        + '<li>Tap <b>Add</b> in the top right corner.</li>'
        + '</ol>' + tip('iPhone keeps apps and Safari separate, so sign in once inside the new icon with the same email. Everything you saved is waiting there.');
    }
    if (isAndroid && samsung) {
      return OL
        + '<li>Tap the <b>menu</b> (three lines, bottom right of Samsung Internet).</li>'
        + '<li>Tap <b>Add page to</b>, then <b>Home screen</b>.</li>'
        + '<li>Tap <b>Add</b> to confirm.</li>'
        + '</ol>' + tip(SIGNIN);
    }
    if (isAndroid) {
      return OL
        + '<li>Tap the <b>Install</b> button below if you can see it - that is the quickest way.</li>'
        + '<li>Otherwise tap the <b>&#8942;</b> menu in the top right of Chrome.</li>'
        + '<li>Tap <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>.</li>'
        + '</ol>' + tip(SIGNIN);
    }
    if (mac && safari) {
      return OL
        + '<li>In the Safari menu bar, click <b>File</b>.</li>'
        + '<li>Choose <b>Add to Dock</b>, then click <b>Add</b>.</li>'
        + '<li>ElevateEdu now opens in its own window from your Dock.</li>'
        + '</ol>' + tip('Needs macOS Sonoma or newer - on an older Mac use Chrome instead. Sign in once inside the new window with the same email.');
    }
    if (chromium) {
      return OL
        + '<li>Look for the <b>install icon</b> at the right of the address bar - a small screen with a downward arrow.</li>'
        + '<li>Click it, then click <b>Install</b>. If you cannot see it, open the <b>&#8942;</b> menu and choose <b>Cast, save and share</b>, then <b>Install page as app</b>.</li>'
        + '<li>ElevateEdu opens in its own window, with no tabs or address bar.</li>'
        + '</ol>' + tip(SIGNIN);
    }
    return OL
      + '<li>This browser cannot install web apps yet.</li>'
      + '<li>Open ElevateEdu in <b>Chrome</b>, <b>Edge</b> or <b>Safari</b> and the option will appear.</li>'
      + '<li>Or just bookmark this page - everything works the same, it simply opens in a tab.</li>'
      + '</ol>' + tip('The phone version is the nicest one. Open this page on your phone and add it there too.');
  }
  function showCard(){
    if (document.getElementById('eeA2HS')) return;
    var ov = document.createElement('div');
    ov.id = 'eeA2HS';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.35);padding:16px;';
    var card = document.createElement('div');
    card.style.cssText = 'background:' + CREAM + ';color:' + ESPRESSO + ';max-width:460px;width:100%;border-radius:22px;padding:22px 22px calc(22px + env(safe-area-inset-bottom));box-shadow:0 12px 40px rgba(0,0,0,0.25);font-family:inherit;';
    card.innerHTML = '<div style="font-size:19px;font-weight:700;color:' + COFFEE + ';">You are signed in - now add the app</div>'
      + '<div style="font-size:14px;margin-top:6px;opacity:0.85;">Put ElevateEdu on your home screen: it opens full screen, works offline, and keeps your notes, grades and pictures in sync on every device you use with this email.</div>'
      + stepsHtml();
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;margin-top:18px;';
    var later = document.createElement('button');
    later.type = 'button'; later.textContent = 'Maybe later';
    later.style.cssText = 'flex:1;border:1px solid ' + COFFEE + ';background:transparent;color:' + COFFEE + ';border-radius:999px;padding:11px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;';
    var got = document.createElement('button');
    got.type = 'button'; got.textContent = 'Got it';
    got.style.cssText = 'flex:1;border:none;background:' + COFFEE + ';color:' + CREAM + ';border-radius:999px;padding:11px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;';
    function close(perm){ if (perm) localStorage.setItem('ee_a2hs_done','1'); var el = document.getElementById('eeA2HS'); if (el) el.remove(); }
    later.addEventListener('click', function(){ close(false); });
    got.addEventListener('click', function(){ close(true); });
    ov.addEventListener('click', function(e){ if (e.target === ov) close(false); });
    row.appendChild(later); row.appendChild(got); card.appendChild(row); ov.appendChild(card);
    document.body.appendChild(ov);
  }
  function watch(){
    if (alreadyDone()) return;
    try {
      if (typeof getSession === 'function') {
        getSession().then(function(s){
          if (s && !alreadyDone()) { setTimeout(showCard, 600); }
          else if (!alreadyDone()) { setTimeout(watch, 2500); }
        }).catch(function(){ setTimeout(watch, 2500); });
      }
    } catch(e) {}
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', watch); }
  else { watch(); }
})();


/* Section 18 (UI sounds) removed - the app is silent by design. */

/* ============================================================
   SECTION 20 - Install-first sign-in flow (smooth PWA onboarding)
   After the magic link is sent, guide the user to INSTALL the app
   first, then open it and tap the link there - so the session lands
   in the installed app storage and sticks (no more sign-in loop).
   Works on iOS Safari, Android/Chrome, and desktop.
   ============================================================ */
window.showInstallFirstGuide = function (email) {
  var COFFEE = "#6F4E37", CREAM = "#F5E6CA", ESPRESSO = "#4B3832";
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /android/i.test(navigator.userAgent);
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;

  function steps() {
    if (standalone) {
      return "<ol style=\"margin:10px 0 0 18px;padding:0;line-height:1.7;\">"
        + "<li>Open your email and tap the <b>sign-in link</b> we just sent.</li>"
        + "<li>It will bring you right back here, signed in. That is it!</li>"
        + "</ol>";
    }
    if (isIOS) {
      return "<ol style=\"margin:10px 0 0 18px;padding:0;line-height:1.7;\">"
        + "<li>Tap the <b>Share</b> button (square with an up-arrow) at the bottom of Safari.</li>"
        + "<li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>"
        + "<li>Open the new <b>ElevateEdu</b> icon from your home screen.</li>"
        + "<li>Inside the app, open your email and tap the <b>sign-in link</b> - you will be signed in and stay signed in.</li>"
        + "</ol>";
    }
    if (isAndroid) {
      return "<ol style=\"margin:10px 0 0 18px;padding:0;line-height:1.7;\">"
        + "<li>Tap the <b>Install app</b> button below, or open Chrome menu (three dots, top-right) and tap <b>Install app</b> / <b>Add to Home screen</b>.</li>"
        + "<li>Open the new <b>ElevateEdu</b> icon from your home screen.</li>"
        + "<li>Inside the app, open your email and tap the <b>sign-in link</b> - you will be signed in and stay signed in.</li>"
        + "</ol>";
    }
    return "<ol style=\"margin:10px 0 0 18px;padding:0;line-height:1.7;\">"
      + "<li>Install ElevateEdu: click the <b>install icon</b> in your browser address bar (or the menu).</li>"
      + "<li>Open the installed <b>ElevateEdu</b> app.</li>"
      + "<li>Inside the app, open your email and tap the <b>sign-in link</b> - you will stay signed in.</li>"
      + "</ol>";
  }

  var existing = document.getElementById("eeInstallFirst");
  if (existing) existing.remove();
  var ov = document.createElement("div");
  ov.id = "eeInstallFirst";
  ov.style.cssText = "position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(40,28,20,0.45);padding:16px;box-sizing:border-box;";
  var card = document.createElement("div");
  card.style.cssText = "background:" + CREAM + ";color:" + ESPRESSO + ";max-width:420px;width:100%;max-height:90vh;overflow-y:auto;border-radius:22px;padding:24px 22px;box-shadow:0 12px 40px rgba(0,0,0,0.28);font-family:Poppins,sans-serif;box-sizing:border-box;";
  var mailedTo = email ? ("<div style=\"font-size:13px;margin-top:6px;opacity:0.8;\">Link sent to <b>" + email + "</b>.</div>") : "";
  var title = standalone ? "Almost there - tap your sign-in link" : "One quick step: install the app first";
  var intro = standalone
    ? "You are in the installed app. Just open the sign-in link from your email and you will stay signed in."
    : "For the smoothest experience, add ElevateEdu to your home screen first, THEN tap your sign-in link from inside the app. This keeps you signed in every time you open it.";
  card.innerHTML = "<div style=\"font-size:19px;font-weight:700;color:" + COFFEE + ";\">" + title + "</div>"
    + mailedTo
    + "<div style=\"font-size:14px;margin-top:8px;line-height:1.45;\">" + intro + "</div>"
    + steps();
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:10px;margin-top:20px;";
  var installBtn = document.createElement("button");
  installBtn.type = "button";
  installBtn.textContent = isIOS ? "How to add (iOS)" : "Install app";
  installBtn.style.cssText = "flex:1;border:none;background:" + COFFEE + ";color:" + CREAM + ";border-radius:999px;padding:12px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Got it";
  closeBtn.style.cssText = "flex:1;border:1px solid " + COFFEE + ";background:transparent;color:" + COFFEE + ";border-radius:999px;padding:12px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;";
  installBtn.addEventListener("click", function () {
    if (window.__eeDeferredInstall) {
      window.__eeDeferredInstall.prompt();
      window.__eeDeferredInstall.userChoice.then(function () { window.__eeDeferredInstall = null; });
    } else if (isIOS) {
      alert("On iPhone/iPad:\n\n1. Tap the Share button at the bottom of Safari.\n2. Scroll down and tap Add to Home Screen.\n3. Tap Add, then open ElevateEdu from your home screen and tap your email sign-in link there.");
    } else {
      alert("Use your browser menu and choose Install app / Add to Home Screen, then open ElevateEdu and tap your email sign-in link inside the app.");
    }
  });
  closeBtn.addEventListener("click", function () { ov.remove(); });
  ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
  row.appendChild(installBtn); row.appendChild(closeBtn); card.appendChild(row); ov.appendChild(card);
  document.body.appendChild(ov);
};

// Capture the install prompt globally so the guide button can trigger it.
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  window.__eeDeferredInstall = e;
});

// If running as an INSTALLED app with no session, show a friendly one-tap
// prompt instead of the raw form loop.
(function () {
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (!standalone) return;
  function hasSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("-auth-token") !== -1) return true;
      }
    } catch (e) {}
    return false;
  }
  function checkAndPrompt() {
    if (hasSession()) return;
    var authForm = document.getElementById("elevateAuthForm");
    if (!authForm) return;
    if (document.getElementById("eeStandaloneHint")) return;
    var hint = document.createElement("div");
    hint.id = "eeStandaloneHint";
    hint.style.cssText = "margin-top:14px;font-size:13px;line-height:1.5;color:#6F4E37;text-align:center;";
    hint.innerHTML = "Enter your email above and tap send - then open the link from your email <b>in this app</b> to stay signed in.";
    authForm.appendChild(hint);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", checkAndPrompt);
  else checkAndPrompt();
})();

/* Uniform settings-row buttons + alignment (Section 21) */
(function(){
  try {
    if (document.getElementById('eeSettingsUniformStyle')) return;
    var s = document.createElement('style');
    s.id = 'eeSettingsUniformStyle';
    s.textContent = 
      '#eeSettingsOverlay > div > div{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:12px !important;}' +
      '#eeSettingsOverlay > div > div > button{width:84px !important;min-width:84px !important;box-sizing:border-box !important;text-align:center !important;font-size:16px !important;font-weight:600 !important;padding:7px 14px !important;border-radius:20px !important;flex:0 0 auto !important;}' +
      '#eeSettingsOverlay > div > div > span{flex:1 1 auto !important;}';
    document.head.appendChild(s);
  } catch(e){}
})();


/* ============================================================
   SECTION 21 - Automatic image compression (protects user data)
   Phone photos are 3-6MB each, and browsers only allow ~5MB of
   local storage, so uploading even one raw photo could fail and
   lose work. Every uploaded image is downscaled and re-encoded
   before it is stored, which shrinks it roughly 15-25x. Users can
   then save many images safely instead of just one.
   ============================================================ */
(function () {
  if (window.__eeImgCompressPatched) return;
  if (typeof FileReader === 'undefined' || !FileReader.prototype) return;
  window.__eeImgCompressPatched = true;
  var MAX_DIM = 1400;
  var QUALITY = 0.72;
  var original = FileReader.prototype.readAsDataURL;
  FileReader.prototype.readAsDataURL = function (blob) {
    var fr = this;
    var t = blob && typeof blob.type === 'string' ? blob.type : '';
    // Only shrink raster photos; leave SVG and non-images untouched.
    if (t.indexOf('image/') !== 0 || t.indexOf('image/svg') === 0) {
      return original.call(fr, blob);
    }
    var url;
    try { url = URL.createObjectURL(blob); } catch (e) { return original.call(fr, blob); }
    var img = new Image();
    function fallback() {
      try { URL.revokeObjectURL(url); } catch (e) {}
      try { original.call(fr, blob); } catch (e) {}
    }
    img.onload = function () {
      try {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) return fallback();
        var scale = Math.min(1, MAX_DIM / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        var ctx = cv.getContext('2d');
        if (!ctx) return fallback();
        ctx.drawImage(img, 0, 0, cw, ch);
        var out = cv.toDataURL('image/jpeg', QUALITY);
        try { URL.revokeObjectURL(url); } catch (e) {}
        if (!out || out.length < 32) return fallback();
        // Present the compressed image exactly like a normal FileReader would.
        try { Object.defineProperty(fr, 'result', { value: out, configurable: true }); } catch (e) { return fallback(); }
        var ev = { target: fr, currentTarget: fr, type: 'load' };
        try { if (typeof fr.onload === 'function') fr.onload(ev); } catch (e) {}
        try { if (typeof fr.onloadend === 'function') fr.onloadend(ev); } catch (e) {}
      } catch (e) { fallback(); }
    };
    img.onerror = fallback;
    img.src = url;
  };
})();


/* ============================================================
   SECTION 22 - Cloud sync safety net (prevents data loss)
   Several tool pages load script.js but not the Supabase library,
   so the sign-in session was never created there and everything the
   user typed stayed only in that browser. If the library is missing
   we load it, restore the session, and back up anything already
   saved on the device so no work is stranded locally.
   ============================================================ */
(function () {
  if (window.__eeSyncSafetyNet) return;
  window.__eeSyncSafetyNet = true;
  function libReady() {
    return typeof supabase !== 'undefined' && !!supabase.createClient;
  }
  // If the page already loaded the library, the normal startup handled it.
  if (libReady()) return;
  function loadLib() {
    return new Promise(function (resolve) {
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      sc.onload = function () { resolve(libReady()); };
      sc.onerror = function () { resolve(false); };
      (document.head || document.documentElement).appendChild(sc);
    });
  }
  function backupLocalWork() {
    // Additive only: uploads what is on this device, never overwrites it.
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('elevate') === 0) keys.push(k);
      }
    } catch (e) { return; }
    keys.forEach(function (k) {
      try {
        var raw = localStorage.getItem(k);
        if (raw == null) return;
        elevateAuth.syncToSupabase(k, JSON.parse(raw));
      } catch (e) {}
    });
  }
  loadLib().then(function (ok) {
    if (!ok || typeof elevateAuth === 'undefined') return;
    try {
      elevateAuth.init();
      elevateAuth.checkSession().then(function (hasSession) {
        if (hasSession)
              elevateAuth
                .cloudMerge()
                .then(function (changed) {
                  try { elevateAuth.hideAuthScreen(); } catch (err) {}
                  if (window.eeRefreshIfHydrated) window.eeRefreshIfHydrated(changed);
                })
                .catch(function () {});
      }).catch(function () {});
    } catch (e) {}
  });
})();

/* ===== SECTION 23 - Show data that just arrived from the account =====
   Tool pages draw themselves before the download finishes, so on a new device
   we repaint once (and only once per tab) after new data lands. */
(function () {
  if (window.eeRefreshIfHydrated) return;
  window.eeRefreshIfHydrated = function (changed) {
    if (!changed) return;
    try {
      if (sessionStorage.getItem("ee_hydrate_reloaded") === "1") return;
      sessionStorage.setItem("ee_hydrate_reloaded", "1");
      location.reload();
    } catch (err) {}
  };
})();
