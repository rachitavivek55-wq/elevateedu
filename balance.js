(function () {
  'use strict';

  var STATE_KEY = 'elevate_balance_state'; // { amount: number }
  var DAILY_KEY = 'elevate_balance_daily'; // [ { date: "YYYY-MM-DD", amount: number } ]

  var $ = function (id) {
    return document.getElementById(id);
  };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getAmount() {
    var s = load(STATE_KEY, { amount: 0 });
    return typeof s.amount === 'number' ? s.amount : 0;
  }
  function setAmount(v) {
    save(STATE_KEY, { amount: v });
  }

  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function fmtMoney(v) {
    var sign = v < 0 ? '-' : '';
    var abs = Math.abs(v);
    return (
      sign +
      '$' +
      abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function fmtShortDate(iso) {
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function setDateChip() {
    var d = new Date();
    var dd = $('dateDay'),
      dm = $('dateMonth');
    if (dd) dd.textContent = d.getDate();
    if (dm)
      dm.textContent = d
        .toLocaleDateString('en-US', { month: 'short' })
        .toUpperCase();
  }

  // Record today's balance snapshot (overwrites today's entry so it always reflects latest)
  function recordDaily() {
    var daily = load(DAILY_KEY, []);
    var tk = todayKey();
    var amt = getAmount();
    var found = false;
    for (var i = 0; i < daily.length; i++) {
      if (daily[i].date === tk) {
        daily[i].amount = amt;
        found = true;
        break;
      }
    }
    if (!found) daily.push({ date: tk, amount: amt });
    daily.sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });
    if (daily.length > 60) daily = daily.slice(daily.length - 60);
    save(DAILY_KEY, daily);
    return daily;
  }

  function refreshLucide() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  // ---------- Rendering ----------
  function renderAmount() {
    var amt = getAmount();
    $('blAmount').textContent = fmtMoney(amt);

    var daily = load(DAILY_KEY, []);
    var trend = $('blTrend');
    var trendText = $('blTrendText');
    trend.classList.remove('up', 'down');

    var tk = todayKey();
    var prev = null,
      prevDate = null;
    for (var i = daily.length - 1; i >= 0; i--) {
      if (daily[i].date !== tk) {
        prev = daily[i].amount;
        prevDate = daily[i].date;
        break;
      }
    }

    var iconName = 'minus';
    if (prev === null) {
      trendText.textContent = 'Tracking started';
    } else {
      var diff = Math.round((amt - prev) * 100) / 100;
      if (diff > 0) {
        trend.classList.add('up');
        iconName = 'trending-up';
        trendText.textContent =
          '+' +
          fmtMoney(diff).replace('-', '') +
          ' since ' +
          fmtShortDate(prevDate);
      } else if (diff < 0) {
        trend.classList.add('down');
        iconName = 'trending-down';
        trendText.textContent =
          fmtMoney(diff) + ' since ' + fmtShortDate(prevDate);
      } else {
        trendText.textContent = 'No change since ' + fmtShortDate(prevDate);
      }
    }
    // Rebuild the icon element fresh so lucide converts it
    trend.querySelectorAll('i, svg').forEach(function (el) {
      el.remove();
    });
    var newI = document.createElement('i');
    newI.setAttribute('data-lucide', iconName);
    trend.insertBefore(newI, trendText);
    refreshLucide();
  }

  function lastOtherDate(daily, tk) {
    for (var i = daily.length - 1; i >= 0; i--) {
      if (daily[i].date !== tk) return daily[i].date;
    }
    return tk;
  }

  function renderChart() {
    var svg = $('blChart');
    var empty = $('blChartEmpty');
    var daily = load(DAILY_KEY, []);
    // Use last 7 recorded days
    var data = daily.slice(-7);
    if (data.length < 2) {
      svg.innerHTML = '';
      // One recorded day isn't a trend yet, so say so instead of implying
      // that nothing was saved.
      empty.textContent =
        data.length === 1
          ? 'Saved. Check back tomorrow to start seeing your trend.'
          : 'Add some money to start tracking';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var W = Math.max(280, Math.round(svg.getBoundingClientRect().width)) || 320,
      H = 150,
      padX = 14,
      padTop = 14,
      padBottom = 24;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var vals = data.map(function (d) {
      return d.amount;
    });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    var range = max - min;
    var innerW = W - padX * 2;
    var innerH = H - padTop - padBottom;

    function x(i) {
      return padX + (innerW * i) / (data.length - 1);
    }
    function y(v) {
      return padTop + innerH - ((v - min) / range) * innerH;
    }

    var linePts = data
      .map(function (d, i) {
        return x(i) + ',' + y(d.amount);
      })
      .join(' ');
    var areaPts =
      'M ' +
      x(0) +
      ',' +
      (padTop + innerH) +
      ' L ' +
      data
        .map(function (d, i) {
          return x(i) + ',' + y(d.amount);
        })
        .join(' L ') +
      ' L ' +
      x(data.length - 1) +
      ',' +
      (padTop + innerH) +
      ' Z';

    var dots = data
      .map(function (d, i) {
        return (
          '<circle class="bl-dot" cx="' +
          x(i).toFixed(1) +
          '" cy="' +
          y(d.amount).toFixed(1) +
          '" r="3.2"/>'
        );
      })
      .join('');

    var labels = data
      .map(function (d, i) {
        var lx = x(i);
        var anchor =
          i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle';
        return (
          '<text class="bl-axis-label" x="' +
          lx.toFixed(1) +
          '" y="' +
          (H - 8) +
          '" text-anchor="' +
          anchor +
          '">' +
          fmtShortDate(d.date) +
          '</text>'
        );
      })
      .join('');

    svg.innerHTML =
      '<defs><linearGradient id="blGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#6f4e37" stop-opacity="0.28"/>' +
      '<stop offset="100%" stop-color="#6f4e37" stop-opacity="0.02"/>' +
      '</linearGradient></defs>' +
      '<path class="bl-area" d="' +
      areaPts +
      '"/>' +
      '<polyline class="bl-line-path" points="' +
      linePts +
      '"/>' +
      dots +
      labels;
  }

  function renderHistory() {
    var ul = $('blHistory');
    var empty = $('blHistoryEmpty');
    var daily = load(DAILY_KEY, []);
    if (daily.length === 0) {
      ul.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    var rev = daily.slice().reverse(); // newest first
    var html = '';
    for (var i = 0; i < rev.length; i++) {
      var entry = rev[i];
      var deltaHtml = '';
      if (i < rev.length - 1) {
        var diff = entry.amount - rev[i + 1].amount;
        if (diff !== 0) {
          var cls = diff > 0 ? 'up' : 'down';
          var pfx = diff > 0 ? '+' : '';
          deltaHtml =
            '<span class="bl-hi-delta ' +
            cls +
            '">' +
            pfx +
            fmtMoney(diff).replace('$', '$') +
            '</span>';
        }
      }
      var sub = i === 0 ? 'Today' : fmtWeekday(entry.date);
      html +=
        '<li class="bl-history-item">' +
        '<div class="bl-hi-left">' +
        '<span class="bl-hi-date">' +
        fmtShortDate(entry.date) +
        '</span>' +
        '<span class="bl-hi-sub">' +
        sub +
        '</span>' +
        '</div>' +
        '<div><span class="bl-hi-amount">' +
        fmtMoney(entry.amount) +
        '</span>' +
        deltaHtml +
        '</div>' +
        '</li>';
    }
    ul.innerHTML = html;
  }

  function fmtWeekday(iso) {
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  function renderAll() {
    renderAmount();
    renderChart();
    renderHistory();
  }

  // ---------- Sheet ----------
  function openSheet(mode) {
    var title =
      mode === 'add'
        ? 'Add money'
        : mode === 'sub'
        ? 'Record a spend'
        : 'Set your balance';
    var placeholder = mode === 'set' ? '0.00' : '0.00';
    var btnLabel =
      mode === 'add' ? 'Add' : mode === 'sub' ? 'Subtract' : 'Save balance';
    var note =
      mode === 'add'
        ? 'This will be added to your current balance.'
        : mode === 'sub'
        ? 'This will be taken from your current balance.'
        : 'This replaces your current balance total.';

    $('blSheetTitle').textContent = title;
    $('blSheetBody').innerHTML =
      '<div class="bl-amt-input-wrap">' +
      '<span class="bl-currency">$</span>' +
      '<input class="bl-amt-input" id="blAmtInput" type="number" inputmode="decimal" step="0.01" min="0" placeholder="' +
      placeholder +
      '" />' +
      '</div>' +
      '<p class="bl-note">' +
      note +
      '</p>' +
      '<button class="bl-btn bl-btn-primary" id="blConfirm" disabled>' +
      btnLabel +
      '</button>';

    $('blBackdrop').hidden = false;
    $('blSheet').hidden = false;
    refreshLucide();

    var input = $('blAmtInput');
    var confirm = $('blConfirm');
    setTimeout(function () {
      input.focus();
    }, 50);
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      confirm.disabled = !(input.value !== '' && !isNaN(v) && v >= 0);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !confirm.disabled) confirm.click();
    });
    confirm.addEventListener('click', function () {
      var v = parseFloat(input.value);
      if (isNaN(v) || v < 0) return;
      var cur = getAmount();
      if (mode === 'add') setAmount(Math.round((cur + v) * 100) / 100);
      else if (mode === 'sub') setAmount(Math.round((cur - v) * 100) / 100);
      else setAmount(Math.round(v * 100) / 100);
      recordDaily();
      closeSheet();
      renderAll();
      wigglePiggy();
    });
  }

  function closeSheet() {
    $('blBackdrop').hidden = true;
    $('blSheet').hidden = true;
  }

  function wigglePiggy() {
    var p = $('blPiggyBtn');
    if (!p) return;
    p.classList.remove('wiggle');
    void p.offsetWidth;
    p.classList.add('wiggle');
  }

  // ---------- Wire ----------
  function wire() {
    $('blAddBtn').addEventListener('click', function () {
      openSheet('add');
    });
    $('blSubBtn').addEventListener('click', function () {
      openSheet('sub');
    });
    $('blSetBtn').addEventListener('click', function () {
      openSheet('set');
    });
    $('blPiggyBtn').addEventListener('click', wigglePiggy);
    $('blSheetClose').addEventListener('click', closeSheet);
    $('blBackdrop').addEventListener('click', closeSheet);

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-tab');
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
    // Ensure today's snapshot exists if there's any balance history
    var daily = load(DAILY_KEY, []);
    if (daily.length > 0 || getAmount() !== 0) recordDaily();
    wire();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* saved */
