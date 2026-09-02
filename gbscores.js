/* ============================================================
   gbscores.js — per-class grade categories & individual scores
   Renders INSIDE the "Edit class" sheet, under the class fields.
   Reads/writes the same localStorage key (elevate_gradebook),
   adding class.categories.
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'elevate_gradebook';
  var LETTERS = [
    'A+',
    'A',
    'A-',
    'B+',
    'B',
    'B-',
    'C+',
    'C',
    'C-',
    'D+',
    'D',
    'D-',
    'F',
  ];
  var LETTER_PCT = {
    'A+': 98,
    A: 95,
    'A-': 91,
    'B+': 88,
    B: 85,
    'B-': 81,
    'C+': 78,
    C: 75,
    'C-': 71,
    'D+': 68,
    D: 65,
    'D-': 61,
    F: 50,
  };

  function load() {
    try {
      return (
        JSON.parse(localStorage.getItem(KEY)) || { books: [], activeBook: null }
      );
    } catch (e) {
      return { books: [], activeBook: null };
    }
  }
  function save(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }
  function uid() {
    return (
      'sc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    );
  }

  function activeBook(db) {
    return (
      db.books.find(function (b) {
        return b.id === db.activeBook;
      }) || null
    );
  }
  function activePeriod(book) {
    if (!book) return null;
    var btns = document.querySelectorAll('#gbPeriods .gb-period');
    var idx = 0;
    btns.forEach(function (b, i) {
      if (b.classList.contains('active')) idx = i;
    });
    return book.periods[idx] || book.periods[0] || null;
  }

  function scorePct(s) {
    if (!s) return null;
    if (s.type === 'letter') {
      return s.value in LETTER_PCT ? LETTER_PCT[s.value] : null;
    }
    if (s.type === 'percent') {
      var p = parseFloat(s.value);
      return isNaN(p) ? null : p;
    }
    if (s.type === 'points') {
      var got = parseFloat(s.got),
        out = parseFloat(s.out);
      if (isNaN(got) || isNaN(out) || out === 0) return null;
      return (got / out) * 100;
    }
    return null;
  }
  function catAvg(cat) {
    if (!cat || !cat.items || !cat.items.length) return null;
    var vals = cat.items.map(scorePct).filter(function (x) {
      return x !== null;
    });
    if (!vals.length) return null;
    return (
      vals.reduce(function (a, b) {
        return a + b;
      }, 0) / vals.length
    );
  }
  function classAvg(cls) {
    if (!cls.categories || !cls.categories.length) return null;
    var parts = [];
    cls.categories.forEach(function (c) {
      var a = catAvg(c);
      if (a === null) return;
      var w = parseFloat(c.weight);
      parts.push({ a: a, w: isNaN(w) || w <= 0 ? null : w });
    });
    if (!parts.length) return null;
    var anyW = parts.some(function (p) {
      return p.w !== null;
    });
    if (anyW) {
      var tw = 0,
        ts = 0;
      parts.forEach(function (p) {
        var w = p.w === null ? 0 : p.w;
        tw += w;
        ts += p.a * w;
      });
      return tw ? ts / tw : null;
    }
    return (
      parts.reduce(function (s, p) {
        return s + p.a;
      }, 0) / parts.length
    );
  }
  function pctToLetter(p) {
    if (p === null) return '—';
    if (p >= 97) return 'A+';
    if (p >= 93) return 'A';
    if (p >= 90) return 'A-';
    if (p >= 87) return 'B+';
    if (p >= 83) return 'B';
    if (p >= 80) return 'B-';
    if (p >= 77) return 'C+';
    if (p >= 73) return 'C';
    if (p >= 70) return 'C-';
    if (p >= 67) return 'D+';
    if (p >= 63) return 'D';
    if (p >= 60) return 'D-';
    return 'F';
  }
  function scoreLabel(s) {
    if (s.type === 'letter') return s.value || '—';
    if (s.type === 'percent')
      return s.value === '' || s.value == null ? '—' : s.value + '%';
    if (s.type === 'points') {
      if (s.got === '' || s.out === '' || s.got == null || s.out == null)
        return '—';
      return s.got + ' / ' + s.out;
    }
    return '—';
  }
  function fmtPct(p) {
    return p === null ? '—' : Math.round(p * 10) / 10 + '%';
  }
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  function injectCSS() {
    if (document.getElementById('gbScoresCSS')) return;
    var css = document.createElement('style');
    css.id = 'gbScoresCSS';
    css.textContent = [
      /* section inside the edit-class sheet */
      '.gb-grades-sec{margin-top:6px;border-top:1px solid rgba(111,78,55,.14);padding-top:16px;}',
      '.gb-grades-sec[hidden]{display:none !important;}',
      '.gb-grades-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}',
      '.gb-grades-head h4{margin:0;font:700 14.5px/1 Poppins,sans-serif;color:#4b3832;}',
      '.gb-grades-head .gb-gr-avg{margin-left:auto;font:700 13px/1 Poppins,sans-serif;color:#6f4e37;background:rgba(111,78,55,.10);padding:5px 10px;border-radius:10px;}',
      '.gb-grades-hint{font:400 11.5px/1.5 Poppins,sans-serif;color:#8a7663;margin:0 0 12px;}',
      '.gb-cat{border-radius:14px;background:rgba(220,199,170,.20);padding:11px 12px;margin-bottom:10px;}',
      '.gb-cat-head{display:flex;align-items:center;gap:8px;}',
      '.gb-cat-name{font:600 13.5px/1.2 Poppins,sans-serif;color:#4b3832;}',
      '.gb-cat-wt{font:500 11px/1 Poppins,sans-serif;color:#8a7663;background:rgba(111,78,55,.10);padding:3px 7px;border-radius:8px;}',
      '.gb-cat-avg{margin-left:auto;font:700 13px/1 Poppins,sans-serif;color:#6f4e37;}',
      '.gb-mini-btn{border:none;background:transparent;color:#8a7663;cursor:pointer;padding:4px;border-radius:8px;display:inline-flex;}',
      '.gb-mini-btn:hover{background:rgba(111,78,55,.10);color:#6f4e37;}',
      '.gb-mini-btn .lucide{width:15px;height:15px;}',
      '.gb-score-list{margin:9px 0 0;display:flex;flex-direction:column;gap:5px;}',
      '.gb-score-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:#fffdf7;}',
      '.gb-score-name{font:500 12.5px/1.3 Poppins,sans-serif;color:#4b3832;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.gb-score-val{font:600 12.5px/1 Poppins,sans-serif;color:#6f4e37;}',
      '.gb-add-score{margin-top:9px;border:none;background:transparent;color:#6f4e37;font:600 12px/1 Poppins,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 2px;}',
      '.gb-add-score .lucide{width:14px;height:14px;}',
      '.gb-add-cat{width:100%;border:1px dashed rgba(111,78,55,.35);background:transparent;color:#6f4e37;border-radius:12px;padding:10px;font:600 12.5px/1 Poppins,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:2px;}',
      '.gb-add-cat:hover{background:rgba(111,78,55,.06);}',
      '.gb-add-cat .lucide{width:15px;height:15px;}',
      '.gb-grades-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 20px 20px;}',
      '.gb-grades-empty-icon{display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:16px;background:rgba(111,78,55,.11);margin-bottom:11px;}',
      '.gb-grades-empty-icon svg{width:22px;height:22px;stroke:#8a7663;}',
      '.gb-grades-empty h4{margin:0 0 4px;font:700 14px/1.25 Poppins,sans-serif;color:#4b3832;}',
      '.gb-grades-empty p{margin:0;font:500 12px/1.5 Poppins,sans-serif;color:#9a8570;max-width:236px;}',
      /* overlay (second-level, above the class sheet) */
      '.gbsc-backdrop{position:absolute;inset:0;background:rgba(75,56,50,.40);display:flex;align-items:flex-end;justify-content:center;z-index:80;}',
      '.gbsc-backdrop[hidden]{display:none !important;}',
      '.gbsc-sheet{width:100%;max-height:88%;overflow:auto;background:#f5e6ca;border-radius:22px 22px 0 0;padding:18px 18px 20px;box-shadow:0 -8px 30px rgba(75,56,50,.20);}',
      '.gbsc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}',
      '.gbsc-head h3{font:700 17px/1.2 Poppins,sans-serif;color:#4b3832;margin:0;}',
      '.gbsc-close{border:none;background:#fffdf7;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6f4e37;}',
      '.gbsc-close .lucide{width:17px;height:17px;}',
      '.gbsc-label{display:block;font:600 12.5px/1 Poppins,sans-serif;color:#6f4e37;margin:0 0 6px;}',
      '.gbsc-hint{font-weight:400;color:#8a7663;font-size:11px;}',
      '.gbsc-field{margin-bottom:14px;}',
      '.gbsc-input,.gbsc-select{width:100%;box-sizing:border-box;border:1px solid rgba(111,78,55,.20);background:#fffdf7;border-radius:12px;padding:11px 12px;font:500 14px/1.2 Poppins,sans-serif;color:#4b3832;}',
      '.gbsc-input:focus,.gbsc-select:focus{outline:none;border-color:#6f4e37;}',
      '.gbsc-seg{display:flex;background:#fffdf7;border-radius:12px;padding:3px;gap:3px;}',
      '.gbsc-seg button{flex:1;border:none;background:transparent;border-radius:9px;padding:8px;font:600 12.5px/1 Poppins,sans-serif;color:#8a7663;cursor:pointer;}',
      '.gbsc-seg button.active{background:#6f4e37;color:#fffdf7;}',
      '.gbsc-points{display:flex;align-items:center;gap:8px;}',
      '.gbsc-points span{color:#8a7663;font:600 14px/1 Poppins,sans-serif;}',
      '.gbsc-actions{display:flex;gap:10px;margin-top:6px;}',
      '.gbsc-btn{flex:1;border:none;border-radius:14px;padding:13px;font:600 14px/1 Poppins,sans-serif;cursor:pointer;}',
      '.gbsc-btn.ghost{background:#fffdf7;color:#4b3832;}',
      '.gbsc-btn.primary{background:#6f4e37;color:#fffdf7;}',
      '.gbsc-btn.danger{background:transparent;color:#a5504a;flex:0 0 auto;padding:13px 16px;}',
      '.gbsc-chips{display:flex;flex-wrap:wrap;gap:7px;margin:-4px 0 14px;}',
      '.gbsc-chip{border:1px solid rgba(111,78,55,.25);background:#fffdf7;color:#6f4e37;border-radius:999px;padding:7px 13px;font:600 12px/1 Poppins,sans-serif;cursor:pointer;}',
      '.gbsc-chip:hover{background:rgba(111,78,55,.08);}',
    ].join('');
    document.head.appendChild(css);
  }

  /* which class is the open edit-sheet for */
  var currentClassId = null;

  function withClass(fn) {
    var db = load();
    var book = activeBook(db);
    if (!book) return;
    var cls = null,
      period = null;
    book.periods.forEach(function (p) {
      p.classes.forEach(function (c) {
        if (c.id === currentClassId) {
          cls = c;
          period = p;
        }
      });
    });
    if (!cls) return;
    if (!cls.categories) cls.categories = [];
    fn(db, cls);
    save(db);
  }
  function getClass() {
    var db = load();
    var book = activeBook(db);
    if (!book) return null;
    var found = null;
    book.periods.forEach(function (p) {
      p.classes.forEach(function (c) {
        if (c.id === currentClassId) found = c;
      });
    });
    return found;
  }

  /* ---------- second-level overlay ---------- */
  var overlay = null;
  function ensureOverlay() {
    if (overlay) return overlay;
    var phone = document.querySelector('.phone') || document.body;
    overlay = document.createElement('div');
    overlay.className = 'gbsc-backdrop';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="gbsc-sheet" role="dialog" aria-modal="true">' +
      '<div class="gbsc-head"><h3 id="gbscTitle">Add</h3>' +
      '<button class="gbsc-close" id="gbscClose"><i data-lucide="x"></i></button></div>' +
      '<div id="gbscBody"></div></div>';
    phone.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });
    overlay.querySelector('#gbscClose').addEventListener('click', closeOverlay);
    if (window.lucide) window.lucide.createIcons();
    return overlay;
  }
  function openOverlay(title, bodyEl) {
    ensureOverlay();
    overlay.querySelector('#gbscTitle').textContent = title;
    var body = overlay.querySelector('#gbscBody');
    body.innerHTML = '';
    body.appendChild(bodyEl);
    overlay.hidden = false;
    if (window.lucide) window.lucide.createIcons();
  }
  function closeOverlay() {
    if (overlay) overlay.hidden = true;
  }

  /* ---------- category sheet ---------- */
  function categorySheet(existing) {
    var wrap = document.createElement('div');
    var presets = [
      'Tests',
      'Homework',
      'Projects',
      'Quizzes',
      'Participation',
      'Labs',
      'Essays',
      'Final',
    ];
    var chips = existing
      ? ''
      : '<div class="gbsc-chips">' +
        presets
          .map(function (p) {
            return (
              '<button type="button" class="gbsc-chip" data-preset="' +
              esc(p) +
              '">' +
              esc(p) +
              '</button>'
            );
          })
          .join('') +
        '</div>';
    wrap.innerHTML =
      chips +
      '<div class="gbsc-field"><label class="gbsc-label">Category name</label>' +
      '<input class="gbsc-input" id="gbscCatName" placeholder="e.g. Tests" value="' +
      esc(existing ? existing.name : '') +
      '"></div>' +
      '<div class="gbsc-field"><label class="gbsc-label">Weight <span class="gbsc-hint">optional, % of grade</span></label>' +
      '<input class="gbsc-input" id="gbscCatWt" type="number" min="0" max="100" placeholder="e.g. 40" value="' +
      esc(existing && existing.weight != null ? existing.weight : '') +
      '"></div>' +
      '<div class="gbsc-actions">' +
      (existing
        ? '<button class="gbsc-btn danger" id="gbscCatDel">Delete</button>'
        : '') +
      '<button class="gbsc-btn ghost" id="gbscCatCancel">Cancel</button>' +
      '<button class="gbsc-btn primary" id="gbscCatSave">Save</button></div>';

    wrap.querySelectorAll('.gbsc-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        wrap.querySelector('#gbscCatName').value =
          c.getAttribute('data-preset');
      });
    });
    wrap
      .querySelector('#gbscCatCancel')
      .addEventListener('click', closeOverlay);
    wrap.querySelector('#gbscCatSave').addEventListener('click', function () {
      var name = wrap.querySelector('#gbscCatName').value.trim();
      if (!name) {
        wrap.querySelector('#gbscCatName').focus();
        return;
      }
      var wt = wrap.querySelector('#gbscCatWt').value.trim();
      withClass(function (db, cls) {
        if (existing) {
          var c = cls.categories.find(function (x) {
            return x.id === existing.id;
          });
          if (c) {
            c.name = name;
            c.weight = wt === '' ? null : parseFloat(wt);
          }
        } else {
          cls.categories.push({
            id: uid(),
            name: name,
            weight: wt === '' ? null : parseFloat(wt),
            items: [],
          });
        }
      });
      closeOverlay();
      renderGrades();
    });
    if (existing) {
      wrap.querySelector('#gbscCatDel').addEventListener('click', function () {
        confirmSheet('Delete this category and its scores?', function () {
          withClass(function (db, cls) {
            cls.categories = cls.categories.filter(function (x) {
              return x.id !== existing.id;
            });
          });
          closeOverlay();
          renderGrades();
        });
      });
    }
    openOverlay(existing ? 'Edit category' : 'New category', wrap);
    setTimeout(function () {
      var n = wrap.querySelector('#gbscCatName');
      if (n && !existing) n.focus();
    }, 30);
  }

  /* ---------- score sheet ---------- */
  function scoreSheet(catId, existing) {
    var wrap = document.createElement('div');
    var type = existing ? existing.type : 'points';
    var letterOpts = ['<option value="">— select —</option>']
      .concat(
        LETTERS.map(function (l) {
          return (
            '<option value="' +
            l +
            '"' +
            (existing && existing.value === l ? ' selected' : '') +
            '>' +
            l +
            '</option>'
          );
        })
      )
      .join('');
    wrap.innerHTML =
      '<div class="gbsc-field"><label class="gbsc-label">Score name</label>' +
      '<input class="gbsc-input" id="gbscScName" placeholder="e.g. Unit 3 Test" value="' +
      esc(existing ? existing.name : '') +
      '"></div>' +
      '<div class="gbsc-field"><label class="gbsc-label">Score type</label>' +
      '<div class="gbsc-seg" id="gbscSeg">' +
      '<button type="button" data-t="letter"' +
      (type === 'letter' ? ' class="active"' : '') +
      '>Letter</button>' +
      '<button type="button" data-t="percent"' +
      (type === 'percent' ? ' class="active"' : '') +
      '>Percent</button>' +
      '<button type="button" data-t="points"' +
      (type === 'points' ? ' class="active"' : '') +
      '>Points</button>' +
      '</div></div>' +
      '<div class="gbsc-field" id="gbscValWrap"></div>' +
      '<div class="gbsc-actions">' +
      (existing
        ? '<button class="gbsc-btn danger" id="gbscScDel">Delete</button>'
        : '') +
      '<button class="gbsc-btn ghost" id="gbscScCancel">Cancel</button>' +
      '<button class="gbsc-btn primary" id="gbscScSave">Save</button></div>';

    var valWrap = wrap.querySelector('#gbscValWrap');
    function renderVal(t) {
      if (t === 'letter') {
        valWrap.innerHTML =
          '<label class="gbsc-label">Letter grade</label><select class="gbsc-select" id="gbscVal">' +
          letterOpts +
          '</select>';
      } else if (t === 'percent') {
        valWrap.innerHTML =
          '<label class="gbsc-label">Percentage</label><input class="gbsc-input" id="gbscVal" type="number" min="0" step="0.01" placeholder="e.g. 92" value="' +
          esc(existing && existing.type === 'percent' ? existing.value : '') +
          '">';
      } else {
        valWrap.innerHTML =
          '<label class="gbsc-label">Points earned / total</label><div class="gbsc-points">' +
          '<input class="gbsc-input" id="gbscGot" type="number" min="0" step="0.01" placeholder="18" value="' +
          esc(existing && existing.type === 'points' ? existing.got : '') +
          '">' +
          '<span>/</span>' +
          '<input class="gbsc-input" id="gbscOut" type="number" min="0" step="0.01" placeholder="20" value="' +
          esc(existing && existing.type === 'points' ? existing.out : '') +
          '"></div>';
      }
    }
    renderVal(type);
    var curType = type;
    wrap.querySelectorAll('#gbscSeg button').forEach(function (b) {
      b.addEventListener('click', function () {
        wrap.querySelectorAll('#gbscSeg button').forEach(function (x) {
          x.classList.remove('active');
        });
        b.classList.add('active');
        curType = b.getAttribute('data-t');
        renderVal(curType);
      });
    });
    wrap.querySelector('#gbscScCancel').addEventListener('click', closeOverlay);
    wrap.querySelector('#gbscScSave').addEventListener('click', function () {
      var name = wrap.querySelector('#gbscScName').value.trim();
      if (!name) {
        wrap.querySelector('#gbscScName').focus();
        return;
      }
      var rec = {
        id: existing ? existing.id : uid(),
        name: name,
        type: curType,
        value: '',
        got: '',
        out: '',
      };
      if (curType === 'letter' || curType === 'percent') {
        rec.value = wrap.querySelector('#gbscVal').value;
      } else {
        rec.got = wrap.querySelector('#gbscGot').value;
        rec.out = wrap.querySelector('#gbscOut').value;
      }
      withClass(function (db, cls) {
        var cat = cls.categories.find(function (x) {
          return x.id === catId;
        });
        if (!cat) return;
        if (!cat.items) cat.items = [];
        if (existing) {
          var i = cat.items.findIndex(function (x) {
            return x.id === existing.id;
          });
          if (i >= 0) cat.items[i] = rec;
        } else {
          cat.items.push(rec);
        }
      });
      closeOverlay();
      renderGrades();
    });
    if (existing) {
      wrap.querySelector('#gbscScDel').addEventListener('click', function () {
        withClass(function (db, cls) {
          var cat = cls.categories.find(function (x) {
            return x.id === catId;
          });
          if (cat)
            cat.items = cat.items.filter(function (x) {
              return x.id !== existing.id;
            });
        });
        closeOverlay();
        renderGrades();
      });
    }
    openOverlay(existing ? 'Edit score' : 'Add score', wrap);
    setTimeout(function () {
      var n = wrap.querySelector('#gbscScName');
      if (n && !existing) n.focus();
    }, 30);
  }

  function confirmSheet(msg, onYes) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<p style="font:500 14px/1.5 Poppins,sans-serif;color:#4b3832;margin:0 0 16px;">' +
      esc(msg) +
      '</p>' +
      '<div class="gbsc-actions"><button class="gbsc-btn ghost" id="gbscNo">Cancel</button>' +
      '<button class="gbsc-btn primary" id="gbscYes" style="background:#a5504a;">Delete</button></div>';
    wrap.querySelector('#gbscNo').addEventListener('click', closeOverlay);
    wrap.querySelector('#gbscYes').addEventListener('click', function () {
      onYes();
    });
    openOverlay('Are you sure?', wrap);
  }

  /* ---------- render grades section inside the class sheet ---------- */
  function buildSection(cls) {
    var sec = document.createElement('div');
    sec.className = 'gb-grades-sec';
    sec.id = 'gbGradesSec';
    var cAvg = classAvg(cls);
    var html =
      '<div class="gb-grades-head"><h4>Grades</h4>' +
      (cAvg !== null
        ? '<span class="gb-gr-avg">' +
          fmtPct(cAvg) +
          ' · ' +
          pctToLetter(cAvg) +
          '</span>'
        : '') +
      '</div>' +
      '<p class="gb-grades-hint">Optional — add categories (tests, homework…) and log individual scores to track this class.</p>';

    var cats = cls.categories || [];
    if (!cats.length) {
      html +=
        '<div class="gb-grades-empty">' +
        '<span class="gb-grades-empty-icon"><i data-lucide="folder-plus"></i></span>' +
        '<h4>No categories yet</h4>' +
        '<p>Add one like Tests or Homework, then log each score inside it.</p>' +
        '</div>';
    }
    cats.forEach(function (cat) {
      var a = catAvg(cat);
      html +=
        '<div class="gb-cat" data-cat="' +
        cat.id +
        '">' +
        '<div class="gb-cat-head">' +
        '<span class="gb-cat-name">' +
        esc(cat.name) +
        '</span>' +
        (cat.weight != null
          ? '<span class="gb-cat-wt">' + esc(cat.weight) + '%</span>'
          : '') +
        '<span class="gb-cat-avg">' +
        fmtPct(a) +
        (a !== null ? ' · ' + pctToLetter(a) : '') +
        '</span>' +
        '<button class="gb-mini-btn" data-editcat="' +
        cat.id +
        '" title="Edit category"><i data-lucide="pencil"></i></button>' +
        '</div>';
      html += '<div class="gb-score-list">';
      (cat.items || []).forEach(function (s) {
        html +=
          '<div class="gb-score-row">' +
          '<span class="gb-score-name">' +
          esc(s.name) +
          '</span>' +
          '<span class="gb-score-val">' +
          esc(scoreLabel(s)) +
          '</span>' +
          '<button class="gb-mini-btn" data-editscore="' +
          s.id +
          '" data-scat="' +
          cat.id +
          '" title="Edit score"><i data-lucide="pencil"></i></button>' +
          '</div>';
      });
      html += '</div>';
      html +=
        '<button class="gb-add-score" data-addscore="' +
        cat.id +
        '"><i data-lucide="plus"></i> Add score</button>';
      html += '</div>';
    });
    html +=
      '<button class="gb-add-cat" data-addcat="1"><i data-lucide="folder-plus"></i> Add category</button>';
    sec.innerHTML = html;

    sec.querySelectorAll('[data-addcat]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        categorySheet(null);
      });
    });
    sec.querySelectorAll('[data-editcat]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var cid = b.getAttribute('data-editcat');
        var c = (getClass().categories || []).find(function (x) {
          return x.id === cid;
        });
        categorySheet(c);
      });
    });
    sec.querySelectorAll('[data-addscore]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        scoreSheet(b.getAttribute('data-addscore'), null);
      });
    });
    sec.querySelectorAll('[data-editscore]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var sid = b.getAttribute('data-editscore'),
          cid = b.getAttribute('data-scat');
        var cat = (getClass().categories || []).find(function (x) {
          return x.id === cid;
        });
        var sc =
          cat &&
          cat.items.find(function (x) {
            return x.id === sid;
          });
        scoreSheet(cid, sc);
      });
    });
    return sec;
  }

  function renderGrades() {
    injectCSS();
    var __cv = document.getElementById('gbClassView');
    if (__cv && !__cv.hidden) {
      gbRenderClassPage();
      return;
    }
    var sheet = document.getElementById('gbSheet');
    if (!sheet) return;
    var cls = getClass();
    var old = document.getElementById('gbGradesSec');
    if (old) old.remove();
    if (!cls) return;
    var sec = buildSection(cls);
    var form = document.getElementById('gbForm');
    if (form && form.parentNode === sheet)
      sheet.insertBefore(sec, form.nextSibling);
    else sheet.appendChild(sec);
    if (window.lucide) window.lucide.createIcons();
  }

  /* is the class edit-sheet currently open? */
  function sheetIsClassEdit() {
    var backdrop = document.getElementById('gbBackdrop');
    var title = document.getElementById('gbSheetTitle');
    if (!backdrop || !title) return false;
    if (backdrop.hidden) return false;
    var t = (title.textContent || '').toLowerCase();
    return t.indexOf('class') >= 0; /* "Add class" or "Edit class" */
  }

  function syncSheet() {
    if (sheetIsClassEdit() && currentClassId) {
      if (!document.getElementById('gbGradesSec')) renderGrades();
    } else {
      var old = document.getElementById('gbGradesSec');
      if (old) old.remove();
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    injectCSS();
    /* capture which class card was tapped, BEFORE the app opens its sheet */
    document.addEventListener(
      'click',
      function (e) {
        var card = e.target.closest ? e.target.closest('.gb-class') : null;
        if (card) {
          var list = document.getElementById('gbClasses');
          if (list) {
            var cards = [].slice.call(list.querySelectorAll('.gb-class'));
            var idx = cards.indexOf(card);
            var db = load();
            var period = activePeriod(activeBook(db));
            if (period && period.classes[idx])
              currentClassId = period.classes[idx].id;
          }
        }
      },
      true
    );

    var body = document.body;
    var mo = new MutationObserver(function () {
      syncSheet();
    });
    mo.observe(body, {
      attributes: true,
      subtree: true,
      childList: true,
      attributeFilter: ['hidden', 'class'],
    });
    syncSheet();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();

  (function () {
    var st = document.createElement('style');
    st.id = 'gbsc-override-style';
    st.textContent =
      '/* layout fixes */.gb-class-main{display:flex !important;flex-direction:column !important;gap:3px !important;min-width:0 !important;}.gb-class-name{display:block !important;font-weight:600 !important;}.gb-class-sub{display:block !important;font-size:11.5px !important;color:#9a8570 !important;line-height:1.2 !important;}#gbClasses{gap:12px !important;}.gb-class{padding:14px 15px !important;}/* class edit sheet: compact so form + grades fit */#gbSheet{max-height:90% !important;padding:18px 18px 22px !important;}#gbForm{display:flex;flex-direction:column;gap:11px !important;}#gbForm label,#gbForm .gb-field{margin:0 !important;}#gbSheet h3{margin-bottom:6px !important;}/* grades section spacing */#gbGradesSec{margin-top:16px !important;padding-top:16px !important;border-top:1px solid rgba(111,78,55,.15) !important;}';
    if (!document.getElementById('gbsc-override-style'))
      document.head.appendChild(st);
  })();

  /* ===== Full class page (fixes save bug + roomy layout) ===== */
  var gbAllowSheet = false; // when true, let the app open its own edit sheet

  function gbInjectPageCSS() {
    if (document.getElementById('gbcp-style')) return;
    var st = document.createElement('style');
    st.id = 'gbcp-style';
    st.textContent = [
      '#gbClassView{padding:2px 2px 90px;}',
      '#gbClassView[hidden]{display:none !important;}',
      '.gbcp-top{display:flex;align-items:center;gap:6px;margin:2px 0 12px;}',
      '.gbcp-back{display:inline-flex;align-items:center;gap:5px;border:none;background:transparent;color:#6f4e37;font:600 13px/1 Poppins,sans-serif;cursor:pointer;padding:4px 2px;}',
      '.gbcp-back .lucide{width:17px;height:17px;}',
      '.gbcp-titlerow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}',
      '.gbcp-title{font:700 23px/1.15 Poppins,sans-serif;color:#4b3832;margin:0;word-break:break-word;}',
      '.gbcp-grade{flex:0 0 auto;background:#efe2c8;color:#6f4e37;border-radius:999px;padding:7px 13px;font:700 13px/1 Poppins,sans-serif;white-space:nowrap;}',
      '.gbcp-teacher{color:#9a8570;font:500 13px/1.3 Poppins,sans-serif;margin:0 0 12px;}',
      '.gbcp-titleside{display:flex;align-items:center;gap:8px;flex:0 0 auto;}',
      '.gbcp-edit{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(111,78,55,.25);background:#fffdf7;color:#6f4e37;border-radius:999px;padding:8px 13px;font:600 12.5px/1 Poppins,sans-serif;cursor:pointer;}',
      '.gbcp-edit .lucide{width:16px;height:16px;}',
      '.gbcp-instr{background:transparent;border:none;padding:0 2px;color:#9a8570;font:500 12.5px/1.5 Poppins,sans-serif;margin:0 0 18px;}',
      '#gbClassView #gbGradesPage{margin-top:0 !important;padding-top:0 !important;border-top:none !important;}',
      '#gbClassView .gb-grades-head{display:none;}',
      '#gbClassView .gb-grades-hint{display:none;}',
      '.gbcp-calc{background:#efe2c8;border-radius:16px;padding:15px 16px;margin:2px 0 14px;}',
      '.gbcp-calc-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}',
      '.gbcp-calc-lbl{color:#7a6553;font:600 12.5px/1 Poppins,sans-serif;}',
      '.gbcp-calc-val{color:#4b3832;font:700 17px/1 Poppins,sans-serif;text-align:right;}',
      '.gbcp-set-lbl{display:block;color:#7a6553;font:600 12px/1.3 Poppins,sans-serif;margin-bottom:8px;}',
      '.gbcp-set-row{display:flex;gap:8px;margin-bottom:10px;}',
      '.gbcp-set-type{flex:0 0 auto;border:1px solid rgba(111,78,55,0.22);background:#fffdf7;color:#4b3832;border-radius:10px;padding:9px 10px;font:600 12.5px/1 Poppins,sans-serif;cursor:pointer;}',
      '.gbcp-set-val{flex:1 1 auto;min-width:0;border:1px solid rgba(111,78,55,0.22);background:#fffdf7;color:#4b3832;border-radius:10px;padding:9px 11px;font:500 13px/1 Poppins,sans-serif;}',
      '.gbcp-set-val:disabled{opacity:0.5;}',
      '.gbcp-set-actions{display:flex;gap:8px;}',
      '.gbcp-usecalc{flex:1 1 auto;border:1px solid rgba(111,78,55,0.3);background:transparent;color:#6f4e37;border-radius:10px;padding:9px 10px;font:600 12.5px/1 Poppins,sans-serif;cursor:pointer;}',
      '.gbcp-save{flex:1 1 auto;border:none;background:#6f4e37;color:#fffdf7;border-radius:10px;padding:9px 10px;font:600 12.5px/1 Poppins,sans-serif;cursor:pointer;}',
      '#gbSheet #gbGradesSec{display:none !important;}',
    ].join('');
    document.head.appendChild(st);
  }

  function gbEnsureClassView() {
    var view = document.getElementById('gbClassView');
    if (view) return view;
    var screen = document.querySelector('.screen');
    var bookView = document.getElementById('bookView');
    if (!screen || !bookView) return null;
    view = document.createElement('section');
    view.id = 'gbClassView';
    view.hidden = true;
    screen.appendChild(view);
    return view;
  }

  function gbBackToBook() {
    var view = document.getElementById('gbClassView');
    var bookView = document.getElementById('bookView');
    if (view) view.hidden = true;
    if (bookView) bookView.hidden = false;
    // Scores may have changed while the class was open, so let the book page
    // redraw its averages instead of showing a stale number.
    if (typeof window.eeGradebookRefresh === 'function') {
      try {
        window.eeGradebookRefresh();
      } catch (e) {}
    }
  }

  function gbGradeBadge(cls) {
    if (!cls) return '';
    // A grade worked out from real logged scores beats anything typed by hand.
    var auto = classAvg(cls);
    if (auto !== null) return fmtPct(auto);
    if (cls.gradeType === 'letter' && cls.gradeValue)
      return esc(cls.gradeValue);
    if (
      cls.gradeType === 'percent' &&
      cls.gradeValue !== '' &&
      cls.gradeValue != null
    )
      return esc(cls.gradeValue) + '%';
    if (cls.gradeType === 'points' && cls.gradeValue)
      return esc(cls.gradeValue);
    return '';
  }

  function gbWireCalc(wrap, cls) {
    var avg = classAvg(cls);
    var valEl = wrap.querySelector('#gbcpCalcVal');
    if (valEl) {
      valEl.textContent =
        avg === null ? 'No scores yet' : fmtPct(avg) + '  ' + pctToLetter(avg);
    }
  }

  function gbUpdateListBadge(cls) {
    if (!cls) return;
    var list = document.getElementById('gbClasses');
    if (!list) return;
    var db = load();
    var book = activeBook(db);
    if (!book) return;
    var per = document.querySelector('#gbPeriods .gb-period.active');
    var pIdx = 0;
    if (per && per.parentElement)
      pIdx = Array.prototype.indexOf.call(
        per.parentElement.querySelectorAll('.gb-period'),
        per
      );
    var period = book.periods[pIdx < 0 ? 0 : pIdx];
    if (!period) return;
    var cIdx = -1;
    period.classes.forEach(function (c, i) {
      if (c.id === cls.id) cIdx = i;
    });
    if (cIdx < 0) return;
    var cards = list.querySelectorAll('.gb-class');
    var card = cards[cIdx];
    if (!card) return;
    var g = card.querySelector('.gb-class-grade');
    var txt = gbGradeBadge(cls);
    if (g) g.textContent = txt || '';
  }

  function gbRenderClassPage() {
    gbInjectPageCSS();
    var view = gbEnsureClassView();
    if (!view) return;
    var cls = getClass();
    if (!cls) {
      gbBackToBook();
      return;
    }
    var badge = gbGradeBadge(cls);
    view.innerHTML = '';
    var wrap = document.createElement('div');
    var head =
      '<div class="gbcp-top"><button class="gbcp-back" type="button"><i data-lucide="chevron-left"></i>All classes</button></div>' +
      // Grade badge and Edit share the title row, so Edit no longer costs a
      // whole empty line of its own.
      '<div class="gbcp-titlerow"><h2 class="gbcp-title">' +
      esc(cls.name || 'Class') +
      '</h2><div class="gbcp-titleside">' +
      (badge ? '<span class="gbcp-grade">' + badge + '</span>' : '') +
      '<button class="gbcp-edit" type="button"><i data-lucide="pencil"></i>Edit</button>' +
      '</div></div>' +
      (cls.teacher
        ? '<p class="gbcp-teacher">' + esc(cls.teacher) + '</p>'
        : '') +
      '<p class="gbcp-instr">Track this class here. Add categories like tests or homework, then log each score as a letter, a percentage, or points out of a total.</p>' +
      '<div class="gbcp-calc" id="gbcpCalc"><div class="gbcp-calc-row"><span class="gbcp-calc-lbl">Calculated total</span><span class="gbcp-calc-val" id="gbcpCalcVal"></span></div></div>';
    wrap.innerHTML = head;
    view.appendChild(wrap);
    var gsec = buildSection(cls);
    gsec.id = 'gbGradesPage';
    view.appendChild(gsec);
    view.hidden = false;
    gbWireCalc(wrap, cls);
    wrap.querySelector('.gbcp-back').addEventListener('click', gbBackToBook);
    wrap.querySelector('.gbcp-edit').addEventListener('click', function () {
      gbOpenEditSheet();
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function gbCardIndex(card) {
    var list = card.parentElement;
    if (!list) return -1;
    return Array.prototype.indexOf.call(
      list.querySelectorAll('.gb-class'),
      card
    );
  }

  function gbOpenEditSheet() {
    var list = document.getElementById('gbClasses');
    var bookView = document.getElementById('bookView');
    var view = document.getElementById('gbClassView');
    if (bookView) bookView.hidden = false;
    if (view) view.hidden = true;
    // resolve card index via DOM active period (robust)
    var db = load();
    var book = (db.books || []).find(function (b) {
      return b.id === db.activeBook;
    });
    var perEls = Array.prototype.slice.call(
      document.querySelectorAll('#gbPeriods .gb-period')
    );
    var activeIdx = perEls.findIndex(function (el) {
      return el.classList.contains('active');
    });
    if (activeIdx < 0) activeIdx = 0;
    var per = book ? book.periods[activeIdx] : null;
    var idx = per
      ? (per.classes || [])
          .map(function (c) {
            return c.id;
          })
          .indexOf(currentClassId)
      : -1;
    var cards = list ? list.querySelectorAll('.gb-class') : [];
    if (idx < 0 || !cards[idx]) {
      return;
    }
    gbAllowSheet = true;
    cards[idx].click();
    gbAllowSheet = false;
    var backdrop = document.getElementById('gbBackdrop');
    if (!backdrop) {
      gbRenderClassPage();
      return;
    }
    var mo = new MutationObserver(function () {
      if (backdrop.hidden) {
        mo.disconnect();
        // class may have been deleted; getClass handles null
        gbRenderClassPage();
      }
    });
    mo.observe(backdrop, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* capture class taps FIRST, route to our page instead of the native sheet */
  function gbResolveTappedClass(card) {
    var list = card.parentElement;
    if (!list || list.id !== 'gbClasses') return null;
    var idx = Array.prototype.indexOf.call(
      list.querySelectorAll('.gb-class'),
      card
    );
    if (idx < 0) return null;
    var db = load();
    var book = (db.books || []).find(function (b) {
      return b.id === db.activeBook;
    });
    if (!book) return null;
    var perEls = Array.prototype.slice.call(
      document.querySelectorAll('#gbPeriods .gb-period')
    );
    var activeIdx = perEls.findIndex(function (el) {
      return el.classList.contains('active');
    });
    if (activeIdx < 0) activeIdx = 0;
    var per = book.periods[activeIdx];
    if (!per) return null;
    return per.classes[idx] || null;
  }
  document.addEventListener(
    'click',
    function (e) {
      if (gbAllowSheet) return;
      var card = e.target.closest && e.target.closest('.gb-class');
      if (!card) return;
      if (!card.parentElement || card.parentElement.id !== 'gbClasses') return;
      var cls = gbResolveTappedClass(card);
      if (!cls) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      currentClassId = cls.id;
      var bookView = document.getElementById('bookView');
      if (bookView) bookView.hidden = true;
      gbRenderClassPage();
    },
    true
  );
})();
