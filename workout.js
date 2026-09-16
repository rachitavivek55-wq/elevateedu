(function () {
  'use strict';

  var WK_KEY = 'elevate_workouts';
  var CAL_KEY = 'elevate_calendar_entries';

  var $ = function (id) {
    return document.getElementById(id);
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function load() {
    try {
      var raw = localStorage.getItem(WK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(WK_KEY, JSON.stringify(list));
    } catch (e) {}
  }
  function loadCal() {
    try {
      var raw = localStorage.getItem(CAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCal(list) {
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function normalizeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  function fmtDateLabel(ymd) {
    // ymd = YYYY-MM-DD
    var p = String(ymd).split('-');
    if (p.length !== 3) return ymd;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var mo = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return mo[d.getMonth()] + ' ' + d.getDate();
  }

  function todayYMD() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // ---- date chip ----
  function setDateChip() {
    var d = new Date();
    var mo = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    var dd = $('dateDay'),
      dm = $('dateMonth');
    if (dd) dd.textContent = d.getDate();
    if (dm) dm.textContent = mo[d.getMonth()];
  }

  // ---- state for builder ----
  var editingId = null; // workout being edited
  var schedId = null; // workout being scheduled

  function icons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  // ---- render list ----
  function render() {
    var list = load();
    var wrap = $('wkList');
    var empty = $('wkEmpty');
    // summary
    var totalEx = 0,
      scheduled = 0;
    list.forEach(function (w) {
      totalEx += (w.exercises || []).length;
      if (w.scheduled && w.scheduled.length) scheduled += w.scheduled.length;
    });
    $('wkCount').textContent = list.length;
    $('wkScheduled').textContent = scheduled;
    $('wkExercises').textContent = totalEx;

    if (!list.length) {
      wrap.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var html = '';
    list.forEach(function (w) {
      var exs = w.exercises || [];
      var exHtml = exs
        .map(function (ex) {
          var sr = [];
          if (ex.sets) sr.push(esc(ex.sets) + ' sets');
          if (ex.reps) sr.push(esc(ex.reps) + ' reps');
          var srTxt = sr.join(' × ');
          var link = ex.link
            ? '<a class="wk-ex-link" href="' +
              esc(ex.link) +
              '" target="_blank" rel="noopener" aria-label="Tutorial"><i data-lucide="external-link"></i></a>'
            : '';
          return (
            '<li class="wk-ex-item">' +
            '<span class="wk-ex-dot"></span>' +
            '<span class="wk-ex-info">' +
            '<span class="wk-ex-name">' +
            esc(ex.name || 'Exercise') +
            '</span>' +
            (srTxt ? '<span class="wk-ex-sr">' + srTxt + '</span>' : '') +
            '</span>' +
            link +
            '</li>'
          );
        })
        .join('');

      var schedChip = '';
      if (w.scheduled && w.scheduled.length) {
        var next = w.scheduled.slice().sort()[0];
        schedChip =
          '<span class="wk-chip sched"><i data-lucide="calendar-check"></i>' +
          fmtDateLabel(next) +
          '</span>';
      }

      html +=
        '<article class="wk-card" data-id="' +
        w.id +
        '">' +
        '<div class="wk-card-top">' +
        '<div>' +
        '<h3 class="wk-card-name">' +
        esc(w.name || 'Workout') +
        '</h3>' +
        (w.note ? '<p class="wk-card-note">' + esc(w.note) + '</p>' : '') +
        '</div>' +
        (exs.length
          ? '<button class="wk-expand" data-act="toggle" aria-label="Show exercises"><i data-lucide="chevron-down"></i></button>'
          : '') +
        '</div>' +
        '<div class="wk-card-meta">' +
        '<span class="wk-chip"><i data-lucide="list"></i>' +
        exs.length +
        ' exercise' +
        (exs.length === 1 ? '' : 's') +
        '</span>' +
        schedChip +
        '</div>' +
        (exHtml
          ? '<div class="wk-ex-wrap" hidden><ul class="wk-ex-list">' +
            exHtml +
            '</ul></div>'
          : '') +
        '<div class="wk-card-actions">' +
        '<button class="wk-mini sched" data-act="sched"><i data-lucide="calendar-plus"></i>Schedule</button>' +
        '<button class="wk-mini edit" data-act="edit"><i data-lucide="pencil"></i>Edit</button>' +
        '<button class="wk-mini del" data-act="del"><i data-lucide="trash-2"></i>Delete</button>' +
        '</div>' +
        '</article>';
    });
    wrap.innerHTML = html;
    icons();
  }

  // ---- builder sheet ----
  function addExRow(ex) {
    ex = ex || {};
    var rows = $('wkExRows');
    var row = document.createElement('div');
    row.className = 'wk-ex-row';
    row.innerHTML =
      '<input class="wk-row-name" type="text" placeholder="Exercise name" maxlength="60" value="' +
      esc(ex.name || '') +
      '" />' +
      '<button class="wk-row-del" type="button" aria-label="Remove exercise"><i data-lucide="x"></i></button>' +
      '<div class="wk-row-fields">' +
      '<input class="wk-row-mini wk-row-sets" type="text" inputmode="numeric" placeholder="Sets" maxlength="4" value="' +
      esc(ex.sets || '') +
      '" />' +
      '<input class="wk-row-mini wk-row-reps" type="text" inputmode="numeric" placeholder="Reps" maxlength="6" value="' +
      esc(ex.reps || '') +
      '" />' +
      '<input class="wk-row-mini wk-row-link" type="text" placeholder="Tutorial link" value="' +
      esc(ex.link || '') +
      '" />' +
      '</div>';
    row.querySelector('.wk-row-del').addEventListener('click', function () {
      row.remove();
    });
    rows.appendChild(row);
    icons();
  }

  function openSheet(id) {
    editingId = id || null;
    var rows = $('wkExRows');
    rows.innerHTML = '';
    if (id) {
      var w = load().filter(function (x) {
        return x.id === id;
      })[0];
      $('wkSheetTitle').textContent = 'Edit Workout';
      $('wkName').value = w ? w.name || '' : '';
      $('wkNote').value = w ? w.note || '' : '';
      var exs = (w && w.exercises) || [];
      if (exs.length) exs.forEach(addExRow);
      else addExRow();
    } else {
      $('wkSheetTitle').textContent = 'New Workout';
      $('wkName').value = '';
      $('wkNote').value = '';
      addExRow();
    }
    $('wkBackdrop').hidden = false;
    $('wkSheet').hidden = false;
  }
  function closeSheet() {
    $('wkBackdrop').hidden = true;
    $('wkSheet').hidden = true;
    editingId = null;
  }

  function collectExercises() {
    var out = [];
    var rows = $('wkExRows').querySelectorAll('.wk-ex-row');
    rows.forEach(function (r) {
      var name = r.querySelector('.wk-row-name').value.trim();
      var sets = r.querySelector('.wk-row-sets').value.trim();
      var reps = r.querySelector('.wk-row-reps').value.trim();
      var link = normalizeUrl(r.querySelector('.wk-row-link').value);
      if (name) out.push({ name: name, sets: sets, reps: reps, link: link });
    });
    return out;
  }

  function saveWorkout() {
    var name = $('wkName').value.trim();
    if (!name) {
      toast('Give your workout a name');
      $('wkName').focus();
      return;
    }
    var note = $('wkNote').value.trim();
    var exercises = collectExercises();
    var list = load();
    if (editingId) {
      list = list.map(function (w) {
        if (w.id === editingId) {
          w.name = name;
          w.note = note;
          w.exercises = exercises;
        }
        return w;
      });
    } else {
      list.unshift({
        id: uid(),
        name: name,
        note: note,
        exercises: exercises,
        scheduled: [],
        created: Date.now(),
      });
    }
    save(list);
    closeSheet();
    render();
    toast(editingId ? 'Workout updated' : 'Workout saved');
  }

  // ---- schedule sheet ----
  var WK_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function weekdayLabel(days) {
    if (!days || !days.length) return '';
    var s = days.slice().sort(function (a, b) {
      return a - b;
    });
    return s
      .map(function (d) {
        return WK_DOW[d];
      })
      .join(', ');
  }
  var schedMode = 'once';
  var schedDays = [];
  function setSchedMode(mode) {
    schedMode = mode;
    Array.prototype.forEach.call(
      document.querySelectorAll('#wkSchedMode .wk-mode-btn'),
      function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-mode') === mode);
      }
    );
    $('wkPaneOnce').hidden = mode !== 'once';
    $('wkPaneWeekly').hidden = mode !== 'weekly';
  }
  function toggleSchedDay(d) {
    var i = schedDays.indexOf(d);
    if (i >= 0) schedDays.splice(i, 1);
    else schedDays.push(d);
    Array.prototype.forEach.call(
      document.querySelectorAll('#wkSchedDays .wk-day'),
      function (b) {
        var dv = parseInt(b.getAttribute('data-day'), 10);
        b.classList.toggle('is-on', schedDays.indexOf(dv) >= 0);
      }
    );
  }
  function openSched(id) {
    schedId = id;
    var w = load().filter(function (x) {
      return x.id === id;
    })[0];
    $('wkSchedName').textContent = w ? w.name || 'Workout' : 'Workout';
    $('wkSchedDate').value = todayYMD();
    $('wkSchedTime').value = '';
    schedDays = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('#wkSchedDays .wk-day'),
      function (b) {
        b.classList.remove('is-on');
      }
    );
    setSchedMode('once');
    $('wkSchedBackdrop').hidden = false;
    $('wkSchedSheet').hidden = false;
  }
  function closeSched() {
    $('wkSchedBackdrop').hidden = true;
    $('wkSchedSheet').hidden = true;
    schedId = null;
  }
  function confirmSched() {
    var w = load().filter(function (x) {
      return x.id === schedId;
    })[0];
    if (!w) {
      closeSched();
      return;
    }
    var time = $('wkSchedTime').value || '';
    var date = $('wkSchedDate').value;
    if (schedMode === 'once' && !date) {
      toast('Pick a date first');
      return;
    }
    if (schedMode === 'weekly' && schedDays.length === 0) {
      toast('Pick at least one day');
      return;
    }
    // build a calendar entry
    var exCount = (w.exercises || []).length;
    var notesParts = (w.exercises || []).map(function (ex) {
      var sr = [];
      if (ex.sets) sr.push(ex.sets + 'x');
      if (ex.reps) sr.push(ex.reps);
      return ex.name + (sr.length ? ' (' + sr.join(' ') + ')' : '');
    });
    var entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: '🏋️ ' + w.name,
      color: '#6F4E37',
      notes: notesParts.join(', '),
      source: 'workout',
      workoutId: w.id,
    };
    var tag;
    if (schedMode === 'weekly') {
      entry.type = 'commitment';
      entry.days = schedDays.slice();
      entry.start = time;
      entry.end = '';
      tag = 'weekly';
    } else {
      entry.type = 'task';
      entry.date = date;
      entry.time = time;
      entry.priority = 'medium';
      tag = date;
    }
    var cal = loadCal();
    cal.push(entry);
    saveCal(cal);
    // record on the workout
    var list = load().map(function (x) {
      if (x.id === schedId) {
        x.scheduled = x.scheduled || [];
        x.scheduled.push(tag);
      }
      return x;
    });
    save(list);
    closeSched();
    render();
    if (schedMode === 'weekly') {
      toast('Scheduled ' + weekdayLabel(schedDays));
    } else {
      toast('Added to ' + fmtDateLabel(date));
    }
  }

  // ---- custom confirm ----
  var pendingDel = null;
  function askDelete(id) {
    pendingDel = id;
    var w = load().filter(function (x) {
      return x.id === id;
    })[0];
    $('wkConfirmMsg').textContent =
      'Remove "' + (w ? w.name : 'this workout') + '"? This can\'t be undone.';
    $('wkConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('wkConfirmWrap').hidden = true;
    pendingDel = null;
  }
  function doDelete() {
    if (!pendingDel) {
      closeConfirm();
      return;
    }
    var list = load().filter(function (x) {
      return x.id !== pendingDel;
    });
    save(list);
    closeConfirm();
    render();
    toast('Workout removed');
  }

  // ---- toast ----
  var toastTimer = null;
  function toast(msg) {
    var t = $('wkToast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.hidden = true;
    }, 1800);
  }

  // ---- wire ----
  function toggleCard(card) {
    if (!card) return;
    var wrap = card.querySelector('.wk-ex-wrap');
    if (!wrap) return;
    var isOpen = !wrap.hasAttribute('hidden');
    if (isOpen) {
      wrap.setAttribute('hidden', '');
      card.classList.remove('open');
    } else {
      wrap.removeAttribute('hidden');
      card.classList.add('open');
    }
  }

  function wire() {
    $('wkFab').addEventListener('click', function () {
      openSheet(null);
    });
    $('wkSheetClose').addEventListener('click', closeSheet);
    $('wkCancel').addEventListener('click', closeSheet);
    $('wkBackdrop').addEventListener('click', closeSheet);
    $('wkSave').addEventListener('click', saveWorkout);
    $('wkAddEx').addEventListener('click', function () {
      addExRow();
    });

    $('wkSchedClose').addEventListener('click', closeSched);
    $('wkSchedCancel').addEventListener('click', closeSched);
    $('wkSchedBackdrop').addEventListener('click', closeSched);
    $('wkSchedConfirm').addEventListener('click', confirmSched);

    $('wkSchedMode').addEventListener('click', function (e) {
      var b = e.target.closest('.wk-mode-btn');
      if (b) setSchedMode(b.getAttribute('data-mode'));
    });
    $('wkSchedDays').addEventListener('click', function (e) {
      var b = e.target.closest('.wk-day');
      if (b) toggleSchedDay(parseInt(b.getAttribute('data-day'), 10));
    });

    $('wkConfirmNo').addEventListener('click', closeConfirm);
    $('wkConfirmYes').addEventListener('click', doDelete);

    // list delegation
    $('wkList').addEventListener('click', function (e) {
      var link = e.target.closest('.wk-ex-link');
      if (link) return; // let link work
      var topEl = e.target.closest('.wk-card-top');
      if (topEl && !e.target.closest('[data-act]')) {
        var c0 = e.target.closest('.wk-card');
        if (c0) {
          toggleCard(c0);
        }
        return;
      }
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var card = e.target.closest('.wk-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'toggle') {
        toggleCard(card);
        return;
      }
      if (act === 'sched') openSched(id);
      else if (act === 'edit') openSheet(id);
      else if (act === 'del') askDelete(id);
    });

    // bottom nav
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () {
        var tab = n.getAttribute('data-tab');
        var map = {
          home: 'index.html',
          planner: 'planner.html',
          wallet: 'wallet.html',
          fitness: 'wellness.html',
          mindset: 'mindset.html',
        };
        if (map[tab]) window.location.href = map[tab];
      });
    });
  }

  function init() {
    setDateChip();
    wire();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* end */
