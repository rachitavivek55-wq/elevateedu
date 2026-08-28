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
  // Every page must opt into the full screen on notched iPhones. Without
  // viewport-fit=cover, iOS shrinks the layout viewport so the page never
  // reaches the bottom of the screen (the bottom nav floats above a dead
  // strip) and every env(safe-area-inset-*) value reports 0. Most pages
  // shipped without it and one shipped with no viewport tag at all, so
  // normalise it here instead of in fifteen separate HTML files.
  var vp = head.querySelector('meta[name="viewport"]');
  if (!vp) {
    vp = document.createElement('meta');
    vp.setAttribute('name', 'viewport');
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    head.appendChild(vp);
  } else {
    var vpc = vp.getAttribute('content') || '';
    if (!/viewport-fit\s*=\s*cover/i.test(vpc)) {
      vp.setAttribute('content', (vpc.replace(/\s*,\s*$/, '') + ', viewport-fit=cover').replace(/^,\s*/, ''));
    }
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

  /* Continue with Google. The button only draws itself if the Google provider
     is actually switched on in Supabase, so it can never sit there half-wired
     and dead. It matters most on an installed iPhone app: Google finishes the
     whole thing inside the app, with nothing to copy across from Safari. */
  var googleChecked = false;
  /* A browser tab is easy to lose, and on iPhone an installed app gets its
     own storage - so signing in before installing means doing it twice.
     Showing the install steps first saves people that whole detour. */
  function installSteps() {
    var ua = navigator.userAgent || '';
    var ios = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    var ipadDesktopMode = /macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
    if (ios || ipadDesktopMode) {
      return ['Make sure this page is open in Safari',
              'Tap the Share button at the bottom of the screen',
              'Scroll down and tap "Add to Home Screen"',
              'Open ElevateEdu from your home screen'];
    }
    if (/android/i.test(ua)) {
      return ['Make sure this page is open in Chrome',
              'Tap the three dots at the top right',
              'Tap "Install app" or "Add to Home screen"',
              'Open ElevateEdu from your home screen'];
    }
    return ['Click the install icon in the address bar',
            'Or open the browser menu and choose "Install ElevateEdu"',
            'It then opens in its own window, like an app'];
  }
  function installCard(before) {
    if (document.getElementById('eeInstallCard')) return;
    if (isStandalone()) return; /* already running as an app */
    if (!before || !before.parentNode) return;
    var steps = installSteps();
    var box = document.createElement('div');
    box.id = 'eeInstallCard';
    box.style.cssText = 'background:rgba(255,255,255,.55);border:1px solid rgba(111,78,55,.18);'
      + 'border-radius:18px;padding:13px 15px;margin-bottom:16px;text-align:left;';
    var html = '<div style="font-size:12.5px;font-weight:700;color:#4b3832;margin-bottom:7px;">'
      + 'First, add ElevateEdu to your home screen</div>'
      + '<ol style="margin:0;padding-left:17px;font-size:11.5px;line-height:1.65;color:#6f4e37;">';
    for (var i = 0; i < steps.length; i++) html += '<li>' + steps[i] + '</li>';
    html += '</ol><div style="font-size:10.5px;line-height:1.5;color:#6f4e37;opacity:.75;'
      + 'margin-top:8px;">It opens full screen, keeps working offline, and stays signed in.'
      + ' Then sign in just once, below.</div>';
    box.innerHTML = html;
    before.parentNode.insertBefore(box, before);
  }
  function addGoogleBtn() {
    if (document.getElementById('eeGoogleBtn')) return;
    var form = document.getElementById('elevateAuthForm');
    if (!form || !form.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'eeGoogleWrap';
    wrap.style.cssText = 'margin-bottom:14px;';
    var b = document.createElement('button');
    b.id = 'eeGoogleBtn';
    b.type = 'button';
    b.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;background:#fff;color:#3c4043;border:1px solid #dadce0;border-radius:10px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;';
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">'
      + '<path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>'
      + '<path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>'
      + '<path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>'
      + '<path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>'
      + '</svg><span>Continue with Google</span>';
    b.addEventListener('click', function () {
      setMsg('Opening Google...');
      try {
        supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname },
        });
      } catch (e) {
        setMsg('Google could not open just now. Check your connection and try again.', '#b3261e');
      }
    });
    wrap.appendChild(b);
    var safe = document.createElement('div');
    safe.textContent = 'Google checks your password, not us. We never see it.';
    safe.style.cssText = 'text-align:center;font-size:11px;line-height:1.45;opacity:.6;margin-top:10px;';
    wrap.appendChild(safe);
    /* The email magic link is no longer offered here: Google sign-in is the
       one and only way in. If Google is ever reported off, the branch further
       down puts the email form back so nobody is locked out. */
    form.style.display = 'none';
    var nt = document.getElementById('elevateAuthNote');
    if (nt) nt.style.display = 'none';
    form.parentNode.insertBefore(wrap, form);
    installCard(wrap);
  }
  function maybeGoogleBtn() {
    var cached = '';
    try { cached = localStorage.getItem('ee_google_on') || ''; } catch (e) {}
    if (cached === '1') addGoogleBtn();
    if (googleChecked) return;
    googleChecked = true;
    try {
      fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_ANON } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var on = !!(j && j.external && j.external.google);
          try { localStorage.setItem('ee_google_on', on ? '1' : '0'); } catch (e) {}
          if (on) { addGoogleBtn(); return; }
          var w = document.getElementById('eeGoogleWrap');
          if (w && w.parentNode) w.parentNode.removeChild(w);
          var backForm = document.getElementById('elevateAuthForm');
          if (backForm) backForm.style.display = '';
          var backNote = document.getElementById('elevateAuthNote');
          if (backNote) backNote.style.display = '';
        })
        .catch(function () {});
    } catch (e) {}
  }

  function showAuthScreen() {
    if (authScreen) authScreen.style.display = 'flex';
    if (authForm) authForm.reset();
    if (authMsg) authMsg.textContent = '';
    var waiting = '';
    try { waiting = localStorage.getItem('ee_pending_email') || ''; } catch (e) {}
    var eeNote = document.getElementById('elevateAuthNote');
    if (eeNote) {
      eeNote.textContent = isStandalone()
        ? 'This app keeps its own sign-in, separate from Safari. You only have to do this once.'
        : 'We email you a one-time sign-in link, so there is no password to remember. It works for 1 hour.';
    }
    var sub = document.querySelector('.auth-subtitle');
    if (sub) sub.textContent = 'Sign in safely - no password to remember';
    if (eeNote && eeNote.parentNode && !document.getElementById('eeTrust')) {
      var tr = document.createElement('p');
      tr.id = 'eeTrust';
      tr.style.cssText = 'font-size:10px;line-height:1.5;color:var(--coffee);opacity:.45;margin-top:10px;text-align:center;';
      tr.innerHTML = 'Your work stays private in your own account. '
        + '<a href="privacy.html" style="color:inherit;text-decoration:underline;">Privacy</a>'
        + ' &middot; '
        + '<a href="terms.html" style="color:inherit;text-decoration:underline;">Terms</a>';
      eeNote.parentNode.insertBefore(tr, eeNote.nextSibling);
    }
    maybeGoogleBtn();
    if (isStandalone()) {
      // An installed iPhone app gets its own storage, separate from Safari, so
      // being signed in in Safari does not carry over. Always offer the paste
      // box here - on a fresh install there is no saved email to go on, and
      // showing a bare sign-in form with no explanation just looks broken.
      if (waiting) pendingEmail = waiting;
      var gOn = '';
      try { gOn = localStorage.getItem('ee_google_on') || ''; } catch (e) {}
      if (!waiting && gOn === '1') return;
      codeBox();
      if (waiting) {
        setMsg('Paste the sign-in code you copied in Safari, or the link we emailed to ' + waiting + '.');
      } else {
        setMsg('iPhone keeps this app and Safari apart. In Safari, tap Install app, then Copy my sign-in code, and paste it in the box above.');
      }
    }
  }

  function hideAuthScreen() {
    if (authScreen) authScreen.style.display = 'none';
  }

  function setMsg(text, color) {
    if (!authMsg) return;
    authMsg.textContent = text;
    authMsg.style.color = color || 'var(--coffee)';
  }

  var pendingEmail = '';

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  /* A tapped email link always opens the browser, never an installed iPhone app,
     so we also accept the 6-digit code from the same email. That lets people sign
     in from inside the installed app without ever leaving it. */
  /* Tapping the sign-in link in an email always opens the browser, never an
     installed iPhone app, which used to leave the app stuck on the sign-in
     screen. So the app also accepts the link pasted in, or a one-time code. */
  function codeBox() {
    var box = document.getElementById('eeCodeBox');
    if (box) { box.style.display = 'block'; return box; }
    box = document.createElement('div');
    box.id = 'eeCodeBox';
    box.style.cssText = 'margin-top:16px;text-align:left;';
    var lab = document.createElement('div');
    lab.textContent = 'Paste your sign-in code, or the link from your email';
    lab.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:7px;opacity:0.85;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    var inp = document.createElement('input');
    inp.id = 'eeCodeInput';
    inp.type = 'text';
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.placeholder = 'Paste code or link';
    inp.style.cssText = 'flex:1;min-width:0;padding:13px;border-radius:14px;border:1px solid rgba(75,56,50,0.28);background:#fffdf8;color:#4B3832;font-size:15px;font-family:inherit;';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Sign in';
    btn.style.cssText = 'border:none;background:#6F4E37;color:#F5E6CA;border-radius:14px;padding:13px 18px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;';
    btn.addEventListener('click', function () { verifySignIn(inp, btn); });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); verifySignIn(inp, btn); }
    });
    row.appendChild(inp);
    row.appendChild(btn);
    box.appendChild(lab);
    box.appendChild(row);
    // One-tap paste. iOS pops its own little Paste confirmation, so this is
    // a single tap instead of tap-the-box-then-long-press-then-Paste.
    if (navigator.clipboard && navigator.clipboard.readText) {
      var pb = document.createElement('button');
      pb.type = 'button';
      pb.textContent = 'Paste from clipboard';
      pb.style.cssText = 'margin-top:9px;width:100%;border:1px solid rgba(75,56,50,0.28);background:transparent;color:#4B3832;border-radius:14px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;';
      pb.addEventListener('click', function () {
        navigator.clipboard.readText().then(function (txt) {
          if (!txt || !txt.trim()) {
            return setMsg('Nothing copied yet. In Safari tap Install app, then Copy my sign-in code - or press and hold the link in your email and choose Copy Link.');
          }
          inp.value = txt.trim();
          verifySignIn(inp, btn);
        }).catch(function () {
          setMsg('Your phone would not share the clipboard. Tap the box above and paste the link in there instead.');
        });
      });
      box.appendChild(pb);
    }
    var help = document.createElement('div');
    help.innerHTML = 'Easiest way: in Safari tap <b>Install app</b>, then <b>Copy my sign-in code</b>, and paste it here. Or in your email app <b>press and hold</b> the sign-in link and choose <b>Copy Link</b> - do not tap it, that opens the browser instead of this app.';
    help.style.cssText = 'font-size:12px;margin-top:8px;opacity:0.75;line-height:1.5;';
    box.appendChild(help);
    if (authForm && authForm.parentNode) authForm.parentNode.insertBefore(box, authForm.nextSibling);
    else if (authScreen) authScreen.appendChild(box);
    return box;
  }

  function readToken(raw) {
    var v = (raw || '').trim();
    if (!v) return null;
    if (/^[0-9]{6}$/.test(v)) return { kind: 'code', token: v };
    var a = v.match(/access_token=([^&#\s]+)/);
    var r = v.match(/refresh_token=([^&#\s]+)/);
    if (a && r) return { kind: 'session', access: a[1], refresh: r[1] };
    var th = v.match(/token_hash=([^&#\s]+)/);
    if (th) return { kind: 'hash', token: th[1] };
    var tk = v.match(/[?&]token=([^&#\s]+)/);
    if (tk) return { kind: 'hash', token: tk[1] };
    return null;
  }

  async function verifySignIn(inp, btn) {
    var parsed = readToken(inp.value);
    if (!parsed) {
      return setMsg('That does not look like the sign-in link. Press and hold the link in your email, choose Copy Link, then paste the whole thing here.');
    }
    btn.disabled = true;
    setMsg('Signing you in...');
    var res;
    try {
      if (parsed.kind === 'session') {
        res = await supabaseClient.auth.setSession({
          access_token: parsed.access,
          refresh_token: parsed.refresh,
        });
      } else if (parsed.kind === 'hash') {
        res = await supabaseClient.auth.verifyOtp({ token_hash: parsed.token, type: 'magiclink' });
        if (res.error) {
          res = await supabaseClient.auth.verifyOtp({ token_hash: parsed.token, type: 'email' });
        }
      } else {
        res = await supabaseClient.auth.verifyOtp({
          email: pendingEmail,
          token: parsed.token,
          type: 'email',
        });
      }
    } catch (err) {
      res = { error: err };
    }
    btn.disabled = false;
    if (!res || res.error) {
      inp.value = '';
      return setMsg('That did not work. Email links only work once - in Safari, tap Install app, then Copy my sign-in code, and paste that here instead.', '#b3261e');
    }
    try { localStorage.removeItem('ee_pending_email'); } catch (e) {}
    setMsg('You are in! Loading your stuff...');
    setTimeout(function () { window.location.reload(); }, 500);
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
    pendingEmail = email;
    try { localStorage.setItem('ee_pending_email', email); } catch (e2) {}
    codeBox();
    var box = document.getElementById('eeCodeInput');
    if (box) { box.value = ''; try { box.focus(); } catch (e3) {} }
    if (isStandalone()) {
      setMsg('Check your email. Do not tap the link - press and hold it, choose Copy Link, then paste it in the box below. That signs you in right here in the app, for good.');
    } else {
      setMsg('Check your email and tap the sign-in link. Adding the app to your phone? Use the paste box below instead.');
    }
    if (!isStandalone()) { try { showInstallFirstGuide(email); } catch (e4) {} }
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

  /* ---------- Pending write queue ----------
     A local save fires an upload, but if the page closes before that request
     finishes, the cloud still holds the older copy - and the next download
     used to write that older copy straight over the newer local one. That is
     how checklist edits vanished. Every local save is now queued until its
     upload is confirmed. Downloads skip queued keys, and the queue is retried
     on load, on a timer, and when the tab is hidden. */
  var PEND_KEY = 'ee_pending_v1';
  function pendList() {
    try {
      var a = JSON.parse(localStorage.getItem(PEND_KEY) || '[]');
      return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
    } catch (e) { return []; }
  }
  function pendSave(a) {
    try { localStorage.setItem(PEND_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function pendAdd(k) {
    var a = pendList();
    if (a.indexOf(k) < 0) { a.push(k); pendSave(a); }
  }
  function pendDone(k) {
    var a = pendList();
    var i = a.indexOf(k);
    if (i >= 0) { a.splice(i, 1); pendSave(a); }
  }
  /* Sends anything still queued. Keys that fail stay queued for next time. */
  async function flushPending() {
    if (!currentSession) return;
    var a = pendList();
    for (var i = 0; i < a.length; i++) {
      var raw = null;
      try { raw = localStorage.getItem(a[i]); } catch (e) {}
      if (raw === null) { pendDone(a[i]); continue; }
      await syncToSupabase(a[i], raw);
    }
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
    var pend = pendList();
    window.__eeApplyingRemote = true;
    try {
      if (data)
        data.forEach(function (row) {
          var incoming = JSON.stringify(row.data_value);
          var existing = localStorage.getItem(row.data_key);
          if (keepLocal && existing !== null) return;
          if (pend.indexOf(row.data_key) >= 0) return; /* newer local edit */
          if (existing === incoming) return;
          try {
            localStorage.setItem(row.data_key, incoming);
            /* Only count it as a change once the value is really stored, so a
               storage failure can never keep asking the page to repaint. */
            if (localStorage.getItem(row.data_key) === incoming) changed = true;
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
    /* Push anything this device never managed to upload BEFORE downloading,
       so the download can never land on top of newer local work. */
    try { await flushPending(); } catch (e) {}
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
    var jsonVal;
    try {
      jsonVal = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      /* Not valid JSON, so there is nothing sensible to store up there. */
      pendDone(key);
      return;
    }
    try {
      var { error } = await supabaseClient.from('user_data').upsert({
        user_id: currentSession.user.id,
        data_key: key,
        data_value: jsonVal,
      }, { onConflict: 'user_id,data_key' });
      if (error) {
        console.error('Sync upload error:', error);
        return; /* stays queued */
      }
      pendDone(key);
    } catch (e) {
      /* Offline, or the page is closing mid-request: leave it queued. */
    }
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
    flushPending,
    pendMark: pendAdd,
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
      if (!window.__eeApplyingRemote) {
        /* Queue first, upload second. If this page closes mid-request the key
           stays queued and goes up on the next load instead of being lost. */
        try { elevateAuth.pendMark(key); } catch (e) {}
        elevateAuth.syncToSupabase(key, value);
      }
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
    function haveLink(rel){ return !!document.querySelector("link[rel='" + rel + "']"); }
    function haveMeta(n){ return !!document.querySelector("meta[name='" + n + "']"); }
    // The real manifest.json and PNG icons are already linked at the top of
    // this file. The inline SVG versions below are a FALLBACK ONLY. If they
    // get added on top of the real ones, two things break: a blob: manifest
    // overrides manifest.json and its start_url and scope can no longer be
    // resolved, and iOS cannot use an SVG home screen icon so it silently
    // falls back to a screenshot of the page. So only add what is missing.
    try {
      if (!haveLink('manifest')) {
        var blob = new Blob([JSON.stringify(manifest)], {type: 'application/manifest+json'});
        addLink('manifest', URL.createObjectURL(blob));
      }
    } catch(e){}
    // 2) Meta tags for install + status bar look
    if (!haveMeta('theme-color')) addMeta('theme-color', COFFEE);
    if (!haveMeta('mobile-web-app-capable')) addMeta('mobile-web-app-capable', 'yes');
    if (!haveMeta('apple-mobile-web-app-capable')) addMeta('apple-mobile-web-app-capable', 'yes');
    if (!haveMeta('apple-mobile-web-app-status-bar-style')) addMeta('apple-mobile-web-app-status-bar-style', 'default');
    if (!haveMeta('apple-mobile-web-app-title')) addMeta('apple-mobile-web-app-title', 'ElevateEdu');
    if (!haveMeta('application-name')) addMeta('application-name', 'ElevateEdu');
    // 3) Icons - the real PNG files win; these SVGs are only a fallback.
    if (!haveLink('apple-touch-icon')) addLink('apple-touch-icon', svgDataUri(180));
    if (!haveLink('icon')) addLink('icon', svgDataUri(512), {type:'image/svg+xml'});
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
      if (window.__eeShowA2HS) { return window.__eeShowA2HS(); }
      alert('To install ElevateEdu:\n\n1. Tap the Share button in Safari.\n2. Choose Add to Home Screen.\n3. Tap Add.');
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
    var IOSNOTE = 'iPhone keeps a home screen app and Safari separate, so sign in once inside the new icon: type your email, then press and hold the link in the email, copy it, and paste it into the app. That sign-in sticks, and everything you saved is already waiting.';
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
        + '<li>Open the new <b>ElevateEdu</b> icon, then tap <b>Paste from clipboard</b> to finish signing in.</li>'
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
    /* iPhone gives a home-screen app its own private storage, so signing in
       here in Safari does not carry over, and an emailed link only works once.
       Let the user copy this session and paste it into the installed app. */
    var iPadHere = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
    if (isIOS || iPadHere) {
      var hs = '';
      try {
        for (var hi = 0; hi < localStorage.length; hi++) {
          var hk = localStorage.key(hi);
          if (!/^sb-.+-auth-token$/.test(hk)) continue;
          var hv = JSON.parse(localStorage.getItem(hk) || 'null');
          var hsess = hv && (hv.currentSession || hv);
          if (hsess && hsess.access_token && hsess.refresh_token) {
            hs = 'access_token=' + hsess.access_token + '&refresh_token=' + hsess.refresh_token;
            break;
          }
        }
      } catch (e) { hs = ''; }
      if (hs) {
        var hw = document.createElement('div');
        hw.style.cssText = 'margin-top:16px;padding:12px;border-radius:12px;background:rgba(111,78,55,0.10);';
        var hl = document.createElement('div');
        hl.style.cssText = 'font-size:13px;line-height:1.45;';
        hl.innerHTML = '<b>One extra step, just once.</b> The home-screen app cannot tell that you are already signed in here. Copy your sign-in code now, then paste it the first time you open the app.';
        var hb = document.createElement('button');
        hb.type = 'button';
        hb.textContent = 'Copy my sign-in code';
        hb.style.cssText = 'margin-top:10px;width:100%;border:none;background:' + COFFEE + ';color:' + CREAM + ';padding:12px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;';
        hb.addEventListener('click', function () {
          function finish(good) {
            if (good) {
              hb.textContent = 'Copied - now paste it in the app';
              try { localStorage.setItem('ee_app_linked', '1'); } catch (e) {}
              return;
            }
            hb.textContent = 'Copy the text below by hand';
            if (document.getElementById('eeHandTa')) return;
            var ta = document.createElement('textarea');
            ta.id = 'eeHandTa';
            ta.value = hs;
            ta.readOnly = true;
            ta.style.cssText = 'margin-top:8px;width:100%;height:70px;font-size:11px;border-radius:8px;padding:6px;box-sizing:border-box;';
            hw.appendChild(ta);
            try { ta.focus(); ta.setSelectionRange(0, ta.value.length); } catch (e) {}
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hs).then(function () { finish(true); }, function () { finish(false); });
          } else { finish(false); }
        });
        hw.appendChild(hl);
        hw.appendChild(hb);
        card.appendChild(hw);
      }
    }
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
  window.__eeShowA2HS = showCard;
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
    var OL = '<ol style="margin:10px 0 0 18px;padding:0;line-height:1.8;">';
    if (standalone) {
      return OL
        + '<li>Check your email, press and hold the sign-in link, choose <b>Copy Link</b>, and paste it into the box on the sign-in screen.</li>'
        + '<li>That is it - you stay signed in from now on.</li>'
        + '</ol>';
    }
    if (isIOS) {
      return OL
        + '<li>Tap the <b>Share</b> button at the bottom of Safari - the square with an arrow pointing up.</li>'
        + '<li>Scroll down, tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>'
        + '<li>Close Safari and open the new <b>ElevateEdu</b> icon on your home screen.</li>'
        + '<li>In the app, type your email and tap send. Then open your email, <b>press and hold</b> the sign-in link, choose <b>Copy Link</b>, and paste it into the box in the app.</li>'
        + '</ol>'
        + '<div style="font-size:13px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(75,56,50,0.18);opacity:0.85;">iPhone treats a home screen app and Safari as two separate places, so the sign-in has to happen <b>inside the app</b> to stick. Tapping the link opens Safari, which is why you copy it and paste it in instead. You only ever do this once.</div>';
    }
    if (isAndroid) {
      return OL
        + '<li>Open your email and tap the <b>sign-in link</b> - that signs you in right away.</li>'
        + '<li>Then tap the <b>Install app</b> button below, or open the Chrome menu (three dots, top right) and tap <b>Install app</b>.</li>'
        + '<li>Open the new <b>ElevateEdu</b> icon - you are already signed in, nothing else to do.</li>'
        + '</ol>';
    }
    return OL
      + '<li>Open your email and click the <b>sign-in link</b> - that signs you in right away.</li>'
      + '<li>Then click the <b>install icon</b> at the right of the address bar and click <b>Install</b>.</li>'
      + '<li>ElevateEdu opens in its own window, already signed in.</li>'
      + '</ol>';
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
    var key = 'ee_hydrate_reloads:' + location.pathname;
    if (!changed) {
      /* Nothing new arrived, so give this page a clean slate for next time. */
      try {
        sessionStorage.removeItem(key);
      } catch (err) {}
      return;
    }
    /* Every tool reads its saved work the moment the page loads, so anything
       the download brings in after that is invisible to it - and the tool's
       next save would put its old copy straight back over the new data. That
       is how a checklist can look like it never saved. Repainting once the new
       data lands is what prevents it, so it has to be allowed on every page
       and not just the first page opened in the tab. This cannot loop: after
       the repaint the copy on this device already matches the account, so
       "changed" comes back false. The counter is only a safety stop. */
    try {
      var n = parseInt(sessionStorage.getItem(key) || '0', 10);
      if (!(n >= 0)) n = 0;
      if (n >= 3) return;
      sessionStorage.setItem(key, String(n + 1));
      location.reload();
    } catch (err) {}
  };
})();

/* ==============================================================
   SECTION 23 - Settings sheet (the gear in the title bar)
   Every page already loads this file and already has a .titlebar,
   so mounting the gear here puts it on Home, Planner, Calendar and
   Vision Board at once. The sheet holds the account email, Log out,
   Erase my data, Delete my account, an install shortcut and the
   privacy / terms links. Both destructive actions need the user to
   type a word first, so nothing can be wiped by a stray tap.
   ============================================================== */
(function () {
  var CSS =
    '#eeGear{width:34px;height:34px;border-radius:12px;border:0;padding:0;background:var(--tile,#fbf4e6);box-shadow:var(--shadow-soft,0 4px 14px rgba(75,56,50,.06));color:#6f4e37;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s ease}' +
    '#eeGear:active{transform:scale(.9)}' +
    '#eeGear svg{width:18px;height:18px}' +
    '#eeTitleRight{display:flex;align-items:center;gap:10px}' +
    '#eeSetOverlay{position:fixed;inset:0;z-index:99998;background:rgba(75,56,50,.42);display:none;align-items:flex-end;justify-content:center}' +
    '#eeSetOverlay.ee-open{display:flex}' +
    '#eeSetCard{width:100%;max-width:430px;background:#fbf4e6;border-radius:26px 26px 0 0;padding:18px 20px 26px;max-height:88vh;overflow:auto;box-shadow:0 -12px 34px rgba(75,56,50,.20);animation:eeSetUp .22s ease}' +
    '@keyframes eeSetUp{from{transform:translateY(28px);opacity:.5}to{transform:translateY(0);opacity:1}}' +
    '#eeSetCard h3{margin:0;font-size:17px;color:#4b3832;font-weight:600}' +
    '.eeSetTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}' +
    '#eeSetClose{border:0;background:#efe3cc;color:#6f4e37;width:30px;height:30px;border-radius:50%;font-size:17px;line-height:1;cursor:pointer;font-family:inherit}' +
    '#eeSetWho{font-size:12px;color:#8a6f5c;margin:0 0 6px;word-break:break-all}' +
    '.eeSetRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(111,78,55,.10)}' +
    '.eeSetRow .eeL{flex:1 1 auto}' +
    '.eeSetRow .eeL b{display:block;font-size:14px;color:#4b3832;font-weight:600}' +
    '.eeSetRow .eeL i{display:block;font-style:normal;font-size:11.5px;color:#8a6f5c;margin-top:3px;line-height:1.35}' +
    '.eeSetBtn{border:0;border-radius:14px;padding:9px 13px;font-size:12.5px;font-weight:600;cursor:pointer;background:#efe3cc;color:#4b3832;white-space:nowrap;font-family:inherit}' +
    '.eeSetBtn.ee-warn{background:#f0dcc6;color:#8a5a2f}' +
    '.eeSetBtn.ee-danger{background:#e7b9a4;color:#6b2f18}' +
    '.eeSetBtn:active{transform:scale(.96)}' +
    '.eeSetBtn[disabled]{opacity:.55}' +
    '#eeSetConfirm{display:none;margin-top:12px;background:#f7ece0;border:1px solid rgba(111,78,55,.16);border-radius:16px;padding:12px}' +
    '#eeSetConfirmText{margin:0 0 8px;font-size:12.5px;color:#6f4e37;line-height:1.45}' +
    '#eeSetType{width:100%;box-sizing:border-box;border:1px solid rgba(111,78,55,.25);border-radius:12px;padding:9px 10px;font-size:13px;font-family:inherit;color:#4b3832;background:#fff;margin-bottom:8px}' +
    '#eeSetFoot{margin-top:14px;text-align:center;font-size:11.5px;color:#8a6f5c;line-height:1.6}' +
    '#eeSetFoot a{color:#6f4e37;text-decoration:underline;margin:0 6px}';

  /* Every other icon in the app is drawn by Lucide, so we ask Lucide for
     the cog too and it lines up with the rest of the set exactly. The
     hand-drawn one below is only a stand-in for the rare load where
     Lucide never arrives. */
  var GEAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3.4"></circle>' +
    '<path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"></path>' +
    '</svg>';

  function drawGear(btn) {
    try {
      if (window.lucide && window.lucide.createIcons) {
        btn.innerHTML = '<i data-lucide="settings"></i>';
        window.lucide.createIcons();
        if (btn.querySelector('svg')) return true;
      }
    } catch (e) {}
    btn.innerHTML = GEAR;
    return false;
  }

  function addStyle() {
    if (document.getElementById('eeSetStyle')) return;
    var s = document.createElement('style');
    s.id = 'eeSetStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* The email lives in the saved session, so we can show it without
     asking the network again. */
  function showWho() {
    var el = document.getElementById('eeSetWho');
    if (!el) return;
    var mail = '';
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-') > 0) {
          var o = JSON.parse(localStorage.getItem(k) || '{}');
          mail = (o && o.user && o.user.email) || '';
          if (mail) break;
        }
      }
    } catch (e) {}
    el.textContent = mail ? ('Signed in as ' + mail) : 'Signed in on this device';
  }

  function closeSheet() {
    var o = document.getElementById('eeSetOverlay');
    if (o) o.classList.remove('ee-open');
  }

  /* Erase keeps the account but empties it everywhere. Writing an empty
     value first lets the normal sync push the blank up to the cloud, so
     the data does not come back on the next device. */
  function eraseData() {
    var go = document.getElementById('eeSetGo');
    if (go) { go.textContent = 'Erasing...'; go.disabled = true; }
    var mine = [], i, k;
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k && (k.indexOf('elevate') === 0 || k.indexOf('ee_') === 0)) mine.push(k);
    }
    mine.forEach(function (key) {
      if (key.indexOf('elevate') !== 0) return;
      var v = localStorage.getItem(key) || '';
      var blank = v.charAt(0) === '[' ? '[]' : (v.charAt(0) === '{' ? '{}' : '""');
      try { localStorage.setItem(key, blank); } catch (e) {}
    });
    setTimeout(function () {
      mine.forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
      try { sessionStorage.removeItem('ee_hydrate_reloaded'); } catch (e) {}
      window.location.href = 'index.html';
    }, 2600);
  }

  function doLogout() {
    var b = document.getElementById('eeSetOut');
    if (b) { b.textContent = 'Bye...'; b.disabled = true; }
    var done = function () { window.location.href = 'index.html'; };
    try {
      if (typeof elevateAuth !== 'undefined' && elevateAuth && elevateAuth.logout) {
        var p = elevateAuth.logout();
        if (p && p.then) p.then(done, done); else done();
      } else { done(); }
    } catch (e) { done(); }
  }

  var pending = null;

  function askFor(kind) {
    pending = kind;
    var box = document.getElementById('eeSetConfirm');
    var txt = document.getElementById('eeSetConfirmText');
    var inp = document.getElementById('eeSetType');
    var word = kind === 'wipe' ? 'ERASE' : 'DELETE';
    txt.innerHTML = kind === 'wipe'
      ? 'This empties every task, note, event and vision board photo on all of your devices. Type <b>ERASE</b> below if that is what you want.'
      : 'This removes your account and everything in it, for good. Type <b>DELETE</b> below if that is what you want.';
    inp.value = '';
    inp.placeholder = word;
    inp.style.borderColor = 'rgba(111,78,55,.25)';
    box.style.display = 'block';
    try { inp.focus(); } catch (e) {}
  }

  function buildSheet() {
    var o = document.getElementById('eeSetOverlay');
    if (o) return o;
    o = document.createElement('div');
    o.id = 'eeSetOverlay';
    o.innerHTML =
      '<div id="eeSetCard" role="dialog" aria-modal="true" aria-label="Settings">' +
        '<div class="eeSetTop"><h3>Settings</h3>' +
        '<button id="eeSetClose" type="button" aria-label="Close settings">&#215;</button></div>' +
        '<p id="eeSetWho">Signed in on this device</p>' +
        '<div class="eeSetRow" id="eeSetInstallRow" style="display:none"><div class="eeL">' +
          '<b>Add to home screen</b><i>Keep ElevateEdu one tap away, like a normal app.</i></div>' +
          '<button class="eeSetBtn" id="eeSetInstall" type="button">Show me</button></div>' +
        '<div class="eeSetRow"><div class="eeL">' +
          '<b>Log out</b><i>Signs you out here only. Everything you saved stays in your account.</i></div>' +
          '<button class="eeSetBtn" id="eeSetOut" type="button">Log out</button></div>' +
        '<div class="eeSetRow"><div class="eeL">' +
          '<b>Erase my data</b><i>Starts you fresh - empties everything you saved, on every device. Your account stays.</i></div>' +
          '<button class="eeSetBtn ee-warn" id="eeSetWipe" type="button">Erase</button></div>' +
        '<div class="eeSetRow"><div class="eeL">' +
          '<b>Delete my account</b><i>Removes the account itself along with all of its data. Cannot be undone.</i></div>' +
          '<button class="eeSetBtn ee-danger" id="eeSetDel" type="button">Delete</button></div>' +
        '<div class="eeSetRow"><div class="eeL">' +
          '<b>Menu bar position</b><i>If your phone hides part of the bottom bar, nudge it into place.</i></div>' +
          '<button class="eeSetBtn" id="eeSetNav" type="button">Adjust</button></div>' +
        '<div id="eeSetConfirm"><p id="eeSetConfirmText"></p>' +
          '<input id="eeSetType" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Type here">' +
          '<button class="eeSetBtn ee-danger" id="eeSetGo" type="button">Yes, do it</button> ' +
          '<button class="eeSetBtn" id="eeSetNo" type="button">Never mind</button></div>' +
        '<p id="eeSetFoot">ElevateEdu - free forever, no ads<br>' +
          '<a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></p>' +
      '</div>';
    document.body.appendChild(o);

    o.addEventListener('click', function (ev) { if (ev.target === o) closeSheet(); });
    document.getElementById('eeSetClose').addEventListener('click', closeSheet);
    document.getElementById('eeSetNo').addEventListener('click', function () {
      pending = null;
      document.getElementById('eeSetConfirm').style.display = 'none';
    });
    document.getElementById('eeSetOut').addEventListener('click', doLogout);
    document.getElementById('eeSetNav').addEventListener('click', function () {
      /* Close first, otherwise this sheet covers the very bar being moved. */
      closeSheet();
      try { if (window.eeNavLift) window.eeNavLift.adjust(); } catch (e) {}
    });
    document.getElementById('eeSetWipe').addEventListener('click', function () { askFor('wipe'); });
    document.getElementById('eeSetDel').addEventListener('click', function () { askFor('gone'); });
    document.getElementById('eeSetInstall').addEventListener('click', function () {
      closeSheet();
      try { if (window.__eeShowA2HS) window.__eeShowA2HS(); } catch (e) {}
    });
    document.getElementById('eeSetGo').addEventListener('click', function () {
      var inp = document.getElementById('eeSetType');
      var want = pending === 'wipe' ? 'ERASE' : 'DELETE';
      if ((inp.value || '').trim().toUpperCase() !== want) {
        inp.style.borderColor = '#c0704f';
        inp.placeholder = 'Please type ' + want;
        return;
      }
      if (pending === 'wipe') eraseData();
      else if (window.eeDeleteAccount) window.eeDeleteAccount();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeSheet();
    });
    return o;
  }

  function openSheet() {
    addStyle();
    var o = buildSheet();
    showWho();
    document.getElementById('eeSetConfirm').style.display = 'none';
    pending = null;
    var row = document.getElementById('eeSetInstallRow');
    if (row) row.style.display = window.__eeShowA2HS ? 'flex' : 'none';
    o.classList.add('ee-open');
  }

  function mountGear() {
    var bar = document.querySelector('.titlebar');
    if (!bar || document.getElementById('eeGear')) return;
    var btn = document.createElement('button');
    btn.id = 'eeGear';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Settings');
    if (!drawGear(btn)) {
      /* Lucide might still be loading, so try once more in a moment. */
      setTimeout(function () { drawGear(btn); }, 1200);
    }
    btn.addEventListener('click', openSheet);
    var chip = bar.querySelector('.date-chip');
    if (chip && chip.parentNode) {
      var wrap = document.createElement('div');
      wrap.id = 'eeTitleRight';
      chip.parentNode.insertBefore(wrap, chip);
      wrap.appendChild(btn);
      wrap.appendChild(chip);
    } else {
      bar.appendChild(btn);
    }
  }

  function boot() { addStyle(); mountGear(); }
  window.eeOpenSettings = openSheet;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ==============================================================
   SECTION 24 - Keep the cloud copy honest
   Retries anything still sitting in the upload queue every 20
   seconds, and again the moment the tab is hidden or the app is
   closed, so a save is never left stranded on one device.
   ============================================================== */
(function () {
  function flush() {
    try {
      if (typeof elevateAuth !== 'undefined' && elevateAuth && elevateAuth.flushPending) {
        elevateAuth.flushPending();
      }
    } catch (e) {}
  }
  setInterval(flush, 20000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
})();

/* ==============================================================
   SECTION 25 - A bottom bar that really sits at the bottom
   .phone is a full-height flex column with the nav as its last
   row, which only lands on the true bottom edge when the browser
   agrees about how tall the screen is. Safari's floating toolbar
   and older iOS (no dvh unit) both break that, leaving the bar
   floating mid-screen or tucked behind the toolbar. Measuring the
   visible viewport ourselves fixes it, and a nudge control in
   Settings covers any device that still needs a few pixels.
   ============================================================== */
(function () {
  var KEY = 'ee_nav_lift';
  var MIN = -24, MAX = 60;

  function getLift() {
    var n = 0;
    try { n = parseInt(localStorage.getItem(KEY) || '0', 10); } catch (e) {}
    if (isNaN(n)) n = 0;
    return Math.max(MIN, Math.min(MAX, n));
  }
  function phoneLayout() {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.navigator.standalone) return true;
    } catch (e) {}
    return (window.innerWidth || 0) <= 900;
  }
  function apply() {
    var ph = document.querySelector('.phone');
    if (!ph) return;
    if (!phoneLayout()) { ph.style.height = ''; return; }
    var lift = getLift();
    var vv = window.visualViewport;
    var h = vv && vv.height ? vv.height : (window.innerHeight || 0);
    h = Math.round(h) - lift;
    /* Guard against a mid-gesture measurement of nearly nothing. */
    if (h > 240) ph.style.height = h + 'px';
  }
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; apply(); });
  }
  function setLift(n) {
    n = Math.max(MIN, Math.min(MAX, n | 0));
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    apply();
    return n;
  }

  var BTN = 'border:0;border-radius:12px;padding:7px 11px;font-size:12px;font-weight:600;'
    + 'font-family:inherit;background:#efe3cc;color:#4b3832;cursor:pointer;';
  function adjuster() {
    var old = document.getElementById('eeNavAdj');
    if (old) { old.parentNode.removeChild(old); return; }
    var box = document.createElement('div');
    box.id = 'eeNavAdj';
    /* Sits at the TOP of the screen so it never hides the bar being moved. */
    box.style.cssText = 'position:fixed;top:calc(10px + env(safe-area-inset-top));left:50%;'
      + 'transform:translateX(-50%);z-index:100000;background:#fbf4e6;'
      + 'border:1px solid rgba(111,78,55,.18);border-radius:18px;padding:9px 11px;'
      + 'box-shadow:0 10px 26px rgba(75,56,50,.22);display:flex;align-items:center;'
      + 'gap:7px;font-family:inherit;font-size:12px;color:#4b3832;max-width:94vw;';
    box.innerHTML = '<span style="font-weight:600">Menu bar</span>'
      + '<button type="button" data-d="4" style="' + BTN + '">Up</button>'
      + '<button type="button" data-d="-4" style="' + BTN + '">Down</button>'
      + '<button type="button" data-reset="1" style="' + BTN + '">Reset</button>'
      + '<button type="button" data-done="1" style="' + BTN
      + 'background:#6f4e37;color:#fbf4e6;">Done</button>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== box && t.tagName !== 'BUTTON') t = t.parentNode;
      if (!t || t === box) return;
      if (t.getAttribute('data-done')) {
        if (box.parentNode) box.parentNode.removeChild(box);
        return;
      }
      if (t.getAttribute('data-reset')) { setLift(0); return; }
      setLift(getLift() + parseInt(t.getAttribute('data-d'), 10));
    });
  }

  window.eeNavLift = { get: getLift, set: setLift, adjust: adjuster };

  function boot() {
    apply();
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', function () {
      setTimeout(apply, 260);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', schedule);
      window.visualViewport.addEventListener('scroll', schedule);
    }
    /* Safari settles its toolbars a beat after load. */
    setTimeout(apply, 400);
    setTimeout(apply, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
