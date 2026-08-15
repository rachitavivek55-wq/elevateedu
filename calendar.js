// ===== ElevateEdu Calendar engine =====
(function () {
  const STORE_KEY = 'elevate_calendar_entries';
  const PREFS_KEY = 'elevate_calendar_prefs';
  let startMin = 360;
  let endMin = 1320;
  let dayStart = 6;
  let dayEnd = 22;
  function deriveHours() {
    if (endMin <= startMin) endMin = Math.min(1439, startMin + 60);
    dayStart = Math.floor(startMin / 60);
    dayEnd = Math.floor(endMin / 60);
    if (dayEnd < dayStart) dayEnd = dayStart;
  }
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
      if (typeof p.startMin === 'number') startMin = p.startMin;
      else if (typeof p.dayStart === 'number') startMin = p.dayStart * 60;
      if (typeof p.endMin === 'number') endMin = p.endMin;
      else if (typeof p.dayEnd === 'number') endMin = p.dayEnd * 60;
    } catch (e) {}
    deriveHours();
  }
  function savePrefs() {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ startMin: startMin, endMin: endMin })
    );
  }
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const MONTHS_SHORT = [
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

  let entries = load();
  let view = 'week';
  let cursor = new Date();
  let selectedColor = '#6F4E37';
  let selectedDays = [];
  let currentType = 'commitment';

  // ---------- storage ----------
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  }

  // ---------- date helpers ----------
  function startOfWeek(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function ymd(d) {
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }
  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ap;
  }

  // Return entries that occur on a given date
  function entriesOn(date) {
    const key = ymd(date);
    const dow = date.getDay();
    return entries.filter((e) => {
      if (e.type === 'commitment') return e.days && e.days.includes(dow);
      return e.date === key;
    });
  }

  // ---------- rendering ----------
  const calBody = document.getElementById('calBody');
  const periodLabel = document.getElementById('calPeriod');

  function render() {
    if (view === 'day') renderTimeGrid(1);
    else if (view === 'week') renderTimeGrid(7);
    else if (view === 'month') renderMonth();
    else renderYear();
    if (window.lucide) window.lucide.createIcons();
    // Only surface the "Today" indicator when the current period actually contains today
    var __todayBtn = document.getElementById('calToday');
    if (__todayBtn) {
      var __now = new Date();
      var __inPeriod = false;
      if (view === 'week') {
        var __ws = startOfWeek(cursor);
        var __we = addDays(__ws, 7);
        __inPeriod = __now >= __ws && __now < __we;
      } else if (view === 'day') {
        __inPeriod = sameDay(cursor, __now);
      } else if (view === 'month') {
        __inPeriod =
          cursor.getFullYear() === __now.getFullYear() &&
          cursor.getMonth() === __now.getMonth();
      } else if (view === 'year') {
        __inPeriod = cursor.getFullYear() === __now.getFullYear();
      }
      __todayBtn.style.display = __inPeriod ? '' : 'none';
    }
  }

  function renderTimeGrid(dayCount) {
    const start =
      dayCount === 7
        ? startOfWeek(cursor)
        : new Date(cursor.setHours(0, 0, 0, 0));
    const startDate = dayCount === 7 ? start : new Date(cursor);
    const days = [];
    for (let i = 0; i < dayCount; i++) days.push(addDays(startDate, i));
    const today = new Date();

    // period label
    if (dayCount === 7) {
      const end = addDays(startDate, 6);
      periodLabel.textContent =
        MONTHS_SHORT[startDate.getMonth()] +
        ' ' +
        startDate.getDate() +
        ' – ' +
        MONTHS_SHORT[end.getMonth()] +
        ' ' +
        end.getDate();
    } else {
      periodLabel.textContent =
        DOW[startDate.getDay()] +
        ', ' +
        MONTHS_SHORT[startDate.getMonth()] +
        ' ' +
        startDate.getDate();
    }

    let html = '<div class="cal-grid">';
    html +=
      '<div class="cal-weekhead' + (dayCount === 1 ? ' day-head' : '') + '">';
    html += '<div class="cal-dayname"></div>';
    days.forEach((d) => {
      html +=
        '<div class="cal-dayname' +
        (sameDay(d, today) ? ' is-today' : '') +
        '">' +
        DOW[d.getDay()] +
        '<span class="dn-num">' +
        d.getDate() +
        '</span></div>';
    });
    html += '</div>';

    html +=
      '<div class="cal-timegrid' + (dayCount === 1 ? ' day-grid' : '') + '">';
    for (let h = dayStart; h <= dayEnd; h++) {
      const ap = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 || 12;
      html += '<div class="cal-hourlabel">' + hh + ap + '</div>';
      days.forEach((d) => {
        html +=
          '<div class="cal-cell" data-date="' +
          ymd(d) +
          '" data-hour="' +
          h +
          '"></div>';
      });
    }
    html += '</div></div>';
    calBody.innerHTML = html;

    // place timed events (exact minute placement + side-by-side overlap layout)
  days.forEach((d, col) => {
    layoutDay(entriesOn(d)).forEach((it) => {
      placeEvent(it.e, d, col, dayCount, it.startMin, it.endMin, it.lane, it.lanes, it.capMin);
    });
  });
  }

  // Parse "HH:MM" -> minutes since midnight (null if absent/invalid)
  function toMin(t) {
    if (!t) return null;
    var p = String(t).split(':');
    var h = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    if (isNaN(h)) return null;
    if (isNaN(m)) m = 0;
    return h * 60 + m;
  }

  // Build a placement layout for one day's entries.
  // Assigns each timed entry a start/end minute plus a lane so that
  // events that truly overlap in time are split side-by-side, while
  // back-to-back events (end === next start) each keep the full width.
  function layoutDay(list) {
    var items = [];
    list.forEach(function (e) {
      var s = toMin(e.start || e.time);
      if (s === null) return; // untimed entries are not placed on the grid
      var en = toMin(e.end);
      if (en === null || en <= s) en = s + 30; // default 30-min block
      items.push({ e: e, startMin: s, endMin: en, lane: 0, lanes: 1 });
    });
    items.sort(function (a, b) {
      return a.startMin - b.startMin || a.endMin - b.endMin;
    });
    // Cluster events that TRULY overlap in time. A strictly-less-than test
    // means touching endpoints (one ends exactly when the next starts) are
    // NOT overlapping, so back-to-back events each keep the full width.
    var i = 0;
    while (i < items.length) {
      var cluster = [items[i]];
      var clusterEnd = items[i].endMin;
      var j = i + 1;
      while (j < items.length && items[j].startMin < clusterEnd) {
        cluster.push(items[j]);
        if (items[j].endMin > clusterEnd) clusterEnd = items[j].endMin;
        j++;
      }
      // greedy lane assignment within the overlapping cluster
      var laneEnds = [];
      cluster.forEach(function (it) {
        var placed = false;
        for (var k = 0; k < laneEnds.length; k++) {
          if (it.startMin >= laneEnds[k]) {
            it.lane = k;
            laneEnds[k] = it.endMin;
            placed = true;
            break;
          }
        }
        if (!placed) {
          it.lane = laneEnds.length;
          laneEnds.push(it.endMin);
        }
      });
      var lanes = laneEnds.length;
      cluster.forEach(function (it) { it.lanes = lanes; });
      i = j;
    }
    // For each event, find where the NEXT event in the same lane starts, so a
    // chip can never visually extend into a following back-to-back event.
    items.forEach(function (it) {
      var nextStart = Infinity;
      items.forEach(function (o) {
        if (o !== it && o.lane === it.lane && o.startMin >= it.endMin &&
            o.startMin < nextStart) {
          nextStart = o.startMin;
        }
      });
      it.capMin = nextStart; // Infinity when nothing follows in this lane
    });
    return items;
  }

  function placeEvent(e, date, col, dayCount, startMin, endMin, lane, lanes, capMin) {
    var grid = calBody.querySelector('.cal-timegrid');
    if (!grid) return;
    var gridStartMin = dayStart * 60;
    var gridEndMin = (dayEnd + 1) * 60; // dayEnd is the last labelled hour row
    // clamp to the visible window so nothing renders off-grid
    var s = Math.max(startMin, gridStartMin);
    var en = Math.min(endMin, gridEndMin);
    if (en <= s) en = Math.min(s + 22, gridEndMin);
    // anchor to the first hour cell of this column so absolute px math is exact
    var anchor = grid.querySelector(
      '.cal-cell[data-date="' + ymd(date) + '"][data-hour="' + dayStart + '"]'
    );
    if (!anchor) return;
    var PX_PER_MIN = 46 / 60;
    var top = (s - gridStartMin) * PX_PER_MIN;
    var height = Math.max(6, (en - s) * PX_PER_MIN - 3);
    // never let a chip reach into a following same-lane event (keeps a 1px gap)
    if (capMin !== undefined && capMin !== Infinity) {
      var maxH = (capMin - s) * PX_PER_MIN - 1;
      if (maxH < 2) maxH = 2;
      if (height > maxH) height = maxH;
    }
    var chip = document.createElement('div');
    chip.className = 'cal-event';
    chip.style.background = e.color || '#6F4E37';
    chip.style.top = top + 'px';
    chip.style.height = height + 'px';
    // side-by-side layout for overlapping events (3px gutter each side kept)
    if (lanes > 1) {
      var gutter = 3;
      var span = 100 / lanes;
      chip.style.left = 'calc(' + (span * lane) + '% + ' + gutter + 'px)';
      chip.style.right = 'auto';
      chip.style.width = 'calc(' + span + '% - ' + (gutter * 2) + 'px)';
    }
    var timeStr = e.start ? fmtTime(e.start) : e.time ? fmtTime(e.time) : '';
    chip.innerHTML =
      '<span class="ev-time">' + timeStr + '</span>' + escapeHtml(e.title);
    chip.title = e.title + (e.notes ? ' — ' + e.notes : '');
    chip.addEventListener('click', function () { removePrompt(e); });
    anchor.appendChild(chip);
  }

    function renderMonth() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    periodLabel.textContent = MONTHS[month] + ' ' + year;
    const first = new Date(year, month, 1);
    const gridStart = addDays(first, -first.getDay());
    const today = new Date();

    let html = '<div class="cal-month">';
    DOW.forEach((n) => {
      html += '<div class="m-dayname">' + n + '</div>';
    });
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const other = d.getMonth() !== month;
      const evs = entriesOn(d).slice(0, 3);
      const extra = entriesOn(d).length - evs.length;
      html +=
        '<div class="cal-mcell' +
        (other ? ' is-other' : '') +
        (sameDay(d, today) ? ' is-today' : '') +
        '">';
      html += '<span class="m-num">' + d.getDate() + '</span>';
      evs.forEach((e) => {
        html +=
          '<span class="cal-dot" style="background:' +
          (e.color || '#6F4E37') +
          '"></span>';
      });
      if (extra > 0) html += '<span class="m-more">+' + extra + '</span>';
      html += '</div>';
    }
    html += '</div>';
    calBody.innerHTML = html;
    // Make month-view days clickable: jump to that day in Day view
    var __cells = calBody.querySelectorAll('.cal-mcell');
    __cells.forEach(function (cellEl, idx) {
      var __d = addDays(gridStart, idx);
      cellEl.style.cursor = 'pointer';
      cellEl.addEventListener('click', function () {
        cursor = new Date(__d.getFullYear(), __d.getMonth(), __d.getDate());
        setView('day');
      });
    });
  }

  function renderYear() {
    const year = cursor.getFullYear();
    periodLabel.textContent = String(year);
    const today = new Date();
    let html = '<div class="cal-year">';
    for (let m = 0; m < 12; m++) {
      html +=
        '<div class="cal-ymonth" data-month="' +
        m +
        '"><h4>' +
        MONTHS_SHORT[m] +
        '</h4><div class="cal-ygrid">';
      const first = new Date(year, m, 1);
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, m, d);
        const has = entriesOn(date).length > 0;
        const isToday = sameDay(date, today);
        html +=
          '<span class="' +
          (has ? 'has-ev' : '') +
          (isToday ? ' y-today' : '') +
          '">' +
          d +
          '</span>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    calBody.innerHTML = html;
    calBody.querySelectorAll('.cal-ymonth').forEach((el) => {
      el.addEventListener('click', () => {
        cursor = new Date(year, Number(el.dataset.month), 1);
        setView('month');
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
    );
  }

  // ---------- navigation ----------
  function setView(v) {
    view = v;
    document
      .querySelectorAll('.cal-view-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    render();
  }
  function shift(dir) {
    if (view === 'day') cursor = addDays(cursor, dir);
    else if (view === 'week') cursor = addDays(cursor, dir * 7);
    else if (view === 'month')
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    else cursor = new Date(cursor.getFullYear() + dir, cursor.getMonth(), 1);
    render();
  }

  document.querySelectorAll('.cal-view-btn').forEach((b) => {
    b.addEventListener('click', () => setView(b.dataset.view));
  });
  document.getElementById('calPrev').addEventListener('click', () => shift(-1));
  document.getElementById('calNext').addEventListener('click', () => shift(1));
  document.getElementById('calToday').addEventListener('click', () => {
    cursor = new Date();
    render();
  });

  // ---------- modal ----------
  const backdrop = document.getElementById('calBackdrop');
  const form = document.getElementById('calForm');
  const modalTitle = document.getElementById('calModalTitle');

  function openModal() {
    resetForm();
    backdrop.hidden = false;
    if (window.lucide) window.lucide.createIcons();
  }
  function closeModal() {
    backdrop.hidden = true;
  }

  function resetForm() {
    form.reset();
    setType('commitment');
    selectedColor = '#6F4E37';
    selectedDays = [];
    document
      .querySelectorAll('.cal-swatch')
      .forEach((s) =>
        s.classList.toggle('on', s.dataset.color === selectedColor)
      );
    document
      .querySelectorAll('.cal-day-pick')
      .forEach((d) => d.classList.remove('on'));
    document.getElementById('fColor').value = '#6F4E37';
    document.getElementById('fDate').value = ymd(new Date());
  }

  function setType(type) {
    currentType = type;
    form.dataset.type = type;
    document
      .querySelectorAll('.cal-type-tab')
      .forEach((t) => t.classList.toggle('active', t.dataset.type === type));
    const dateLabel = document.getElementById('dateLabel');
    if (type === 'assignment') dateLabel.textContent = 'Due date';
    else if (type === 'exam') dateLabel.textContent = 'Exam date';
    else if (type === 'task') dateLabel.textContent = 'Date';
    modalTitle.textContent =
      'New ' + type.charAt(0).toUpperCase() + type.slice(1);
  }

  document.getElementById('calFab').addEventListener('click', openModal);
  document.getElementById('calClose').addEventListener('click', closeModal);
  document.getElementById('calCancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  document.querySelectorAll('.cal-type-tab').forEach((t) => {
    t.addEventListener('click', () => setType(t.dataset.type));
  });

  // color swatches
  document.querySelectorAll('.cal-swatch').forEach((s) => {
    s.addEventListener('click', () => {
      selectedColor = s.dataset.color;
      document
        .querySelectorAll('.cal-swatch')
        .forEach((x) => x.classList.remove('on'));
      s.classList.add('on');
      document.getElementById('fColor').value = selectedColor;
    });
  });
  // custom color wheel
  document.getElementById('fColor').addEventListener('input', (e) => {
    selectedColor = e.target.value;
    document
      .querySelectorAll('.cal-swatch')
      .forEach((x) => x.classList.remove('on'));
  });

  // day pickers
  document.querySelectorAll('.cal-day-pick').forEach((d) => {
    d.addEventListener('click', () => {
      const day = Number(d.dataset.day);
      if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter((x) => x !== day);
        d.classList.remove('on');
      } else {
        selectedDays.push(day);
        d.classList.add('on');
      }
    });
  });
  document.querySelectorAll('.cal-quick').forEach((q) => {
    q.addEventListener('click', () => {
      const kind = q.dataset.quick;
      if (kind === 'everyday') selectedDays = [0, 1, 2, 3, 4, 5, 6];
      else if (kind === 'weekdays') selectedDays = [1, 2, 3, 4, 5];
      else selectedDays = [];
      document.querySelectorAll('.cal-day-pick').forEach((d) => {
        d.classList.toggle('on', selectedDays.includes(Number(d.dataset.day)));
      });
    });
  });

  // submit
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = document.getElementById('fTitle').value.trim();
    if (!title) return;
    const entry = {
      id: Date.now(),
      type: currentType,
      title: title,
      color: selectedColor,
      notes: document.getElementById('fNotes').value.trim(),
    };
    if (currentType === 'commitment') {
      if (selectedDays.length === 0) {
        alert('Pick at least one day this repeats on.');
        return;
      }
      entry.days = selectedDays.slice();
      entry.start = document.getElementById('fStart').value;
      entry.end = document.getElementById('fEnd').value;
    } else {
      entry.date = document.getElementById('fDate').value;
      entry.time = document.getElementById('fTime').value;
      if (currentType === 'exam')
        entry.location = document.getElementById('fLocation').value.trim();
      if (currentType === 'assignment' || currentType === 'task')
        entry.priority = document.getElementById('fPriority').value;
    }
    entries.push(entry);
    save();
    closeModal();
    render();
  });

  function removePrompt(e) {
    if (confirm('Delete "' + e.title + '"?')) {
      entries = entries.filter((x) => x.id !== e.id);
      save();
      render();
    }
  }

  // ---------- hours settings ----------
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }
  function timeLabel(mins) {
    const h = Math.floor(mins / 60);
    const mm = mins % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return hh + ':' + pad2(mm) + ' ' + ap;
  }
  // generate the selectable minute-of-day values: :00, :15, :30, :45, :59 each hour
  function timeValues() {
    const arr = [];
    for (let h = 0; h < 24; h++) {
      [0, 15, 30, 45, 59].forEach(function (mm) {
        arr.push(h * 60 + mm);
      });
    }
    return arr;
  }
  function hourLabel(h) {
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return hh + ' ' + ap;
  }
  function minLabel(mm) {
    return ':' + pad2(mm);
  }
  function fillHourSelect(sel) {
    if (!sel) return;
    let o = '';
    for (let h = 0; h < 24; h++) {
      o += '<option value="' + h + '">' + hourLabel(h) + '</option>';
    }
    sel.innerHTML = o;
  }
  function fillMinSelect(sel) {
    if (!sel) return;
    let o = '';
    [0, 15, 30, 45].forEach(function (mm) {
      o += '<option value="' + mm + '">' + minLabel(mm) + '</option>';
    });
    sel.innerHTML = o;
  }
  function fillTimeSelect(sel, minVal, maxVal) {
    if (!sel) return;
    let o = '';
    timeValues().forEach(function (val) {
      if (val >= minVal && val <= maxVal) {
        o += '<option value="' + val + '">' + timeLabel(val) + '</option>';
      }
    });
    sel.innerHTML = o;
  }
  const setBackdrop = document.getElementById('calSetBackdrop');
  const setStartH = document.getElementById('calSetStartH');
  const setStartM = document.getElementById('calSetStartM');
  const setEndH = document.getElementById('calSetEndH');
  const setEndM = document.getElementById('calSetEndM');
  function openSettings() {
    fillHourSelect(setStartH);
    fillMinSelect(setStartM);
    fillHourSelect(setEndH);
    fillMinSelect(setEndM);
    setStartH.value = String(Math.floor(startMin / 60));
    setStartM.value = String(startMin % 60);
    setEndH.value = String(Math.floor(endMin / 60));
    setEndM.value = String(endMin % 60);
    setBackdrop.hidden = false;
  }
  function closeSettings() {
    setBackdrop.hidden = true;
  }
  function saveSettings() {
    let sh = parseInt(setStartH.value, 10);
    let sm = parseInt(setStartM.value, 10);
    let eh = parseInt(setEndH.value, 10);
    let em = parseInt(setEndM.value, 10);
    if (isNaN(sh)) sh = 6;
    if (isNaN(sm)) sm = 0;
    if (isNaN(eh)) eh = 22;
    if (isNaN(em)) em = 0;
    let s = sh * 60 + sm;
    let e = eh * 60 + em;
    if (e <= s) e = Math.min(1439, s + 60);
    startMin = s;
    endMin = e;
    deriveHours();
    savePrefs();
    render();
    closeSettings();
  }
  const setBtn = document.getElementById('calSettings');
  if (setBtn) setBtn.addEventListener('click', openSettings);

  const setCloseBtn = document.getElementById('calSetClose');
  if (setCloseBtn) setCloseBtn.addEventListener('click', closeSettings);
  const setCancelBtn = document.getElementById('calSetCancel');
  if (setCancelBtn) setCancelBtn.addEventListener('click', closeSettings);
  const setSaveBtn = document.getElementById('calSetSave');
  if (setSaveBtn) setSaveBtn.addEventListener('click', saveSettings);
  if (setBackdrop)
    setBackdrop.addEventListener('click', function (ev) {
      if (ev.target === setBackdrop) closeSettings();
    });

  // init
  loadPrefs();
  render();

  // Keep "today" current: re-render when the calendar date rolls over
  let __lastDayKey = ymd(new Date());
  setInterval(function () {
    var k = ymd(new Date());
    if (k !== __lastDayKey) {
      __lastDayKey = k;
      render();
    }
  }, 30000);
})();
