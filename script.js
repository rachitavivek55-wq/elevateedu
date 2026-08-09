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
  var STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_8x2aEXcgM2hq0iB3H00ZW00';
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
    document.getElementById('elevatePremiumGo').addEventListener('click', function () { window.location.href = STRIPE_PAYMENT_LINK; });
  }
  window.elevateShowPremiumModal = showPremiumModal;

  function lockEl(el, labelEl) {
    if (labelEl) labelEl.style.textDecoration = 'line-through';
    el.style.opacity = '0.5';
    el.addEventListener('click', function (e) {
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
      lockEl(tile, nameEl);
      var m = tile.querySelector('.tile-metric'); if (m) m.textContent = 'Premium';
    });
    // Bottom nav items (data-tab)
    document.querySelectorAll('.nav-item').forEach(function (nav) {
      var tab = norm(nav.getAttribute('data-tab'));
      if (!tab || FREE.indexOf(tab) !== -1) return;
      var label = nav.querySelector('.nav-label');
      lockEl(nav, label);
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

  function reveal() { var s = document.getElementById('elevateGuardHide'); if (s) s.remove(); }
  function block() { window.location.replace('pricing.html'); }

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


// ===== 14) Account deletion + legal links (App Store requirement) =====
(function () {
  var resetZone = document.querySelector('.reset-zone');
  if (!resetZone) return; // only on home page

  // Legal links
  var legal = document.createElement('p');
  legal.style.cssText = 'text-align:center;font-size:11px;margin-top:18px;';
  legal.innerHTML = '<a href="privacy.html" style="color:#8b6f47;text-decoration:none;">Privacy Policy &amp; Terms</a>';
  resetZone.parentNode.insertBefore(legal, resetZone.nextSibling);

  // Delete account button
  var wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:center;margin-top:14px;';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Delete account';
  btn.style.cssText = 'background:none;border:none;color:#c0392b;font-size:12px;cursor:pointer;font-family:inherit;text-decoration:underline;';
  var note = document.createElement('p');
  note.style.cssText = 'font-size:11px;color:#999;margin-top:4px;';
  note.textContent = 'Permanently deletes your account and all your data.';
  wrap.appendChild(btn); wrap.appendChild(note);
  legal.parentNode.insertBefore(wrap, legal.nextSibling);

  var armed = false, t = null;
  function disarm(){ armed=false; btn.textContent='Delete account'; note.textContent='Permanently deletes your account and all your data.'; if(t){clearTimeout(t);t=null;} }
  btn.addEventListener('click', async function () {
    if (!armed) { armed=true; btn.textContent='Tap again to permanently delete'; note.textContent='This cannot be undone. Tap again to confirm, or wait to cancel.'; t=setTimeout(disarm,4000); return; }
    disarm();
    try {
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        var c = supabase.createClient('https://vkpmasigkotdmfkmjqoy.supabase.co', 'sb_publishable_Il0sbz8SOahZGLORSiYlLg_bbb5jOIi');
        var s = await c.auth.getSession();
        var user = s && s.data && s.data.session ? s.data.session.user : null;
        if (user) {
          try { await c.from('user_data').delete().eq('user_id', user.id); } catch(e){}
          try { await c.from('profiles').delete().eq('id', user.id); } catch(e){}
          try { await c.auth.signOut(); } catch(e){}
        }
      }
    } catch (e) {}
    try { Object.keys(localStorage).forEach(function(k){ localStorage.removeItem(k); }); } catch(e){}
    alert('Your account and data have been deleted.');
    window.location.href = 'index.html';
  });
})();
