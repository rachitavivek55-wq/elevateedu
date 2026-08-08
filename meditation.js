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
    setToggleIcon();
    timer.intervalId = setInterval(tick, 1000);
  }
  function pauseTimer() {
    timer.running = false;
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    setToggleIcon();
  }
  function tick() {
    timer.left -= 1;
    if (timer.left <= 0) {
      timer.left = 0;
      updateRunUI();
      finishTimer();
      return;
    }
    updateRunUI();
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

  // ---- gentle repeating chime via Web Audio ----
  var audioCtx = null;
  var chimeTimers = [];
  var chimeActive = false;
  function ensureCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') {
      try {
        audioCtx.resume();
      } catch (e) {}
    }
    return audioCtx;
  }
  function playBell() {
    var ctx = ensureCtx();
    if (!ctx) return;
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
  }
  function startChime() {
    stopChime();
    chimeActive = true;
    var reps = 8; // number of bell peals
    var gap = 2600; // ms between peals (~21s total)
    playBell();
    for (var i = 1; i < reps; i++) {
      chimeTimers.push(setTimeout(playBell, i * gap));
    }
    // auto-stop flag after the last peal finishes
    chimeTimers.push(
      setTimeout(function () {
        chimeActive = false;
      }, reps * gap)
    );
  }
  function stopChime() {
    chimeActive = false;
    chimeTimers.forEach(function (t) {
      clearTimeout(t);
    });
    chimeTimers = [];
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
