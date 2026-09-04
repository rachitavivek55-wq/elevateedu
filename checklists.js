(function () {
  'use strict';

  var KEY = 'elevate_checklists';
  var MAX_HISTORY = 6;

  /* ---------- Date helpers ---------- */
  function now() {
    return Date.now();
  }
  function startOfDay(ts) {
    var d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function startOfWeek(ts) {
    var d = new Date(startOfDay(ts));
    var day = d.getDay(); // 0 Sun .. 6 Sat
    var diff = (day + 6) % 7; // make Monday the first day
    d.setDate(d.getDate() - diff);
    return d.getTime();
  }
  function startOfMonth(ts) {
    var d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  var DAY_MS = 86400000;

  // Returns the timestamp of the current cycle's start for a given list.
  function cycleStart(list, ts) {
    var reset = list.reset;
    if (reset === 'never') return list.created || 0;
    if (reset === 'daily') return startOfDay(ts);
    if (reset === 'weekly') return startOfWeek(ts);
    if (reset === 'monthly') return startOfMonth(ts);
    if (reset === 'custom') {
      var num = Math.max(1, list.customNum || 1);
      var unit = list.customUnit || 'days';
      var anchor = list.anchor || startOfDay(list.created || ts);
      if (unit === 'days') {
        var periods = Math.floor(
          (startOfDay(ts) - startOfDay(anchor)) / (DAY_MS * num)
        );
        return startOfDay(anchor) + periods * DAY_MS * num;
      }
      if (unit === 'weeks') {
        var span = DAY_MS * 7 * num;
        var p = Math.floor((startOfDay(ts) - startOfDay(anchor)) / span);
        return startOfDay(anchor) + p * span;
      }
      if (unit === 'months') {
        var a = new Date(startOfMonth(anchor));
        var monthsDiff =
          (new Date(ts).getFullYear() - a.getFullYear()) * 12 +
          (new Date(ts).getMonth() - a.getMonth());
        var cycles = Math.floor(monthsDiff / num);
        var res = new Date(a.getFullYear(), a.getMonth() + cycles * num, 1);
        return res.getTime();
      }
    }
    return startOfDay(ts);
  }

  function resetLabel(list) {
    switch (list.reset) {
      case 'daily':
        return 'Resets daily';
      case 'weekly':
        return 'Resets weekly';
      case 'monthly':
        return 'Resets monthly';
      case 'never':
        return 'No reset';
      case 'custom':
        var n = list.customNum || 1;
        var u = list.customUnit || 'days';
        var uu = n === 1 ? u.replace(/s$/, '') : u;
        return 'Resets every ' + n + ' ' + uu;
      default:
        return '';
    }
  }

  function cycleLabel(list, ts) {
    var start = cycleStart(list, ts);
    var d = new Date(start);
    var mon = [
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
    if (list.reset === 'monthly')
      return mon[d.getMonth()] + ' ' + d.getFullYear();
    if (list.reset === 'never') return 'All time';
    return mon[d.getMonth()] + ' ' + d.getDate();
  }

  /* ---------- Storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { lists: [] };
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.lists)) return { lists: [] };
      return data;
    } catch (e) {
      return { lists: [] };
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = load();
  var currentId = null;

  function uid() {
    return (
      'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    );
  }
  function getList(id) {
    for (var i = 0; i < state.lists.length; i++) {
      if (state.lists[i].id === id) return state.lists[i];
    }
    return null;
  }

  /* ---------- Reset logic ---------- */
  // On load / open, if the current cycle start moved past the list's lastReset,
  // archive the finished cycle's score into history and uncheck all tasks.
  function applyResets() {
    var ts = now();
    var changed = false;
    state.lists.forEach(function (list) {
      if (list.reset === 'never') return;
      var cur = cycleStart(list, ts);
      if (list.lastReset == null) {
        list.lastReset = cur;
        changed = true;
        return;
      }
      if (cur > list.lastReset) {
        // Archive the completed cycle score before wiping.
        var done = 0;
        var total = list.tasks.length;
        list.tasks.forEach(function (t) {
          if (t.done) done++;
        });
        if (total > 0) {
          list.history = list.history || [];
          list.history.unshift({
            label: cycleLabel(list, list.lastReset),
            done: done,
            total: total,
          });
          if (list.history.length > MAX_HISTORY)
            list.history.length = MAX_HISTORY;
        }
        list.tasks.forEach(function (t) {
          t.done = false;
        });
        list.lastReset = cur;
        changed = true;
      }
    });
    if (changed) save();
  }

  /* ---------- DOM refs ---------- */
  var el = {};
  [
    'ckListView',
    'ckLists',
    'ckEmpty',
    'ckAddBtn',
    'ckDetailView',
    'ckBackLink',
    'ckDetailTitle',
    'ckDetailMeta',
    'ckEditBtn',
    'ckProgressFill',
    'ckProgressText',
    'ckTasks',
    'ckTasksEmpty',
    'ckAddTaskForm',
    'ckTaskInput',
    'ckHistory',
    'ckHistoryRows',
    'ckSheetBackdrop',
    'ckSheet',
    'ckSheetTitle',
    'ckNameInput',
    'ckResetOpts',
    'ckCustomField',
    'ckCustomNum',
    'ckCustomUnit',
    'ckDeleteBtn',
    'ckCancelBtn',
    'ckSaveBtn',
    'ckConfirmBackdrop',
    'ckConfirm',
    'ckConfirmMsg',
    'ckConfirmNo',
    'ckConfirmYes',
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  function icons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  /* ---------- Rendering ---------- */
  function counts(list) {
    var done = 0;
    list.tasks.forEach(function (t) {
      if (t.done) done++;
    });
    return { done: done, total: list.tasks.length };
  }

  function renderLists() {
    el.ckLists.innerHTML = '';
    if (state.lists.length === 0) {
      el.ckEmpty.hidden = false;
    } else {
      el.ckEmpty.hidden = true;
    }
    state.lists.forEach(function (list) {
      var c = counts(list);
      var pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
      var card = document.createElement('div');
      card.className = 'ck-list-card';
      card.setAttribute('data-id', list.id);
      card.innerHTML =
        '<div class="ck-list-card-top">' +
        '<h3 class="ck-list-name"></h3>' +
        '<span class="ck-badge"><i data-lucide="rotate-ccw"></i><span class="ck-badge-txt"></span></span>' +
        '</div>' +
        '<div class="ck-list-foot">' +
        '<div class="ck-mini-progress"><span style="width:' +
        pct +
        '%"></span></div>' +
        '<p class="ck-list-sub"></p>' +
        '</div>';
      card.querySelector('.ck-list-name').textContent = list.name;
      card.querySelector('.ck-badge-txt').textContent = resetShort(list);
      card.querySelector('.ck-list-sub').textContent =
        c.total === 0 ? 'No tasks yet' : c.done + ' of ' + c.total + ' done';
      card.addEventListener('click', function () {
        openDetail(list.id);
      });
      el.ckLists.appendChild(card);
    });
    icons();
  }

  function resetShort(list) {
    switch (list.reset) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'never':
        return 'Never';
      case 'custom':
        var n = list.customNum || 1;
        var u = list.customUnit || 'days';
        return n + (u === 'days' ? 'd' : u === 'weeks' ? 'w' : 'mo');
      default:
        return '';
    }
  }

  function renderDetail() {
    var list = getList(currentId);
    if (!list) {
      showLists();
      return;
    }
    el.ckDetailTitle.textContent = list.name;
    el.ckDetailMeta.textContent =
      resetLabel(list) + ' · ' + cycleLabel(list, now());
    var c = counts(list);
    var pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
    el.ckProgressFill.style.width = pct + '%';
    el.ckProgressText.textContent = c.done + ' / ' + c.total;

    el.ckTasks.innerHTML = '';
    el.ckTasksEmpty.hidden = list.tasks.length !== 0;
    list.tasks.forEach(function (task) {
      var row = document.createElement('div');
      row.className = 'ck-task' + (task.done ? ' is-done' : '');
      row.innerHTML =
        '<span class="ck-check"><i data-lucide="check"></i></span>' +
        '<span class="ck-task-label"></span>' +
        '<button class="ck-task-del" title="Remove task"><i data-lucide="x"></i></button>';
      row.querySelector('.ck-task-label').textContent = task.text;
      row.addEventListener('click', function (ev) {
        if (ev.target.closest('.ck-task-del')) return;
        task.done = !task.done;
        save();
        renderDetail();
      });
      row
        .querySelector('.ck-task-del')
        .addEventListener('click', function (ev) {
          ev.stopPropagation();
          list.tasks = list.tasks.filter(function (t) {
            return t.id !== task.id;
          });
          save();
          renderDetail();
        });
      el.ckTasks.appendChild(row);
    });

    // History
    var hist = list.history || [];
    if (hist.length === 0) {
      el.ckHistory.hidden = true;
    } else {
      el.ckHistory.hidden = false;
      el.ckHistoryRows.innerHTML = '';
      hist.forEach(function (h) {
        var r = document.createElement('div');
        r.className = 'ck-history-row';
        var left = document.createElement('span');
        left.textContent = h.label;
        var right = document.createElement('span');
        right.className = 'ck-hr-score';
        right.textContent = h.done + ' / ' + h.total + ' completed';
        r.appendChild(left);
        r.appendChild(right);
        el.ckHistoryRows.appendChild(r);
      });
    }
    icons();
  }

  /* ---------- View switching ---------- */
  /* The opening explanation belongs to the overview. Inside a checklist it
     only pushes the list down, so it steps aside there. */
  function showIntro(on) {
    var p = document.querySelector('.ck-intro');
    if (p) p.hidden = !on;
  }
  function showLists() {
    currentId = null;
    el.ckDetailView.hidden = true;
    el.ckListView.hidden = false;
    showIntro(true);
    renderLists();
  }
  function openDetail(id) {
    currentId = id;
    el.ckListView.hidden = true;
    el.ckDetailView.hidden = false;
    showIntro(false);
    renderDetail();
  }

  /* ---------- Sheet (create / edit) ---------- */
  var sheetMode = 'create';
  var sheetReset = 'daily';

  function setSheetReset(val) {
    sheetReset = val;
    Array.prototype.forEach.call(el.ckResetOpts.children, function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-reset') === val);
    });
    el.ckCustomField.hidden = val !== 'custom';
  }

  function openSheet(mode) {
    sheetMode = mode;
    el.ckSheetBackdrop.hidden = false;
    el.ckSheet.hidden = false;
    if (mode === 'create') {
      el.ckSheetTitle.textContent = 'New checklist';
      el.ckNameInput.value = '';
      el.ckCustomNum.value = '3';
      el.ckCustomUnit.value = 'days';
      setSheetReset('daily');
      el.ckDeleteBtn.hidden = true;
    } else {
      var list = getList(currentId);
      if (!list) {
        closeSheet();
        return;
      }
      el.ckSheetTitle.textContent = 'Edit checklist';
      el.ckNameInput.value = list.name;
      el.ckCustomNum.value = list.customNum || 3;
      el.ckCustomUnit.value = list.customUnit || 'days';
      setSheetReset(list.reset);
      el.ckDeleteBtn.hidden = false;
    }
    icons();
    setTimeout(function () {
      el.ckNameInput.focus();
    }, 50);
  }
  function closeSheet() {
    el.ckSheetBackdrop.hidden = true;
    el.ckSheet.hidden = true;
  }

  function saveSheet() {
    var name = (el.ckNameInput.value || '').trim();
    if (!name) {
      el.ckNameInput.focus();
      return;
    }
    var customNum = Math.max(
      1,
      Math.min(365, parseInt(el.ckCustomNum.value, 10) || 1)
    );
    var customUnit = el.ckCustomUnit.value;
    if (sheetMode === 'create') {
      var list = {
        id: uid(),
        name: name,
        reset: sheetReset,
        customNum: customNum,
        customUnit: customUnit,
        created: now(),
        anchor: startOfDay(now()),
        lastReset: null,
        tasks: [],
        history: [],
      };
      list.lastReset = cycleStart(list, now());
      state.lists.push(list);
      save();
      closeSheet();
      openDetail(list.id);
    } else {
      var l = getList(currentId);
      if (l) {
        l.name = name;
        l.reset = sheetReset;
        l.customNum = customNum;
        l.customUnit = customUnit;
        if (sheetReset === 'custom' && !l.anchor) l.anchor = startOfDay(now());
        l.lastReset = cycleStart(l, now());
        save();
      }
      closeSheet();
      renderDetail();
    }
  }

  /* ---------- Confirm overlay ---------- */
  var confirmCb = null;
  function askConfirm(msg, cb) {
    el.ckConfirmMsg.textContent = msg;
    confirmCb = cb;
    el.ckConfirmBackdrop.hidden = false;
    el.ckConfirm.hidden = false;
  }
  function closeConfirm() {
    el.ckConfirmBackdrop.hidden = true;
    el.ckConfirm.hidden = true;
    confirmCb = null;
  }

  /* ---------- Events ---------- */
  el.ckAddBtn.addEventListener('click', function () {
    openSheet('create');
  });
  el.ckBackLink.addEventListener('click', showLists);
  el.ckEditBtn.addEventListener('click', function () {
    openSheet('edit');
  });
  el.ckCancelBtn.addEventListener('click', closeSheet);
  el.ckSheetBackdrop.addEventListener('click', closeSheet);
  el.ckSaveBtn.addEventListener('click', saveSheet);

  Array.prototype.forEach.call(el.ckResetOpts.children, function (b) {
    b.addEventListener('click', function () {
      setSheetReset(b.getAttribute('data-reset'));
    });
  });

  el.ckDeleteBtn.addEventListener('click', function () {
    var l = getList(currentId);
    if (!l) return;
    closeSheet();
    askConfirm(
      'Delete "' + l.name + '"? This removes all its tasks and history.',
      function () {
        state.lists = state.lists.filter(function (x) {
          return x.id !== currentId;
        });
        save();
        showLists();
      }
    );
  });

  el.ckConfirmNo.addEventListener('click', closeConfirm);
  el.ckConfirmBackdrop.addEventListener('click', closeConfirm);
  el.ckConfirmYes.addEventListener('click', function () {
    var cb = confirmCb;
    closeConfirm();
    if (cb) cb();
  });

  el.ckAddTaskForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var list = getList(currentId);
    if (!list) return;
    var text = (el.ckTaskInput.value || '').trim();
    if (!text) return;
    list.tasks.push({ id: uid(), text: text, done: false });
    el.ckTaskInput.value = '';
    save();
    renderDetail();
    el.ckTaskInput.focus();
  });

  /* ---------- Date chip ---------- */
  (function setDate() {
    var d = new Date();
    var mon = [
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
    var dd = document.getElementById('dateDay');
    var dm = document.getElementById('dateMonth');
    if (dd) dd.textContent = d.getDate();
    if (dm) dm.textContent = mon[d.getMonth()];
  })();

  /* ---------- Init ---------- */
  applyResets();
  showLists();
  icons();
})();
