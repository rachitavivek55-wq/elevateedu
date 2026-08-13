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
    var work = cal.filter(function (e) {
      return (
        e && (e.type === 'assignment' || e.type === 'exam' || e.type === 'task')
      );
    });
    if (work.length)
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
      return console.error('Supabase not loaded');
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }

  function showAuthScreen() {
    authScreen.style.display = 'flex';
    if (authForm) authForm.reset();
    authMsg.textContent = '';
  }

  function hideAuthScreen() {
    authScreen.style.display = 'none';
  }

  function setMsg(text, color) {
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
    authEmail.value = '';
  }

  async function checkSession() {
    var {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session) {
      currentSession = session;
      return true;
    }
    return false;
  }

  async function syncFromSupabase() {
    if (!currentSession) return;
    var { data, error } = await supabaseClient
      .from('user_data')
      .select('data_key,data_value')
      .eq('user_id', currentSession.user.id);
    if (error) {
      console.error('Sync error:', error);
      return;
    }
    if (data)
      data.forEach(function (row) {
        localStorage.setItem(row.data_key, JSON.stringify(row.data_value));
      });
  }

  async function syncToSupabase(key, value) {
    if (!currentSession) return;
    var jsonVal = typeof value === 'string' ? JSON.parse(value) : value;
    var { error } = await supabaseClient.from('user_data').upsert({
      user_id: currentSession.user.id,
      data_key: key,
      data_value: jsonVal,
    });
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
      elevateAuth.syncFromSupabase().then(function () {
        elevateAuth.hideAuthScreen();
        renderDate();
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
    originalSetItem.call(this, key, value);
    if (key.indexOf('elevate') === 0 && elevateAuth) {
      elevateAuth.syncToSupabase(key, value);
    }
  };
})();

// ===== 11) Premium (Stripe Checkout + status) =====
var elevatePremium = (function () {
  // These must match the values you set in the auth section above.
  var SUPABASE_URL = 'https://vkpmasigkotdmfkmjqoy.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi';
  var STRIPE_PRICE_ID = 'price_1U1qhsFSE5wY8QPBW0pIYMHJ';
  var CHECKOUT_FN_URL = SUPABASE_URL + '/functions/v1/create-checkout';
  var client = null;
  var btn = document.getElementById('elevatePremiumBtn');
  var note = document.getElementById('elevatePremiumNote');
  var zone = document.getElementById('elevatePremiumZone');

  function getClient() {
    if (!client && typeof supabase !== 'undefined') {
      client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
    return client;
  }

  async function getSession() {
    var c = getClient();
    if (!c) return null;
    var {
      data: { session },
    } = await c.auth.getSession();
    return session;
  }

  async function checkPremium() {
    var session = await getSession();
    if (!session) return false;
    var c = getClient();
    var { data, error } = await c
      .from('profiles')
      .select('is_premium')
      .eq('id', session.user.id)
      .single();
    if (error) {
      console.warn('Premium check:', error.message);
      return false;
    }
    return !!(data && data.is_premium);
  }

  function markPremiumUI(isPremium) {
    if (!btn) return;
    if (isPremium) {
      if (zone) zone.classList.add('is-premium');
      btn.textContent = 'Premium active';
      btn.disabled = true;
      if (note) note.textContent = 'Thanks for supporting ElevateEdu!';
    } else {
      if (zone) zone.classList.remove('is-premium');
      btn.textContent = 'Upgrade to Premium';
      btn.disabled = false;
      if (note) note.textContent = 'Unlock all features. Cancel anytime.';
    }
  }

  async function startCheckout() {
    var session = await getSession();
    if (!session) {
      if (note) note.textContent = 'Please sign in first.';
      return;
    }
    if (note) note.textContent = 'Opening secure checkout...';
    try {
      var res = await fetch(CHECKOUT_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({
          price_id: STRIPE_PRICE_ID,
          user_id: session.user.id,
        }),
      });
      var out = await res.json();
      if (out.url) {
        window.location.href = out.url;
      } else {
        if (note) note.textContent = 'Checkout error. Try again.';
        console.error(out);
      }
    } catch (e) {
      if (note) note.textContent = 'Checkout error. Try again.';
      console.error(e);
    }
  }

  function init() {
    if (btn) btn.addEventListener('click', startCheckout);
    checkPremium().then(markPremiumUI);
  }

  return { init, checkPremium, markPremiumUI };
})();
elevatePremium.init();

// ===== PREMIUM FEATURES & FILE UPLOAD =====
// Check if user has premium access
async function checkPremium() {
  if (!session || !session.user) return false;
  try {
    const { data, error } = await supabase.from('profiles').select('is_premium').eq('id', session.user.id).single();
    return !error && data && data.is_premium;
  } catch (e) {
    return false;
  }
}

// Mark premium UI elements
function markPremiumUI() {
  const premiumElements = document.querySelectorAll('[data-premium="true"]');
  premiumElements.forEach(el => {
    el.style.opacity = '0.5';
    el.style.pointerEvents = 'none';
    el.innerHTML += '<span style="color: gold; font-size: 12px; margin-left: 5px;">⭐ PREMIUM</span>';
  });
}

// File upload handler
async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file || !session?.user) return;
  
  const MAX_SIZE_FREE = 5 * 1024 * 1024; // 5MB
  const MAX_SIZE_PREMIUM = 100 * 1024 * 1024; // 100MB
  
  const isPremium = await checkPremium();
  const maxSize = isPremium ? MAX_SIZE_PREMIUM : MAX_SIZE_FREE;
  
  if (file.size > maxSize) {
    alert(`File too large! Max: ${isPremium ? '100MB' : '5MB'}`);
    return;
  }
  
  try {
    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('user-files').upload(fileName, file);
    
    if (error) throw error;
    
    // Record in database
    const { error: dbError } = await supabase.from('files').insert({
      user_id: session.user.id,
      file_name: file.name,
      file_url: fileName,
      file_size: file.size
    });
    
    if (!dbError) alert('File uploaded successfully!');
  } catch (e) {
    alert('Upload failed: ' + e.message);
  }
}

// Load user files
async function loadUserFiles() {
  if (!session?.user) return;
  try {
    const { data } = await supabase.from('files').select('*').eq('user_id', session.user.id);
    const container = document.getElementById('filesContainer');
    if (container && data?.length > 0) {
      container.innerHTML = data.map(f => `
        <div style="padding: 10px; border: 1px solid #ddd; margin: 5px 0; border-radius: 5px;">
          <p><strong>${f.file_name}</strong> (${(f.file_size / 1024 / 1024).toFixed(2)}MB)</p>
          <small style="color: gray;">${new Date(f.created_at).toLocaleDateString()}</small>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load files:', e);
  }
}

// Initialize file upload on page load
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileUpload');
  if (fileInput) fileInput.addEventListener('change', handleFileUpload);
  loadUserFiles();
  markPremiumUI();
});


// ===== 12) Premium Gating (Calendar & Checklists free; everything else locked) =====
(function () {
  var STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/14A4gz5RN4AKgQ27eY97G00';
  // Only these tools are free. Everything else requires Premium.
  var FREE = ['home', 'planner', 'calendar', 'checklists'];
  var isPremium = false;

  function norm(s) { return (s || '').trim().toLowerCase(); }

  function showPremiumModal() {
    if (document.getElementById('elevatePremiumModal')) return;
    var back = document.createElement('div');
    back.id = 'elevatePremiumModal';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;box-sizing:border-box;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:18px;width:100%;max-width:320px;max-height:90vh;overflow-y:auto;padding:26px 22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.25);font-family:inherit;position:relative;box-sizing:border-box;';
    box.innerHTML = '<button id="elevatePremiumClose" style="position:absolute;top:10px;right:12px;background:none;border:none;font-size:24px;color:#999;cursor:pointer;line-height:1;">&times;</button>'
      + '<div style="font-size:34px;margin-bottom:8px;">&#11088;</div>'
      + '<h2 style="font-size:20px;font-weight:700;color:#2d2d2d;margin:0 0 6px;">Unlock Premium</h2>'
      + '<p style="font-size:14px;color:#555;margin:0 0 16px;line-height:1.4;">Get every tool, plus 100GB of storage.</p>'
      + '<div style="font-size:34px;font-weight:800;color:#8b6f47;margin-bottom:2px;">$5<span style="font-size:15px;font-weight:500;color:#888;">/month</span></div>'
      + '<p style="font-size:12px;color:#999;margin:0 0 18px;">All features. Cancel anytime.</p>'
      + '<button id="elevatePremiumGo" style="width:100%;padding:14px;background:#8b6f47;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;">Upgrade for $5/month</button>';
    back.appendChild(box);
    document.body.appendChild(back);
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
    document.getElementById('elevatePremiumClose').addEventListener('click', function () { back.remove(); });
    document.getElementById('elevatePremiumGo').addEventListener('click', function () { startCheckout(); });
  }
  window.elevateShowPremiumModal = showPremiumModal;

  function lockEl(el, labelEl, blockClick){
    if(labelEl) labelEl.style.textDecoration = "line-through";
    el.style.opacity = "0.5";
    if(blockClick === false) return; // visual-only: let normal navigation run (hub preview)
    el.addEventListener("click", function(e){
      e.stopPropagation(); e.preventDefault(); showPremiumModal();
    }, true);
  }

  function applyGating() {
    if (isPremium) return;
    // Home dashboard tiles
    document.querySelectorAll('.tile').forEach(function (tile) {
      var nameEl = tile.querySelector('.tile-name');
      if (!nameEl) return;
      if (FREE.indexOf(norm(nameEl.textContent)) !== -1) return;
      lockEl(tile, nameEl, false);
      var m = tile.querySelector('.tile-metric'); if (m) m.textContent = 'Premium';
    });
    // Bottom nav items (data-tab)
    document.querySelectorAll('.nav-item').forEach(function (nav) {
      var tab = norm(nav.getAttribute('data-tab'));
      if (!tab || FREE.indexOf(tab) !== -1) return;
      var label = nav.querySelector('.nav-label');
      lockEl(nav, label, false);
    });
    // Sub-tool cards inside a system page (data-href)
    document.querySelectorAll('.app-card[data-href]').forEach(function (card) {
      var nameEl = card.querySelector('.app-name');
      var key = norm(nameEl ? nameEl.textContent : '');
      if (FREE.indexOf(key) !== -1) return;
      lockEl(card, nameEl);
    });
    // Bottom upgrade button (home) opens the modal too
    var upBtn = document.getElementById('elevatePremiumBtn');
    if (upBtn) {
      var clone = upBtn.cloneNode(true);
      upBtn.parentNode.replaceChild(clone, upBtn);
      clone.addEventListener('click', function (e) { e.preventDefault(); showPremiumModal(); });
    }
  }

  async function detectPremium() {
    try {
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        var c = supabase.createClient('https://vkpmasigkotdmfkmjqoy.supabase.co', 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi');
        var s = await c.auth.getSession();
        var user = s && s.data && s.data.session ? s.data.session.user : null;
        if (user) {
          var r = await c.from('profiles').select('is_premium').eq('id', user.id).single();
          isPremium = !!(r.data && r.data.is_premium);
        }
      }
    } catch (e) { isPremium = false; }
    applyGating();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectPremium);
  } else { detectPremium(); }
})();


// ===== 13) Server-verified page guard for premium pages =====
(function () {
  var ALWAYS_ALLOWED = ['', 'index.html', 'planner.html', 'calendar.html', 'checklists.html', 'pricing.html'];
  var path = window.location.pathname.split('/').pop().toLowerCase();
  if (ALWAYS_ALLOWED.indexOf(path) !== -1) return; // free page, no guard

  // Hide page content until verified to avoid a flash of premium tools
  var style = document.createElement('style');
  style.id = 'elevateGuardHide';
  style.textContent = 'body{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(style);

  function reveal(){ var s = document.getElementById("elevateGuardHide"); if(s) s.remove(); }
  // Hub pages (reachable from the bottom nav) show a locked PREVIEW instead of
  // redirecting, so users can see the tools they are missing. Deep tool pages
  // still redirect to pricing so nothing premium is actually usable.
  var HUB_PAGES = ["wallet.html","wellness.html","mindset.html","guides.html"];
  function block(){
    if(HUB_PAGES.indexOf(path) !== -1){ lockPreview(); }
    else { window.location.replace("pricing.html"); }
  }
  function lockPreview(){
    reveal();
    if(document.getElementById("eeLockStyle")) return;
    var st = document.createElement("style");
    st.id = "eeLockStyle";
    st.textContent = ".ee-locked .grid .app-card{opacity:0.55;cursor:not-allowed;pointer-events:none;filter:grayscale(0.4);}"
      + ".ee-locked .grid .app-card .app-name{text-decoration:line-through;text-decoration-color:rgba(162,59,47,0.7);}"
      + ".ee-lock-badge{display:inline-flex;align-items:center;gap:5px;margin-left:auto;font-size:11px;font-weight:600;color:#a23b2f;background:rgba(180,60,50,0.12);padding:3px 9px;border-radius:20px;}";
    document.head.appendChild(st);
    function apply(){
      document.body.classList.add("ee-locked");
      var cards = document.querySelectorAll(".grid .app-card");
      cards.forEach(function(card){
        if(card.querySelector(".ee-lock-badge")) return;
        var b = document.createElement("span");
        b.className = "ee-lock-badge";
        b.textContent = "\uD83D\uDD12 Premium";
        card.appendChild(b);
      });
      if(!document.getElementById("eeUpgradeBanner")){
        var grid = document.querySelector(".grid");
        if(grid && grid.parentNode){
          var banner = document.createElement("div");
          banner.id = "eeUpgradeBanner";
          banner.style.cssText = "background:linear-gradient(135deg,#6F4E37,#4B3832);color:#F5E6CA;border-radius:18px;padding:16px 18px;margin-bottom:16px;font-family:Poppins,sans-serif;";
          var t = document.createElement("p");
          t.textContent = "These tools are Premium";
          t.style.cssText = "margin:0 0 4px;font-size:15px;font-weight:700;";
          var d = document.createElement("p");
          d.textContent = "Preview what you are missing. Unlock everything for $5/month.";
          d.style.cssText = "margin:0 0 12px;font-size:12.5px;line-height:1.4;opacity:0.9;";
          var a = document.createElement("a");
          a.href = "pricing.html";
          a.textContent = "Upgrade to unlock";
          a.style.cssText = "display:inline-block;background:#F5E6CA;color:#4B3832;text-decoration:none;font-size:13px;font-weight:700;padding:9px 18px;border-radius:20px;";
          banner.appendChild(t); banner.appendChild(d); banner.appendChild(a);
          grid.parentNode.insertBefore(banner, grid);
        }
      }
    }
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
    else apply();
  }

  async function guard() {
    try {
      if (typeof supabase === 'undefined' || !supabase.createClient) { return block(); }
      var c = supabase.createClient('https://vkpmasigkotdmfkmjqoy.supabase.co', 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi');
      var s = await c.auth.getSession();
      var user = s && s.data && s.data.session ? s.data.session.user : null;
      if (!user) { return block(); }
      var r = await c.from('profiles').select('is_premium').eq('id', user.id).single();
      if (r.data && r.data.is_premium) { reveal(); } else { block(); }
    } catch (e) { block(); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', guard); } else { guard(); }
})();


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
    if (isIOS) {
      return '<ol style="margin:10px 0 0 18px;padding:0;line-height:1.7;">'
        + '<li>Tap the <b>Share</b> button (the square with an arrow) at the bottom of Safari.</li>'
        + '<li>Scroll down and tap <b>"Add to Home Screen".</b></li>'
        + '<li>Tap <b>Add</b> - ElevateEdu will appear as an app icon.</li>'
        + '</ol>';
    }
    if (isAndroid) {
      return '<ol style="margin:10px 0 0 18px;padding:0;line-height:1.7;">'
        + '<li>Tap the <b>Install</b> button below, or open the <b>&#8942; menu</b> (top-right of Chrome).</li>'
        + '<li>Tap <b>"Install app"</b> or <b>"Add to Home screen".</b></li>'
        + '<li>Confirm - ElevateEdu will appear as an app icon.</li>'
        + '</ol>';
    }
    return '<ol style="margin:10px 0 0 18px;padding:0;line-height:1.7;">'
      + '<li>Click the <b>install icon</b> in your browser address bar, or the <b>&#8942; menu</b>.</li>'
      + '<li>Choose <b>"Install ElevateEdu".</b></li>'
      + '</ol>';
  }
  function showCard(){
    if (document.getElementById('eeA2HS')) return;
    var ov = document.createElement('div');
    ov.id = 'eeA2HS';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.35);padding:16px;';
    var card = document.createElement('div');
    card.style.cssText = 'background:' + CREAM + ';color:' + ESPRESSO + ';max-width:460px;width:100%;border-radius:22px;padding:22px 22px calc(22px + env(safe-area-inset-bottom));box-shadow:0 12px 40px rgba(0,0,0,0.25);font-family:inherit;';
    card.innerHTML = '<div style="font-size:19px;font-weight:700;color:' + COFFEE + ';">Add ElevateEdu to your home screen</div>'
      + '<div style="font-size:14px;margin-top:6px;opacity:0.85;">Install it once and open it like a normal app - full screen, works offline.</div>'
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


/* ============================================================
   SECTION 18 - Satisfying UI sounds (ASMR-style feedback)
   All sounds are synthesized with the Web Audio API - no files,
   no storage, works offline. Global click tick on buttons/tabs,
   plus special sounds for checklist check-offs and calendar adds.
   Mute toggle is saved per device. Respects browser autoplay:
   audio only starts after the first user tap.
   ============================================================ */
(function(){
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var ctx = null;
  function muted(){ return localStorage.getItem('ee_sound_off') === '1'; }
  function ensureCtx(){
    if (!ctx) { try { ctx = new AC(); } catch(e){ return null; } }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return ctx;
  }
  // iOS/Safari unlock: audio must be created + resumed inside a real touch,
  // and a silent buffer played once, or phones stay completely silent.
  var unlocked = false;
  function unlockAudio(){
    var c = ensureCtx();
    if(!c) return;
    if(c.state === "suspended"){ c.resume(); }
    if(!unlocked){
      try {
        var buf = c.createBuffer(1, 1, 22050);
        var src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        if(src.start) src.start(0); else if(src.noteOn) src.noteOn(0);
        unlocked = true;
      } catch(e){}
    }
  }
  // Run the unlock on the very first user interaction of any kind.
  ["touchstart","touchend","pointerdown","mousedown","keydown"].forEach(function(evt){
    document.addEventListener(evt, unlockAudio, { once: false, passive: true });
  });
  // Re-resume whenever the app regains focus (iOS suspends in background).
  document.addEventListener("visibilitychange", function(){
    if(!document.hidden){ var c = ensureCtx(); if(c && c.state === "suspended") c.resume(); }
  });
  // Core tone generator: freq (Hz), duration (s), type, peak gain
  function tone(freq, dur, type, peak, whenOffset){
    var c = ensureCtx(); if (!c) return;
    var t0 = c.currentTime + (whenOffset || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak || 0.12, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  // Soft keyboard-style tick for general taps
  function playClick(){
    if(muted()) return;
    tone(2000, 0.05, "square", 0.22);
    tone(560, 0.06, "sine", 0.30);
  }
  // Bright two-note pop when checking something off
  function playCheck(){
    if(muted()) return;
    tone(660, 0.10, "sine", 0.34);
    tone(990, 0.14, "sine", 0.30, 0.06);
  }
  // Gentle rising chime when adding to the calendar
  function playAdd(){
    if(muted()) return;
    tone(523, 0.13, "sine", 0.30);
    tone(659, 0.13, "sine", 0.30, 0.07);
    tone(784, 0.17, "sine", 0.30, 0.14);
  }

  window.eeSound = { click: playClick, check: playCheck, add: playAdd };

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Global click tick via delegation (capture so it fires before handlers)
  document.addEventListener('click', function(e){
    var el = e.target.closest('button, .nav-item, .tile, .app-card, a, .cta-button, .premium-btn');
    if (!el) return;
    // Checklist: a check-off gets its own sound (handled below), skip generic
    if (el.closest && el.closest('.ck-task') && !el.closest('.ck-task-del')) return;
    playClick();
  }, true);

  // Checklist check-off sound
  if (page === 'checklists.html') {
    document.addEventListener('click', function(e){
      var row = e.target.closest('.ck-task');
      if (!row) return;
      if (e.target.closest('.ck-task-del')) { playClick(); return; }
      playCheck();
    }, true);
  }

  // Calendar add-event chime (form submit adds an event)
  if (page === 'calendar.html') {
    document.addEventListener('submit', function(){ playAdd(); }, true);
  }

  // Settings gear (top-right) opens a panel: sounds, reset, privacy, delete account
  function buildSettings(){
    if(document.getElementById("eeSettingsBtn")) return;
    var gear = document.createElement("button");
    gear.id = "eeSettingsBtn";
    gear.type = "button";
    gear.title = "Settings";
    gear.setAttribute("aria-label","Settings");
    gear.innerHTML = "\u2699";
    gear.style.cssText = "position:fixed;top:calc(env(safe-area-inset-top,0px) + 14px);right:calc(env(safe-area-inset-right,0px) + 14px);z-index:10000;width:38px;height:38px;border-radius:50%;border:none;background:rgba(111,78,55,0.90);color:#F5E6CA;font-size:19px;line-height:38px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.18);padding:0;";
    document.body.appendChild(gear);

    var overlay = document.createElement("div");
    overlay.id = "eeSettingsOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:10001;background:rgba(40,28,20,0.45);display:none;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px calc(env(safe-area-inset-bottom,0px) + 16px);box-sizing:border-box;";
    var panel = document.createElement("div");
    panel.style.cssText = "width:100%;max-width:340px;max-height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#F5E6CA;border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,0.30);padding:22px 20px;font-family:Poppins,sans-serif;color:#4B3832;box-sizing:border-box;";
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function row(label){
      var r = document.createElement("div");
      r.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid rgba(111,78,55,0.18);";
      var tx = document.createElement("span");
      tx.textContent = label;
      tx.style.cssText = "font-size:15px;font-weight:500;";
      r.appendChild(tx);
      return r;
    }
    function hint(text){
      var p = document.createElement("p");
      p.textContent = text;
      p.style.cssText = "margin:-4px 0 4px;font-size:11.5px;line-height:1.4;color:#8b6f47;";
      return p;
    }

    var h = document.createElement("h2");
    h.textContent = "Settings";
    h.style.cssText = "margin:0 0 6px;font-size:20px;font-weight:700;color:#4B3832;";
    panel.appendChild(h);

    var sRow = row("Sounds");
    var sBtn = document.createElement("button");
    sBtn.type = "button";
    function paintSound(){
      var on = !muted();
      sBtn.textContent = on ? "On" : "Off";
      sBtn.style.cssText = "min-width:64px;padding:7px 14px;border:none;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:" + (on ? "#6F4E37" : "rgba(111,78,55,0.25)") + ";color:" + (on ? "#F5E6CA" : "#6F4E37") + ";";
    }
    paintSound();
    sBtn.addEventListener("click", function(){
      if(muted()){ localStorage.removeItem("ee_sound_off"); } else { localStorage.setItem("ee_sound_off","1"); }
      paintSound();
      if(!muted()) playClick();
    });
    sRow.appendChild(sBtn);
    panel.appendChild(sRow);

    var rRow = row("Reset all data");
    var rBtn = document.createElement("button");
    rBtn.type = "button";
    rBtn.textContent = "Reset";
    rBtn.style.cssText = "min-width:64px;padding:7px 14px;border:none;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:rgba(180,60,50,0.15);color:#a23b2f;";
    var rArmed = false, rT = null;
    function disarmReset(){ rArmed=false; rBtn.textContent="Reset"; rBtn.style.background="rgba(180,60,50,0.15)"; rBtn.style.color="#a23b2f"; if(rT){clearTimeout(rT);rT=null;} }
    rBtn.addEventListener("click", function(){
      if(!rArmed){
        rArmed = true;
        rBtn.textContent = "Tap to confirm";
        rBtn.style.background = "#a23b2f";
        rBtn.style.color = "#fff";
        rT = setTimeout(disarmReset, 4000);
        return;
      }
      var keys = [];
      for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf("elevate")===0) keys.push(k); }
      keys.forEach(function(k){ localStorage.removeItem(k); });
      location.reload();
    });
    rRow.appendChild(rBtn);
    panel.appendChild(rRow);
    panel.appendChild(hint("Erases your notes, tasks, and everything saved on this device. This cannot be undone. Your account stays."));

    var pRow = row("Privacy & Terms");
    var pLink = document.createElement("a");
    pLink.href = "privacy.html";
    pLink.textContent = "View";
    pLink.style.cssText = "min-width:64px;text-align:center;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:600;text-decoration:none;font-family:inherit;background:rgba(111,78,55,0.15);color:#6F4E37;";
    pRow.appendChild(pLink);
    panel.appendChild(pRow);

    var dRow = row("Delete account");
    var dBtn = document.createElement("button");
    dBtn.type = "button";
    dBtn.textContent = "Delete";
    dBtn.style.cssText = "min-width:64px;padding:7px 14px;border:none;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:rgba(180,60,50,0.15);color:#a23b2f;";
    var dArmed = false, dT = null;
    function disarmDel(){ dArmed=false; dBtn.textContent="Delete"; dBtn.style.background="rgba(180,60,50,0.15)"; dBtn.style.color="#a23b2f"; if(dT){clearTimeout(dT);dT=null;} }
    dBtn.addEventListener("click", function(){
      if(!dArmed){
        dArmed = true;
        dBtn.textContent = "Tap to confirm";
        dBtn.style.background = "#a23b2f";
        dBtn.style.color = "#fff";
        dT = setTimeout(disarmDel, 4000);
        return;
      }
      disarmDel();
      if(window.eeDeleteAccount) window.eeDeleteAccount();
    });
    dRow.appendChild(dBtn);
    panel.appendChild(dRow);
    panel.appendChild(hint("Permanently deletes your account and all your data everywhere. This cannot be undone."));

    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.style.cssText = "margin-top:18px;width:100%;padding:11px;border:none;border-radius:14px;background:#6F4E37;color:#F5E6CA;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;";
    panel.appendChild(close);

    function openPanel(){ paintSound(); disarmReset(); disarmDel(); overlay.style.display="flex"; }
    function closePanel(){ overlay.style.display="none"; }
    gear.addEventListener("click", function(e){ e.stopPropagation(); openPanel(); });
    close.addEventListener("click", closePanel);
    overlay.addEventListener("click", function(e){ if(e.target===overlay) closePanel(); });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildSettings);
  else buildSettings();
})();

// ===== 19) Premium unlock fix (force-unlock home tiles once premium confirmed) =====
(function () {
  async function forceUnlockIfPremium() {
    try {
      if (typeof supabase === 'undefined' || !supabase.createClient) return;
      var c = supabase.createClient('https://vkpmasigkotdmfkmjqoy.supabase.co', 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi');
      var s = await c.auth.getSession();
      var user = s && s.data && s.data.session ? s.data.session.user : null;
      if (!user) return;
      var r = await c.from('profiles').select('is_premium').eq('id', user.id).single();
      if (!(r.data && r.data.is_premium)) return;

      document.body.classList.remove('ee-locked');
      var banner = document.getElementById('eeUpgradeBanner');
      if (banner) banner.remove();

      var map = { home: 'index.html', planner: 'planner.html', wallet: 'wallet.html', fitness: 'wellness.html', wellness: 'wellness.html', mindset: 'mindset.html', guides: 'guides.html' };

      document.querySelectorAll('.tile,.nav-item,.app-card[data-href]').forEach(function (el) {
        el.style.opacity = ''; el.style.filter = ''; el.style.cursor = 'pointer';
        el.querySelectorAll('.ee-lock-badge').forEach(function (b) { b.remove(); });
        var nm = el.querySelector('.tile-name,.nav-label,.app-name');
        if (nm) nm.style.textDecoration = '';
        var m = el.querySelector('.tile-metric');
        if (m && m.textContent === 'Premium') m.textContent = '';
        var clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
        var href = clone.getAttribute('data-href');
        if (!href) {
          var t = clone.querySelector('.tile-name');
          if (t) href = map[t.textContent.trim().toLowerCase()];
        }
        if (!href) {
          var tab = clone.getAttribute('data-tab');
          if (tab) href = map[tab];
        }
        if (href) {
          clone.style.cursor = 'pointer';
          clone.addEventListener('click', function () { window.location.href = href; });
        }
      });
    } catch (e) { /* silent */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceUnlockIfPremium);
  } else {
    forceUnlockIfPremium();
  }
})();
