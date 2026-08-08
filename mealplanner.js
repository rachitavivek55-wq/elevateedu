(function () {
  'use strict';
  var MP_KEY = 'elevate_meals';
  var CAL_KEY = 'elevate_calendar_entries';
  var MEAL_COLOR = '#6F4E37';
  var TYPES = [
    { id: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
    { id: 'lunch', label: 'Lunch', icon: 'sun' },
    { id: 'dinner', label: 'Dinner', icon: 'moon' },
    { id: 'snack', label: 'Snack', icon: 'cookie' },
  ];
  var PRESETS = {
    breakfast: [
      'Overnight oats',
      'Scrambled eggs & toast',
      'Greek yogurt & berries',
      'Smoothie bowl',
      'Avocado toast',
      'Pancakes',
      'Cereal & milk',
    ],
    lunch: [
      'Chicken wrap',
      'Turkey sandwich',
      'Rice & veggies bowl',
      'Caesar salad',
      'Pasta salad',
      'Soup & bread',
      'Leftovers',
    ],
    dinner: [
      'Grilled chicken & rice',
      'Spaghetti bolognese',
      'Stir-fry & noodles',
      'Salmon & veggies',
      'Tacos',
      'Burrito bowl',
      'Homemade pizza',
    ],
    snack: [
      'Apple & peanut butter',
      'Trail mix',
      'Protein bar',
      'Hummus & carrots',
      'Banana',
      'Yogurt',
      'Handful of nuts',
    ],
  };
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var meals = []; // [{id,type,name,ingredients,note}]
  var filterType = 'all',
    selType = 'breakfast',
    selPreset = null,
    editingId = null;
  var schedMode = 'single',
    schedDays = [],
    schedMealId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }
  function $(id) {
    return document.getElementById(id);
  }
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }
  function todayYMD() {
    var d = new Date();
    return (
      d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    );
  }
  function typeInfo(id) {
    return (
      TYPES.find(function (t) {
        return t.id === id;
      }) || TYPES[0]
    );
  }
  function icons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function loadMeals() {
    try {
      meals = JSON.parse(localStorage.getItem(MP_KEY)) || [];
    } catch (e) {
      meals = [];
    }
    if (!Array.isArray(meals)) meals = [];
  }
  function saveMeals() {
    try {
      localStorage.setItem(MP_KEY, JSON.stringify(meals));
    } catch (e) {}
  }
  function loadCal() {
    try {
      return JSON.parse(localStorage.getItem(CAL_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveCal(a) {
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify(a));
    } catch (e) {}
  }

  function schedFor(mealId) {
    return loadCal().filter(function (e) {
      return e.source === 'meal' && e.mealId === mealId;
    });
  }
  function allMealEntries() {
    return loadCal().filter(function (e) {
      return e.source === 'meal';
    });
  }

  function fmtDate(ymd) {
    if (!ymd) return '';
    var p = ymd.split('-');
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
    return parseInt(p[2], 10) + ' ' + mo[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':');
    var h = parseInt(p[0], 10);
    var m = p[1];
    var ap = h < 12 ? 'AM' : 'PM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + ap;
  }

  function render() {
    var entries = allMealEntries();
    var weekly = entries.filter(function (e) {
      return e.type === 'commitment';
    });
    $('mpMealCount').textContent = meals.length;
    $('mpSchedCount').textContent = entries.length;
    $('mpWeekCount').textContent = weekly.length;

    var list = $('mpList'),
      empty = $('mpEmpty');
    var shown = meals.filter(function (m) {
      return filterType === 'all' || m.type === filterType;
    });
    if (!meals.length) {
      empty.hidden = false;
      list.innerHTML = '';
      icons();
      return;
    }
    empty.hidden = true;
    if (!shown.length) {
      list.innerHTML =
        '<p class="mp-empty-sub" style="text-align:center;padding:20px;">No ' +
        esc(filterType) +
        ' meals yet.</p>';
      return;
    }
    // order by type then name
    var order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
    shown = shown.slice().sort(function (a, b) {
      var d = (order[a.type] || 0) - (order[b.type] || 0);
      return d !== 0 ? d : a.name < b.name ? -1 : 1;
    });
    list.innerHTML = shown
      .map(function (m) {
        var ti = typeInfo(m.type);
        var cnt = schedFor(m.id).length;
        var sub = m.ingredients
          ? esc(m.ingredients)
          : m.note
          ? esc(m.note)
          : 'Tap to view & schedule';
        var badge = cnt
          ? '<span class="mp-card-badge"><i data-lucide="calendar-check"></i>' +
            cnt +
            '</span>'
          : '';
        return (
          '<article class="mp-card" data-meal="' +
          m.id +
          '">' +
          '<span class="mp-card-ic"><i data-lucide="' +
          ti.icon +
          '"></i></span>' +
          '<div class="mp-card-main"><span class="mp-type-tag">' +
          esc(ti.label) +
          '</span>' +
          '<p class="mp-card-name">' +
          esc(m.name) +
          '</p><p class="mp-card-sub">' +
          sub +
          '</p></div>' +
          badge +
          '</article>'
        );
      })
      .join('');
    icons();
  }

  var toastT;
  function toast(msg) {
    var t = $('mpToast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      t.hidden = true;
    }, 2000);
  }

  var confirmCb = null;
  function askConfirm(msg, cb) {
    $('mpConfirmMsg').textContent = msg;
    confirmCb = cb;
    $('mpConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('mpConfirmWrap').hidden = true;
    confirmCb = null;
  }

  function renderPresets() {
    var arr = PRESETS[selType] || [];
    $('mpPresets').innerHTML = arr
      .map(function (n) {
        return (
          '<button type="button" class="mp-preset" data-preset="' +
          esc(n) +
          '">' +
          esc(n) +
          '</button>'
        );
      })
      .join('');
  }
  function setTypeSel(type) {
    selType = type;
    selPreset = null;
    Array.prototype.forEach.call($('mpTypeSel').children, function (b) {
      b.classList.toggle('mp-type-on', b.getAttribute('data-type') === type);
    });
    renderPresets();
  }
  function openMealSheet(editId) {
    editingId = editId || null;
    if (editingId) {
      var m = meals.find(function (x) {
        return x.id === editingId;
      });
      if (!m) return;
      $('mpMealTitle').textContent = 'Edit meal';
      $('mpMealSave').textContent = 'Save changes';
      setTypeSel(m.type);
      $('mpName').value = m.name || '';
      $('mpIngredients').value = m.ingredients || '';
      $('mpNote').value = m.note || '';
    } else {
      $('mpMealTitle').textContent = 'Add a meal';
      $('mpMealSave').textContent = 'Save meal';
      setTypeSel(filterType !== 'all' ? filterType : 'breakfast');
      $('mpName').value = '';
      $('mpIngredients').value = '';
      $('mpNote').value = '';
    }
    var __dM = !$('mpDetailBackdrop').hidden;
    $('mpDetailBackdrop').__reopenM = __dM;
    if (__dM) $('mpDetailBackdrop').hidden = true;
    $('mpMealBackdrop').hidden = false;
    icons();
  }
  function closeMealSheet() {
    $('mpMealBackdrop').hidden = true;
    editingId = null;
    if ($('mpDetailBackdrop').__reopenM) {
      $('mpDetailBackdrop').__reopenM = false;
      renderDetail();
      $('mpDetailBackdrop').hidden = false;
    }
  }
  function saveMeal() {
    var name = $('mpName').value.trim();
    if (!name) {
      toast('Give your meal a name');
      return;
    }
    if (editingId) {
      var m = meals.find(function (x) {
        return x.id === editingId;
      });
      if (m) {
        m.type = selType;
        m.name = name;
        m.ingredients = $('mpIngredients').value.trim();
        m.note = $('mpNote').value.trim();
      }
      saveMeals();
      render();
      closeMealSheet();
      toast('Meal updated');
    } else {
      meals.push({
        id: uid(),
        type: selType,
        name: name,
        ingredients: $('mpIngredients').value.trim(),
        note: $('mpNote').value.trim(),
      });
      saveMeals();
      render();
      closeMealSheet();
      toast('Meal added');
    }
  }

  function openSchedSheet(mealId) {
    schedMealId = mealId;
    schedMode = 'single';
    schedDays = [];
    var m = meals.find(function (x) {
      return x.id === mealId;
    });
    if (!m) return;
    var ti = typeInfo(m.type);
    $('mpSchedFor').innerHTML =
      'Scheduling <b>' + esc(m.name) + '</b> &middot; ' + esc(ti.label);
    // reset segmented + days + inputs
    Array.prototype.forEach.call(
      document.querySelectorAll('#mpSchedBackdrop .mp-seg'),
      function (b) {
        b.classList.toggle(
          'mp-seg-on',
          b.getAttribute('data-mode') === 'single'
        );
      }
    );
    Array.prototype.forEach.call($('mpDays').children, function (b) {
      b.classList.remove('mp-day-on');
    });
    $('mpDateWrap').hidden = false;
    $('mpDaysWrap').hidden = true;
    $('mpSchedDate').value = todayYMD();
    $('mpSchedTime').value = '';
    var __dO = !$('mpDetailBackdrop').hidden;
    $('mpDetailBackdrop').__reopen = __dO;
    if (__dO) $('mpDetailBackdrop').hidden = true;
    $('mpSchedBackdrop').hidden = false;
    icons();
  }
  function closeSchedSheet() {
    $('mpSchedBackdrop').hidden = true;
    schedMealId = null;
    if ($('mpDetailBackdrop').__reopen) {
      $('mpDetailBackdrop').__reopen = false;
      renderDetail();
      $('mpDetailBackdrop').hidden = false;
    }
  }
  function setSchedMode(mode) {
    schedMode = mode;
    Array.prototype.forEach.call(
      document.querySelectorAll('#mpSchedBackdrop .mp-seg'),
      function (b) {
        b.classList.toggle('mp-seg-on', b.getAttribute('data-mode') === mode);
      }
    );
    $('mpDateWrap').hidden = mode !== 'single';
    $('mpDaysWrap').hidden = mode !== 'weekly';
  }
  function saveSched() {
    var m = meals.find(function (x) {
      return x.id === schedMealId;
    });
    if (!m) return;
    var ti = typeInfo(m.type);
    var time = $('mpSchedTime').value || '';
    var title = ti.label + ': ' + m.name;
    var cal = loadCal();
    if (schedMode === 'single') {
      var date = $('mpSchedDate').value;
      if (!date) {
        toast('Pick a date');
        return;
      }
      cal.push({
        id: uid(),
        type: 'task',
        title: title,
        color: MEAL_COLOR,
        notes: m.ingredients || '',
        date: date,
        time: time,
        priority: 'medium',
        source: 'meal',
        mealId: m.id,
        mealType: m.type,
      });
      saveCal(cal);
      render();
      closeSchedSheet();
      toast('Added to ' + fmtDate(date));
    } else {
      if (!schedDays.length) {
        toast('Pick at least one day');
        return;
      }
      var days = schedDays.slice().sort();
      cal.push({
        id: uid(),
        type: 'commitment',
        title: title,
        color: MEAL_COLOR,
        notes: m.ingredients || '',
        days: days,
        time: time,
        priority: 'medium',
        source: 'meal',
        mealId: m.id,
        mealType: m.type,
      });
      saveCal(cal);
      render();
      closeSchedSheet();
      toast(
        'Repeats weekly on ' +
          days
            .map(function (d) {
              return DOW[d];
            })
            .join(', ')
      );
    }
    if (!$('mpDetailBackdrop').hidden) renderDetail();
  }

  var detailMealId = null;
  function openDetail(mealId) {
    detailMealId = mealId;
    renderDetail();
    $('mpDetailBackdrop').hidden = false;
  }
  function closeDetail() {
    $('mpDetailBackdrop').hidden = true;
    detailMealId = null;
  }
  function renderDetail() {
    var m = meals.find(function (x) {
      return x.id === detailMealId;
    });
    if (!m) return;
    var ti = typeInfo(m.type);
    $('mpDetailName').textContent = m.name;
    $('mpDetailType').textContent = ti.label;
    if (m.ingredients) {
      $('mpDetailIngWrap').hidden = false;
      $('mpDetailIng').textContent = m.ingredients;
    } else {
      $('mpDetailIngWrap').hidden = true;
    }
    if (m.note) {
      $('mpDetailNoteWrap').hidden = false;
      $('mpDetailNote').textContent = m.note;
    } else {
      $('mpDetailNoteWrap').hidden = true;
    }

    var sched = schedFor(m.id);
    var wrap = $('mpDetailSched');
    if (!sched.length) {
      wrap.innerHTML =
        '<span class="mp-detail-lbl">Scheduled</span><p class="mp-card-sub" style="margin-top:4px;">Not scheduled yet.</p>';
    } else {
      var rows = sched
        .map(function (e) {
          var info, badge;
          if (e.type === 'commitment') {
            info = (e.days || [])
              .map(function (d) {
                return DOW[d];
              })
              .join(', ');
            badge = 'Weekly';
          } else {
            info = fmtDate(e.date);
            badge = 'One day';
          }
          var timeTxt = e.time ? ' &middot; ' + fmtTime(e.time) : '';
          return (
            '<div class="mp-sched-row"><span class="mp-sched-info"><i data-lucide="calendar"></i>' +
            esc(info) +
            timeTxt +
            '</span>' +
            '<span style="display:flex;align-items:center;gap:8px;"><span class="mp-sched-badge">' +
            badge +
            '</span>' +
            '<button class="mp-sched-del" data-del-entry="' +
            e.id +
            '" aria-label="Remove"><i data-lucide="x"></i></button></span></div>'
          );
        })
        .join('');
      wrap.innerHTML = '<span class="mp-detail-lbl">Scheduled</span>' + rows;
    }
    icons();
  }
  function removeEntry(entryId) {
    var cal = loadCal().filter(function (e) {
      return e.id !== entryId;
    });
    saveCal(cal);
    render();
    renderDetail();
    toast('Removed from calendar');
  }
  function deleteMeal() {
    var m = meals.find(function (x) {
      return x.id === detailMealId;
    });
    if (!m) return;
    askConfirm(
      'Delete "' +
        m.name +
        '"? Its scheduled calendar entries will also be removed.',
      function () {
        var cal = loadCal().filter(function (e) {
          return !(e.source === 'meal' && e.mealId === detailMealId);
        });
        saveCal(cal);
        meals = meals.filter(function (x) {
          return x.id !== detailMealId;
        });
        saveMeals();
        render();
        closeDetail();
        toast('Meal deleted');
      }
    );
  }

  function wire() {
    $('mpFab').addEventListener('click', function () {
      openMealSheet(null);
    });

    // filter tabs
    $('mpTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]');
      if (!b) return;
      filterType = b.getAttribute('data-type');
      Array.prototype.forEach.call($('mpTabs').children, function (x) {
        x.classList.toggle('mp-tab-on', x === b);
      });
      render();
    });

    // meal list -> detail
    $('mpList').addEventListener('click', function (e) {
      var c = e.target.closest('[data-meal]');
      if (!c) return;
      openDetail(c.getAttribute('data-meal'));
    });

    // meal sheet
    $('mpMealClose').addEventListener('click', closeMealSheet);
    $('mpMealSave').addEventListener('click', saveMeal);
    $('mpTypeSel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]');
      if (!b) return;
      setTypeSel(b.getAttribute('data-type'));
    });
    $('mpPresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      var name = b.getAttribute('data-preset');
      $('mpName').value = name;
      Array.prototype.forEach.call($('mpPresets').children, function (x) {
        x.classList.toggle('mp-preset-on', x === b);
      });
    });

    // schedule sheet
    $('mpSchedClose').addEventListener('click', closeSchedSheet);
    $('mpSchedSave').addEventListener('click', saveSched);
    document.querySelectorAll('#mpSchedBackdrop .mp-seg').forEach(function (b) {
      b.addEventListener('click', function () {
        setSchedMode(b.getAttribute('data-mode'));
      });
    });
    $('mpDays').addEventListener('click', function (e) {
      var b = e.target.closest('[data-dow]');
      if (!b) return;
      var d = parseInt(b.getAttribute('data-dow'), 10);
      var i = schedDays.indexOf(d);
      if (i > -1) schedDays.splice(i, 1);
      else schedDays.push(d);
      b.classList.toggle('mp-day-on');
    });

    // detail
    $('mpDetailClose').addEventListener('click', closeDetail);
    $('mpDetailSchedule').addEventListener('click', function () {
      openSchedSheet(detailMealId);
    });
    $('mpDetailEdit').addEventListener('click', function () {
      openMealSheet(detailMealId);
    });
    $('mpDetailDelete').addEventListener('click', deleteMeal);
    $('mpDetailSched').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del-entry]');
      if (!b) return;
      removeEntry(b.getAttribute('data-del-entry'));
    });

    // confirm
    $('mpConfirmNo').addEventListener('click', closeConfirm);
    $('mpConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    });

    // backdrop click-to-close
    ['mpMealBackdrop', 'mpSchedBackdrop', 'mpDetailBackdrop'].forEach(function (
      id
    ) {
      var el = $(id);
      el.addEventListener('click', function (e) {
        if (e.target === el) el.hidden = true;
      });
    });

    // bottom nav
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-tab');
        var map = {
          home: 'index.html',
          planner: 'planner.html',
          wallet: 'wallet.html',
          fitness: 'wellness.html',
          mindset: 'mindset.html',
          guides: 'guides.html',
        };
        if (map[t]) location.href = map[t];
      });
    });
  }

  function init() {
    loadMeals();
    render();
    wire();
    icons();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
