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
