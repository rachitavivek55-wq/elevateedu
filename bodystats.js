(function () {
  'use strict';
  var BS_KEY = 'elevate_bodystats';

  // ---- presets ----
  var PRESETS = [
    { name: 'Weight', unit: 'kg', icon: 'scale' },
    { name: 'Height', unit: 'cm', icon: 'ruler' },
    { name: 'Waist', unit: 'cm', icon: 'circle-dashed' },
    { name: 'Chest', unit: 'cm', icon: 'shirt' },
    { name: 'Arms', unit: 'cm', icon: 'dumbbell' },
    { name: 'Body Fat', unit: '%', icon: 'percent' },
    { name: 'Resting HR', unit: 'bpm', icon: 'heart-pulse' },
    { name: 'Water', unit: 'L', icon: 'droplet' },
  ];
  var ICONS = {
    Weight: 'scale',
    Height: 'ruler',
    Waist: 'circle-dashed',
    Chest: 'shirt',
    Arms: 'dumbbell',
    'Body Fat': 'percent',
    'Resting HR': 'heart-pulse',
    Water: 'droplet',
  };

  // ---- state ----
  var cats = []; // {id, name, unit, icon, entries:[{id, value, date, note}]}
  var editingCatId = null;
  var measCatId = null;
  var measEntryId = null; // if editing existing entry
  var detailCatId = null;
  var pendingPreset = null;
  var confirmCb = null;

  // ---- helpers ----
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
  function uid() {
    return Date.now() + Math.floor(Math.random() * 100000);
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(BS_KEY));
      if (Array.isArray(d)) cats = d;
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(BS_KEY, JSON.stringify(cats));
    } catch (e) {}
  }
  function el(id) {
    return document.getElementById(id);
  }
  function iconFor(name) {
    return ICONS[name] || 'activity';
  }

  function todayYMD() {
    var d = new Date();
    return (
      d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    );
  }
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }
  function fmtNum(n) {
    if (n == null || isNaN(n)) return '';
    var r = Math.round(n * 100) / 100;
    return r % 1 === 0 ? String(r) : String(r);
  }
  function fmtDate(ymd) {
    if (!ymd) return '';
    var p = ymd.split('-');
    if (p.length !== 3) return ymd;
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
    return mo[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }
  function fmtDateShort(ymd) {
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
    return mo[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10);
  }
  function sortedEntries(cat) {
    return cat.entries.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id;
    });
  }

  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  // ---- chart building (SVG path) ----
  function buildChartPath(values, w, h, pad) {
    if (values.length < 2) return null;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var n = values.length;
    var pts = values.map(function (v, i) {
      var x = pad + (i / (n - 1)) * (w - pad * 2);
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    var line = pts
      .map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
      })
      .join(' ');
    var area =
      line +
      ' L' +
      pts[n - 1][0].toFixed(1) +
      ',' +
      (h - pad).toFixed(1) +
      ' L' +
      pts[0][0].toFixed(1) +
      ',' +
      (h - pad).toFixed(1) +
      ' Z';
    return { line: line, area: area, pts: pts, min: min, max: max };
  }

  function sparkSVG(values, w, h) {
    var pad = 4;
    var c = buildChartPath(values, w, h, pad);
    if (!c) return '';
    var dots =
      '<circle cx="' +
      c.pts[c.pts.length - 1][0].toFixed(1) +
      '" cy="' +
      c.pts[c.pts.length - 1][1].toFixed(1) +
      '" r="3" fill="#6f4e37" />';
    return (
      '<path d="' +
      c.area +
      '" fill="#6f4e37" fill-opacity="0.08" />' +
      '<path d="' +
      c.line +
      '" fill="none" stroke="#6f4e37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      dots
    );
  }

  // ---- rendering ----
  function trendInfo(cat) {
    var e = sortedEntries(cat);
    if (e.length < 2) return null;
    var first = e[0].value,
      last = e[e.length - 1].value;
    var diff = last - first;
    return { diff: diff, dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }

  function render() {
    var wrap = el('bsCats');
    var empty = el('bsEmpty');
    if (!cats.length) {
      wrap.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      wrap.innerHTML = cats
        .map(function (cat) {
          var e = sortedEntries(cat);
          var latest = e.length ? e[e.length - 1] : null;
          var vals = e.map(function (x) {
            return x.value;
          });
          var t = trendInfo(cat);
          var trendHtml = '';
          if (t) {
            var arrow =
              t.dir === 'up'
                ? '&#9650;'
                : t.dir === 'down'
                ? '&#9660;'
                : '&#8226;';
            var cls =
              t.dir === 'up'
                ? 'bs-trend-up'
                : t.dir === 'down'
                ? 'bs-trend-down'
                : 'bs-trend-flat';
            var sign = t.diff > 0 ? '+' : '';
            trendHtml =
              '<div class="bs-cat-trend ' +
              cls +
              '">' +
              arrow +
              ' ' +
              sign +
              fmtNum(t.diff) +
              ' ' +
              esc(cat.unit) +
              '</div>';
          }
          var valHtml = latest
            ? '<div class="bs-cat-latest">' +
              fmtNum(latest.value) +
              ' <span class="bs-cat-unit">' +
              esc(cat.unit) +
              '</span></div>' +
              trendHtml
            : '<div class="bs-cat-unit">No data</div>';
          var spark =
            vals.length >= 2
              ? '<svg class="bs-spark" viewBox="0 0 300 44" preserveAspectRatio="none">' +
                sparkSVG(vals, 300, 44) +
                '</svg>'
              : '<div class="bs-cat-emptyline">' +
                (vals.length === 1
                  ? 'One entry so far &mdash; add more to see a trend'
                  : 'Tap to add your first measurement') +
                '</div>';
          return (
            '<div class="bs-cat" data-cat="' +
            cat.id +
            '">' +
            '<div class="bs-cat-top">' +
            '<div class="bs-cat-left">' +
            '<span class="bs-cat-icon"><i data-lucide="' +
            esc(cat.icon || iconFor(cat.name)) +
            '"></i></span>' +
            '<div><div class="bs-cat-name">' +
            esc(cat.name) +
            '</div>' +
            '<div class="bs-cat-sub">' +
            e.length +
            ' ' +
            (e.length === 1 ? 'entry' : 'entries') +
            '</div></div>' +
            '</div>' +
            '<div class="bs-cat-val">' +
            valHtml +
            '</div>' +
            '</div>' +
            spark +
            '</div>'
          );
        })
        .join('');
    }
    // summary
    el('bsCatCount').textContent = cats.length;
    var total = 0,
      thisMonth = 0,
      mk = todayYMD().slice(0, 7);
    cats.forEach(function (c) {
      total += c.entries.length;
      c.entries.forEach(function (x) {
        if (x.date && x.date.slice(0, 7) === mk) thisMonth++;
      });
    });
    el('bsEntryCount').textContent = total;
    el('bsStreak').textContent = thisMonth;
    refreshIcons();
  }

  // ---- category sheet ----
  function openCatSheet(catId) {
    editingCatId = catId || null;
    pendingPreset = null;
    var titleEl = el('bsCatTitle'),
      nameEl = el('bsCatName'),
      unitEl = el('bsCatUnit');
    if (catId) {
      var c = cats.filter(function (x) {
        return x.id === catId;
      })[0];
      titleEl.textContent = 'Edit category';
      nameEl.value = c.name;
      unitEl.value = c.unit;
    } else {
      titleEl.textContent = 'New category';
      nameEl.value = '';
      unitEl.value = '';
    }
    // presets
    el('bsPresets').innerHTML = PRESETS.map(function (p) {
      return (
        '<button class="bs-preset" data-preset="' +
        esc(p.name) +
        '" data-unit="' +
        esc(p.unit) +
        '" type="button"><i data-lucide="' +
        p.icon +
        '"></i>' +
        esc(p.name) +
        '</button>'
      );
    }).join('');
    el('bsCatBackdrop').hidden = false;
    refreshIcons();
  }
  function closeCatSheet() {
    el('bsCatBackdrop').hidden = true;
  }

  function saveCat() {
    var name = el('bsCatName').value.trim();
    var unit = el('bsCatUnit').value.trim();
    if (!name) {
      toast('Please name the category');
      return;
    }
    if (editingCatId) {
      var c = cats.filter(function (x) {
        return x.id === editingCatId;
      })[0];
      c.name = name;
      c.unit = unit;
      if (pendingPreset) c.icon = ICONS[pendingPreset] || c.icon;
    } else {
      cats.push({
        id: uid(),
        name: name,
        unit: unit,
        icon: pendingPreset
          ? ICONS[pendingPreset] || 'activity'
          : iconFor(name),
        entries: [],
      });
    }
    save();
    render();
    closeCatSheet();
    toast(editingCatId ? 'Category updated' : 'Category added');
  }

  // ---- measurement sheet ----
  function openMeasSheet(catId, entryId) {
    measCatId = catId;
    measEntryId = entryId || null;
    var c = cats.filter(function (x) {
      return x.id === catId;
    })[0];
    el('bsMeasTitle').textContent = entryId
      ? 'Edit measurement'
      : 'Add measurement';
    el('bsMeasUnit').textContent = c.unit ? '(' + c.unit + ')' : '';
    if (entryId) {
      var en = c.entries.filter(function (x) {
        return x.id === entryId;
      })[0];
      el('bsMeasValue').value = en.value;
      el('bsMeasDate').value = en.date;
      el('bsMeasNote').value = en.note || '';
    } else {
      el('bsMeasValue').value = '';
      el('bsMeasDate').value = todayYMD();
      el('bsMeasNote').value = '';
    }
    el('bsMeasBackdrop').hidden = false;
  }
  function closeMeasSheet() {
    el('bsMeasBackdrop').hidden = true;
  }

  function saveMeas() {
    var raw = el('bsMeasValue').value.trim();
    var val = parseFloat(raw);
    if (raw === '' || isNaN(val)) {
      toast('Enter a number');
      return;
    }
    var date = el('bsMeasDate').value || todayYMD();
    var note = el('bsMeasNote').value.trim();
    var c = cats.filter(function (x) {
      return x.id === measCatId;
    })[0];
    if (measEntryId) {
      var en = c.entries.filter(function (x) {
        return x.id === measEntryId;
      })[0];
      en.value = val;
      en.date = date;
      en.note = note;
    } else {
      c.entries.push({ id: uid(), value: val, date: date, note: note });
    }
    save();
    render();
    closeMeasSheet();
    if (!el('bsDetailBackdrop').hidden) renderDetail();
    toast('Saved');
  }

  // ---- detail sheet ----
  function openDetail(catId) {
    detailCatId = catId;
    renderDetail();
    el('bsDetailBackdrop').hidden = false;
  }
  function closeDetail() {
    el('bsDetailBackdrop').hidden = true;
  }

  function renderDetail() {
    var c = cats.filter(function (x) {
      return x.id === detailCatId;
    })[0];
    if (!c) return;
    el('bsDetailTitle').textContent =
      c.name + (c.unit ? ' (' + c.unit + ')' : '');
    var e = sortedEntries(c);
    var vals = e.map(function (x) {
      return x.value;
    });
    // stats
    if (e.length) {
      el('bsStatLatest').textContent = fmtNum(e[e.length - 1].value);
      if (e.length >= 2) {
        var diff = e[e.length - 1].value - e[0].value;
        el('bsStatChange').textContent = (diff > 0 ? '+' : '') + fmtNum(diff);
      } else {
        el('bsStatChange').textContent = '&ndash;';
        el('bsStatChange').innerHTML = '&ndash;';
      }
      el('bsStatCount').textContent = e.length;
    } else {
      el('bsStatLatest').innerHTML = '&ndash;';
      el('bsStatChange').innerHTML = '&ndash;';
      el('bsStatCount').textContent = '0';
    }
    // chart
    var svg = el('bsChart'),
      chartEmpty = el('bsChartEmpty');
    if (vals.length >= 2) {
      chartEmpty.hidden = true;
      svg.style.display = 'block';
      var w = 320,
        h = 160,
        pad = 16;
      var c2 = buildChartPath(vals, w, h, pad);
      var dots = c2.pts
        .map(function (p) {
          return (
            '<circle cx="' +
            p[0].toFixed(1) +
            '" cy="' +
            p[1].toFixed(1) +
            '" r="3.2" fill="#6f4e37" />'
          );
        })
        .join('');
      var maxLbl =
        '<text x="' +
        pad +
        '" y="12" font-size="10" fill="#8a7355">' +
        fmtNum(c2.max) +
        '</text>';
      var minLbl =
        '<text x="' +
        pad +
        '" y="' +
        (h - 4) +
        '" font-size="10" fill="#8a7355">' +
        fmtNum(c2.min) +
        '</text>';
      svg.innerHTML =
        '<path d="' +
        c2.area +
        '" fill="#6f4e37" fill-opacity="0.09" />' +
        '<path d="' +
        c2.line +
        '" fill="none" stroke="#6f4e37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />' +
        dots +
        maxLbl +
        minLbl;
    } else {
      svg.style.display = 'none';
      svg.innerHTML = '';
      chartEmpty.hidden = false;
    }
    // history (newest first)
    var hist = el('bsHistory');
    var rev = e.slice().reverse();
    if (!rev.length) {
      hist.innerHTML =
        '<div class="bs-cat-emptyline" style="margin-top:0">No measurements yet.</div>';
    } else {
      hist.innerHTML =
        rev
          .map(function (en) {
            return (
              '<div class="bs-hist-row" data-entry="' +
              en.id +
              '">' +
              '<div class="bs-hist-left">' +
              '<span class="bs-hist-val">' +
              fmtNum(en.value) +
              ' ' +
              esc(c.unit) +
              '</span>' +
              '<span class="bs-hist-date">' +
              fmtDate(en.date) +
              '</span>' +
              (en.note
                ? '<span class="bs-hist-note">' + esc(en.note) + '</span>'
                : '') +
              '</div>' +
              '<button class="bs-hist-del" data-del-entry="' +
              en.id +
              '" aria-label="Delete"><i data-lucide="trash-2"></i></button>' +
              '</div>'
            );
          })
          .join('') +
        '<button class="bs-detail-danger" id="bsDeleteCat" type="button">Delete this category</button>';
    }
    refreshIcons();
  }

  // ---- custom confirm ----
  function askConfirm(msg, yesLabel, cb) {
    el('bsConfirmMsg').textContent = msg;
    el('bsConfirmYes').textContent = yesLabel || 'Remove';
    confirmCb = cb;
    el('bsConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    el('bsConfirmWrap').hidden = true;
    confirmCb = null;
  }

  // ---- toast ----
  var toastTimer = null;
  function toast(msg) {
    var t = el('bsToast');
    t.textContent = msg;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.hidden = true;
    }, 1900);
  }

  // ---- wiring ----
  function wire() {
    el('bsFab').addEventListener('click', function () {
      openCatSheet(null);
    });

    // category sheet
    el('bsCatClose').addEventListener('click', closeCatSheet);
    el('bsCatCancel').addEventListener('click', closeCatSheet);
    el('bsCatSave').addEventListener('click', saveCat);
    el('bsCatBackdrop').addEventListener('click', function (ev) {
      if (ev.target === el('bsCatBackdrop')) closeCatSheet();
    });
    el('bsPresets').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-preset]');
      if (!b) return;
      pendingPreset = b.getAttribute('data-preset');
      el('bsCatName').value = pendingPreset;
      el('bsCatUnit').value = b.getAttribute('data-unit');
      Array.prototype.forEach.call(
        el('bsPresets').querySelectorAll('.bs-preset'),
        function (x) {
          x.classList.remove('bs-preset-on');
        }
      );
      b.classList.add('bs-preset-on');
    });

    // measurement sheet
    el('bsMeasClose').addEventListener('click', closeMeasSheet);
    el('bsMeasCancel').addEventListener('click', closeMeasSheet);
    el('bsMeasSave').addEventListener('click', saveMeas);
    el('bsMeasBackdrop').addEventListener('click', function (ev) {
      if (ev.target === el('bsMeasBackdrop')) closeMeasSheet();
    });

    // detail sheet
    el('bsDetailClose').addEventListener('click', closeDetail);
    el('bsDetailBackdrop').addEventListener('click', function (ev) {
      if (ev.target === el('bsDetailBackdrop')) closeDetail();
    });
    el('bsDetailAdd').addEventListener('click', function () {
      openMeasSheet(detailCatId, null);
    });
    el('bsHistory').addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-del-entry]');
      if (del) {
        var eid = parseInt(del.getAttribute('data-del-entry'), 10);
        askConfirm('Delete this measurement?', 'Delete', function () {
          var c = cats.filter(function (x) {
            return x.id === detailCatId;
          })[0];
          c.entries = c.entries.filter(function (x) {
            return x.id !== eid;
          });
          save();
          render();
          renderDetail();
          toast('Measurement deleted');
        });
        return;
      }
      if (ev.target.closest('#bsDeleteCat')) {
        askConfirm(
          'Delete this category and all its data?',
          'Delete',
          function () {
            cats = cats.filter(function (x) {
              return x.id !== detailCatId;
            });
            save();
            render();
            closeDetail();
            toast('Category deleted');
          }
        );
        return;
      }
      var row = ev.target.closest('[data-entry]');
      if (row) {
        openMeasSheet(
          detailCatId,
          parseInt(row.getAttribute('data-entry'), 10)
        );
      }
    });

    // card list: tap opens detail
    el('bsCats').addEventListener('click', function (ev) {
      var card = ev.target.closest('[data-cat]');
      if (card) openDetail(parseInt(card.getAttribute('data-cat'), 10));
    });

    // confirm
    el('bsConfirmNo').addEventListener('click', closeConfirm);
    el('bsConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    });

    // bottom nav
    Array.prototype.forEach.call(
      document.querySelectorAll('.nav-item'),
      function (n) {
        n.addEventListener('click', function () {
          var tab = n.getAttribute('data-tab');
          var map = {
            home: 'index.html',
            planner: 'planner.html',
            wallet: 'wallet.html',
            fitness: 'wellness.html',
            mindset: 'mindset.html',
            guides: 'guides.html',
          };
          if (map[tab]) window.location.href = map[tab];
        });
      }
    );
  }

  function init() {
    load();
    render();
    wire();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
