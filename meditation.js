(function () {
  'use strict';
  var KEY = 'elevate_meditation';
  var $ = function (id) {
    return document.getElementById(id);
  };

  var DEFAULT_SEC = 600; // 10:00
  var MAX_SEC = 120 * 60;
  var state = load();
  var sheetMode = 'new';
  var editId = null;

  var sheetSec = DEFAULT_SEC;

  function load() {
    var s = { defaultSec: DEFAULT_SEC, sessions: [] };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        if (typeof raw.defaultSec === 'number')
          s.defaultSec = clampSec(raw.defaultSec);
        else if (typeof raw.defaultMin === 'number')
          s.defaultSec = clampSec(raw.defaultMin * 60);
        if (Array.isArray(raw.sessions)) {
          s.sessions = raw.sessions.map(function (x) {
            var sec =
              typeof x.sec === 'number'
                ? x.sec
                : typeof x.min === 'number'
                ? x.min * 60
                : 600;
            return {
              id: x.id || uid(),
              name: x.name || 'Session',
              sec: clampSec(sec),
            };
          });
        }
      }
    } catch (e) {}
    return s;
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function clampSec(n) {
    n = Math.round(n);
    if (n < 5) n = 5;
    if (n > MAX_SEC) n = MAX_SEC;
    return n;
  }
  function uid() {
    return (
      's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    );
  }
  function fmt(totalSec) {
    totalSec = Math.max(0, Math.round(totalSec));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function icons() {
    if (window.lucide && window.lucide.createIcons) {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  function renderDefault() {
    $('mtDefaultTime').textContent = fmt(state.defaultSec);
  }
  function bumpDefault(deltaSec) {
    state.defaultSec = clampSec(state.defaultSec + deltaSec);
    save();
    renderDefault();
  }

  function renderList() {
    var list = $('mtList');
    var empty = $('mtEmpty');
    list.innerHTML = '';
    if (!state.sessions.length) {
      empty.hidden = false;
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    state.sessions.forEach(function (sesh) {
      var card = document.createElement('div');
      card.className = 'mt-card';
      card.setAttribute('data-id', sesh.id);
      card.innerHTML =
        '<div class="mt-card-icon"><i data-lucide="timer"></i></div>' +
        '<div class="mt-card-body">' +
        '<p class="mt-card-name">' +
        esc(sesh.name) +
        '</p>' +
        '<p class="mt-card-meta">' +
        fmt(sesh.sec) +
        '</p>' +
        '</div>' +
        '<button class="mt-card-edit" type="button" aria-label="Edit"><i data-lucide="pencil"></i></button>';
      card.addEventListener('click', function (ev) {
        if (ev.target.closest('.mt-card-edit')) {
          openEdit(sesh.id);
          return;
        }
        startRunner(sesh.name, sesh.sec);
      });
      list.appendChild(card);
    });
    icons();
  }

  function syncSheetLen() {
    var mm = Math.floor(sheetSec / 60);
    var ss = sheetSec % 60;
    $('mtLenMin').textContent = mm;
    $('mtLenSec').textContent = ss < 10 ? '0' + ss : ss;
    var chips = document.querySelectorAll('#mtChipRow .mt-chip');
    chips.forEach(function (c) {
      c.classList.toggle(
        'is-active',
        parseInt(c.getAttribute('data-sec'), 10) === sheetSec
      );
    });
  }
  function bumpSheetMin(d) {
    sheetSec = clampSec(sheetSec + d * 60);
    syncSheetLen();
  }
  function bumpSheetSec(d) {
    var v = sheetSec + d;
    if (v < 5) v = 5;
    sheetSec = clampSec(v);
    syncSheetLen();
  }
  function openNew() {
    sheetMode = 'new';
    editId = null;
    sheetSec = 600;
    $('mtSheetTitle').textContent = 'New session';
    $('mtNameInput').value = '';
    $('mtSheetDelete').hidden = true;
    syncSheetLen();
    $('mtSheetWrap').hidden = false;
    icons();
    setTimeout(function () {
      $('mtNameInput').focus();
    }, 60);
  }
  function openEdit(id) {
    var sesh = state.sessions.filter(function (s) {
      return s.id === id;
    })[0];
    if (!sesh) return;
    sheetMode = 'edit';
    editId = id;
    sheetSec = clampSec(sesh.sec);
    $('mtSheetTitle').textContent = 'Edit session';
    $('mtNameInput').value = sesh.name;
    $('mtSheetDelete').hidden = false;
    syncSheetLen();
    $('mtSheetWrap').hidden = false;
    icons();
  }
  function closeSheet() {
    $('mtSheetWrap').hidden = true;
  }
  function saveSheet() {
    var name = ($('mtNameInput').value || '').trim();
    if (!name) name = 'Session';
    if (sheetMode === 'edit' && editId) {
      state.sessions.forEach(function (s) {
        if (s.id === editId) {
          s.name = name;
          s.sec = sheetSec;
        }
      });
      toast('Session updated');
    } else {
      state.sessions.push({ id: uid(), name: name, sec: sheetSec });
      toast('Session saved');
    }
    save();
    renderList();
    closeSheet();
  }
  function deleteSheet() {
    if (!editId) return;
    confirmAsk('Delete this session?', function () {
      state.sessions = state.sessions.filter(function (s) {
        return s.id !== editId;
      });
      save();
      renderList();
      closeSheet();
      toast('Session deleted');
    });
  }

  var RING_LEN = 628.3;
  var timer = {
    total: 0,
    left: 0,
    running: false,
    intervalId: null,
    endAt: 0,
    done: false,
  };

  function startRunner(name, totalSec) {
    timer.total = totalSec;
    timer.left = totalSec;
    timer.running = false;
    timer.done = false;
    $('mtRunName').textContent = name;
    $('mtRunner').classList.remove('is-done');
    $('mtRunHint').textContent = 'Breathe in\u2026 breathe out.';
    $('mtDismiss').hidden = true;
    updateRunUI();
    $('mtRunner').hidden = false;
    icons();
    toggleTimer();
  }
  function updateRunUI() {
    $('mtRunTime').textContent = fmt(timer.left);
    var frac = timer.total ? timer.left / timer.total : 0;
    $('mtRing').style.strokeDashoffset = (RING_LEN * (1 - frac)).toFixed(1);
    setToggleIcon();
  }
  function setToggleIcon() {
    var btn = $('mtToggle');
    btn.innerHTML = timer.running
      ? '<i data-lucide="pause"></i>'
      : '<i data-lucide="play"></i>';
    icons();
  }
  function toggleTimer() {
    if (timer.done) {
      timer.left = timer.total;
      timer.done = false;
      $('mtRunner').classList.remove('is-done');
      $('mtRunHint').textContent = 'Breathe in\u2026 breathe out.';
      $('mtDismiss').hidden = true;
      stopChime();
    }
    if (timer.running) {
      pauseTimer();
      return;
    }
    timer.running = true;
    timer.endAt = Date.now() + timer.left * 1000;
    unlockAudio();
    setToggleIcon();
    timer.intervalId = setInterval(tick, 250);
  }
  function pauseTimer() {
    timer.running = false;
    timer.endAt = 0;
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    setToggleIcon();
  }
  // Counted from a wall-clock end time, so the session still finishes on
  // schedule when the phone sleeps or the tab is backgrounded and timers
  // get throttled.
  function tick() {
    if (!timer.running) return;
    var left = Math.ceil((timer.endAt - Date.now()) / 1000);
    if (left <= 0) {
      timer.left = 0;
      updateRunUI();
      finishTimer();
      return;
    }
    if (left !== timer.left) {
      timer.left = left;
      updateRunUI();
    }
  }
  function resetTimer() {
    pauseTimer();
    stopChime();
    timer.left = timer.total;
    timer.done = false;
    $('mtRunner').classList.remove('is-done');
    $('mtRunHint').textContent = 'Breathe in\u2026 breathe out.';
    $('mtDismiss').hidden = true;
    updateRunUI();
  }
  function stopRunner() {
    pauseTimer();
    stopChime();
    $('mtRunner').hidden = true;
  }
  function finishTimer() {
    pauseTimer();
    timer.done = true;
    $('mtRunner').classList.add('is-done');
    $('mtRunHint').textContent = "Time's up. Well done.";
    $('mtDismiss').hidden = false;
    startChime();
  }

  // ---- gentle repeating chime (Web Audio, with an <audio> fallback) ----
  var audioCtx = null;
  var chimeTimers = [];
  var chimeActive = false;
  var fallbackEl = null;
  var CHIME_GAP = 2600; // ms between peals
  var CHIME_MS = 20800; // hard cap: the chime always goes quiet by itself

  function ensureCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        audioCtx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (audioCtx.state === 'suspended') {
      try {
        var p = audioCtx.resume();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    return audioCtx;
  }

  // A short bell baked into a WAV data URI, so there is still a sound on
  // browsers that refuse to run Web Audio outside a tap (mainly iOS).
  function bellDataUri() {
    var rate = 11025;
    var len = Math.floor(rate * 2.2);
    var buf = new ArrayBuffer(44 + len * 2);
    var v = new DataView(buf);
    function tag(off, s) {
      for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
    }
    tag(0, 'RIFF');
    v.setUint32(4, 36 + len * 2, true);
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    tag(36, 'data');
    v.setUint32(40, len * 2, true);
    var notes = [523.25, 659.25, 783.99];
    for (var i = 0; i < len; i++) {
      var t = i / rate;
      var s = 0;
      for (var n = 0; n < notes.length; n++) {
        var t0 = n * 0.45;
        if (t < t0) continue;
        s +=
          Math.sin(2 * Math.PI * notes[n] * (t - t0)) *
          Math.exp(-(t - t0) * 2.2) *
          0.22;
      }
      if (s > 1) s = 1;
      if (s < -1) s = -1;
      v.setInt16(44 + i * 2, Math.round(s * 32767), true);
    }
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var b = 0; b < bytes.length; b++) bin += String.fromCharCode(bytes[b]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  function fallbackAudio() {
    if (fallbackEl !== null) return fallbackEl;
    try {
      fallbackEl = new Audio(bellDataUri());
      fallbackEl.preload = 'auto';
    } catch (e) {
      fallbackEl = false;
    }
    return fallbackEl;
  }

  // Browsers only let sound start from a real tap, so prime both paths the
  // moment the user presses play — long before the timer actually ends.
  function unlockAudio() {
    var ctx = ensureCtx();
    if (ctx) {
      try {
        var src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) {}
    }
    var a = fallbackAudio();
    if (a) {
      try {
        a.muted = true;
        var pr = a.play();
        if (pr && pr.then) {
          pr.then(function () {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          }).catch(function () {
            a.muted = false;
          });
        } else {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        }
      } catch (e) {
        a.muted = false;
      }
    }
  }

  function buzz() {
    try {
      if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
    } catch (e) {}
  }

  function playBell() {
    var ctx = ensureCtx();
    if (ctx && ctx.state === 'running') {
      var now = ctx.currentTime;
      var notes = [523.25, 659.25, 783.99]; // C5 E5 G5
      notes.forEach(function (freq, i) {
        var t0 = now + i * 0.45;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.9);
      });
    } else {
      var a = fallbackAudio();
      if (a) {
        try {
          a.currentTime = 0;
          var pr = a.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) {}
      }
    }
    buzz();
  }

  function startChime() {
    stopChime();
    chimeActive = true;
    var reps = Math.max(1, Math.floor(CHIME_MS / CHIME_GAP));
    playBell();
    for (var i = 1; i < reps; i++) {
      chimeTimers.push(setTimeout(playBell, i * CHIME_GAP));
    }
    // Safety net: go quiet and tidy the button up on our own.
    chimeTimers.push(setTimeout(chimeExpired, CHIME_MS));
  }

  function chimeExpired() {
    stopChime();
    var d = $('mtDismiss');
    if (d) d.hidden = true;
  }

  function stopChime() {
    chimeActive = false;
    chimeTimers.forEach(function (t) {
      clearTimeout(t);
    });
    chimeTimers = [];
    var a = fallbackEl;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    }
  }

  var confirmCb = null;
  function confirmAsk(msg, cb) {
    confirmCb = cb;
    $('mtConfirmMsg').textContent = msg;
    $('mtConfirmWrap').hidden = false;
  }
  function confirmClose() {
    $('mtConfirmWrap').hidden = true;
    confirmCb = null;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('mtToast');
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 1900);
  }

  function bind() {
    // default card steppers: minutes and seconds
    $('mtDefMinDown').addEventListener('click', function () {
      bumpDefault(-60);
    });
    $('mtDefMinUp').addEventListener('click', function () {
      bumpDefault(60);
    });
    $('mtDefSecDown').addEventListener('click', function () {
      bumpDefault(-5);
    });
    $('mtDefSecUp').addEventListener('click', function () {
      bumpDefault(5);
    });
    $('mtDefStart').addEventListener('click', function () {
      startRunner('Meditation', state.defaultSec);
    });

    $('mtNew').addEventListener('click', openNew);
    $('mtSheetClose').addEventListener('click', closeSheet);
    $('mtSheetSave').addEventListener('click', saveSheet);
    $('mtSheetDelete').addEventListener('click', deleteSheet);
    $('mtLenMinDown').addEventListener('click', function () {
      bumpSheetMin(-1);
    });
    $('mtLenMinUp').addEventListener('click', function () {
      bumpSheetMin(1);
    });
    $('mtLenSecDown').addEventListener('click', function () {
      bumpSheetSec(-5);
    });
    $('mtLenSecUp').addEventListener('click', function () {
      bumpSheetSec(5);
    });
    document.querySelectorAll('#mtChipRow .mt-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        sheetSec = clampSec(parseInt(c.getAttribute('data-sec'), 10));
        syncSheetLen();
      });
    });
    $('mtSheetWrap').addEventListener('click', function (e) {
      if (e.target === $('mtSheetWrap')) closeSheet();
    });

    $('mtToggle').addEventListener('click', toggleTimer);

    // Coming back to the app: re-open the audio route and catch up the
    // clock in case the timer ran out while we were away.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (timer.running) {
        ensureCtx();
        tick();
      }
    });
    $('mtReset').addEventListener('click', resetTimer);
    $('mtStop').addEventListener('click', stopRunner);
    $('mtRunBack').addEventListener('click', stopRunner);
    $('mtDismiss').addEventListener('click', function () {
      stopChime();
      $('mtDismiss').hidden = true;
    });

    $('mtConfirmNo').addEventListener('click', confirmClose);
    $('mtConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      confirmClose();
      if (cb) cb();
    });
  }

  function init() {
    renderDefault();
    renderList();
    bind();
    icons();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
