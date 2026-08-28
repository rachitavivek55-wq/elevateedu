(function () {
  'use strict';
  var KEY = 'elevate_gradebook';

  /* ---------- palette ---------- */
  var SWATCHES = [
    '#6f4e37',
    '#a9746e',
    '#8c9a5b',
    '#c08457',
    '#7a6a99',
    '#4b7d78',
    '#b0645e',
    '#9a7b4f',
  ];

  /* ---------- data ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.books) return d;
    } catch (e) {}
    return { books: [], activeBook: null };
  }
  function save() {
    // gbscores.js writes category scores into the same key from its own copy of
    // the data. Re-read what is on disk and keep those scores so a save from
    // this file can never wipe out a score that was logged a moment ago.
    try {
      var live = JSON.parse(localStorage.getItem(KEY));
      if (live && live.books) {
        var cats = {};
        live.books.forEach(function (b) {
          (b.periods || []).forEach(function (p) {
            (p.classes || []).forEach(function (c) {
              if (c && c.id && c.categories) cats[c.id] = c.categories;
            });
          });
        });
        (DB.books || []).forEach(function (b) {
          (b.periods || []).forEach(function (p) {
            (p.classes || []).forEach(function (c) {
              if (c && cats[c.id]) c.categories = cats[c.id];
            });
          });
        });
      }
    } catch (e) {}
    localStorage.setItem(KEY, JSON.stringify(DB));
  }
  var DB = load();

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function todayISO() {
    return new Date().toISOString();
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }
  function addedLabel(iso) {
    var s = fmtDate(iso);
    return s ? 'added ' + s : '';
  }

  /* ---------- grade conversion ---------- */
  // Everything is normalized to a 0-100 percent for averaging.
  var LETTERS = [
    { l: 'A+', min: 97 },
    { l: 'A', min: 93 },
    { l: 'A-', min: 90 },
    { l: 'B+', min: 87 },
    { l: 'B', min: 83 },
    { l: 'B-', min: 80 },
    { l: 'C+', min: 77 },
    { l: 'C', min: 73 },
    { l: 'C-', min: 70 },
    { l: 'D+', min: 67 },
    { l: 'D', min: 63 },
    { l: 'D-', min: 60 },
    { l: 'F', min: 0 },
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
  function letterToPct(l) {
    l = (l || '').toUpperCase().trim();
    return LETTER_PCT.hasOwnProperty(l) ? LETTER_PCT[l] : null;
  }
  function pctToLetter(p) {
    for (var i = 0; i < LETTERS.length; i++) {
      if (p >= LETTERS[i].min) return LETTERS[i].l;
    }
    return 'F';
  }
  function pctToGpa(p) {
    if (p >= 97) return 4.0;
    if (p >= 93) return 4.0;
    if (p >= 90) return 3.7;
    if (p >= 87) return 3.3;
    if (p >= 83) return 3.0;
    if (p >= 80) return 2.7;
    if (p >= 77) return 2.3;
    if (p >= 73) return 2.0;
    if (p >= 70) return 1.7;
    if (p >= 67) return 1.3;
    if (p >= 63) return 1.0;
    if (p >= 60) return 0.7;
    return 0.0;
  }
  /* ---------- weighted scores (kept in sync with gbscores.js) ---------- */
  // One logged score -> a percent, or null when it cannot be read.
  function scoreItemPct(s) {
    if (!s) return null;
    if (s.type === 'letter') return letterToPct(s.value);
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
  // Average of every score logged for a class, honouring category weights.
  // Categories with no scores yet sit the round out, so a 10% homework
  // category still moves the total straight away.
  function scoresAvg(cls) {
    if (!cls || !cls.categories || !cls.categories.length) return null;
    var parts = [];
    cls.categories.forEach(function (c) {
      var items = (c && c.items) || [];
      var vals = items.map(scoreItemPct).filter(function (x) {
        return x !== null;
      });
      if (!vals.length) return;
      var a =
        vals.reduce(function (x, y) {
          return x + y;
        }, 0) / vals.length;
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
  // returns percent (number) or null
  function gradeToPct(cls) {
    // Logged scores always win over a hand-typed grade.
    var auto = scoresAvg(cls);
    if (auto !== null) return auto;
    if (cls.gradeType === 'percent') {
      var v = parseFloat(cls.gradeValue);
      return isNaN(v) ? null : v;
    }
    if (cls.gradeType === 'number') {
      var v2 = parseFloat(cls.gradeValue),
        mx = parseFloat(cls.gradeMax);
      if (isNaN(v2)) return null;
      if (isNaN(mx) || mx <= 0) mx = 100;
      return (v2 / mx) * 100;
    }
    if (cls.gradeType === 'letter') {
      return letterToPct(cls.gradeValue);
    }
    return null;
  }
  function gradeDisplay(cls) {
    var autoD = scoresAvg(cls);
    if (autoD !== null) return Math.round(autoD * 10) / 10 + '%';
    if (cls.gradeType === 'letter') {
      return (cls.gradeValue || '').toUpperCase();
    }
    if (cls.gradeType === 'percent') {
      var v = parseFloat(cls.gradeValue);
      return isNaN(v) ? '—' : Math.round(v * 10) / 10 + '%';
    }
    if (cls.gradeType === 'number') {
      var a = cls.gradeValue,
        b = cls.gradeMax;
      if (a == null || a === '') return '—';
      return a + (b ? ' / ' + b : '');
    }
    return '—';
  }
  function gradeColor(p) {
    if (p == null) return 'var(--gb-muted)';
    if (p >= 90) return 'var(--gb-good)';
    if (p >= 80) return 'var(--gb-coffee)';
    if (p >= 70) return 'var(--gb-warn)';
    return 'var(--gb-bad)';
  }

  /* ---------- averaging ---------- */
  function periodAvg(period) {
    if (!period) return null;
    var sum = 0,
      n = 0;
    period.classes.forEach(function (c) {
      var p = gradeToPct(c);
      if (p != null) {
        sum += p;
        n++;
      }
    });
    return n ? sum / n : null;
  }
  function bookAvg(book) {
    var sum = 0,
      n = 0;
    book.periods.forEach(function (pr) {
      var a = periodAvg(pr);
      if (a != null) {
        sum += a;
        n++;
      }
    });
    return n ? sum / n : null;
  }

  /* ---------- dom helpers ---------- */
  function $(id) {
    return document.getElementById(id);
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- view switching ---------- */
  function show(view) {
    ['booksView', 'bookView', 'progressView'].forEach(function (v) {
      var n = $(v);
      if (n) n.hidden = v !== view;
    });
  }

  /* ---------- render: books grid ---------- */
  function renderBooks() {
    var wrap = $('gbBooks');
    wrap.innerHTML = '';
    if (!DB.books.length) {
      wrap.appendChild(
        el(
          'div',
          'gb-empty',
          'No books yet. Create one for your grade or school year to start tracking.'
        )
      );
    }
    DB.books.forEach(function (b) {
      var avg = bookAvg(b);
      var card = el('button', 'gb-book');
      card.style.setProperty('--spine', b.color || SWATCHES[0]);
      var avgTxt =
        avg == null
          ? '—'
          : pctToLetter(avg) + ' · ' + Math.round(avg * 10) / 10 + '%';
      card.innerHTML =
        '<span class="gb-book-spine"></span>' +
        '<span class="gb-book-name">' +
        esc(b.name) +
        '</span>' +
        '<span class="gb-book-meta">' +
        '<span class="gb-book-avg">' +
        esc(avgTxt) +
        '</span>' +
        '<span class="gb-book-sub">' +
        b.periods.length +
        ' section' +
        (b.periods.length === 1 ? '' : 's') +
        '</span>' +
        '</span>';
      card.addEventListener('click', function () {
        openBook(b.id);
      });
      wrap.appendChild(card);
    });
  }

  /* ---------- render: single book ---------- */
  var activePeriodId = null;
  function openBook(id) {
    DB.activeBook = id;
    save();
    var b = getBook();
    if (!b) return;
    if (
      !activePeriodId ||
      !b.periods.some(function (p) {
        return p.id === activePeriodId;
      })
    ) {
      activePeriodId = b.periods.length ? b.periods[0].id : null;
    }
    renderBook();
    show('bookView');
  }
  function getBook() {
    return (
      DB.books.filter(function (b) {
        return b.id === DB.activeBook;
      })[0] || null
    );
  }
  function getPeriod() {
    var b = getBook();
    if (!b) return null;
    return (
      b.periods.filter(function (p) {
        return p.id === activePeriodId;
      })[0] || null
    );
  }

  function renderBook() {
    var b = getBook();
    if (!b) return;
    $('gbBookTitle').textContent = b.name;
    var ba = bookAvg(b);
    $('gbBookGpa').textContent =
      ba == null
        ? 'GPA —'
        : 'GPA ' + (Math.round(pctToGpa(ba) * 100) / 100).toFixed(2);

    // period tabs
    var pt = $('gbPeriods');
    pt.innerHTML = '';
    b.periods.forEach(function (p) {
      var t = el(
        'button',
        'gb-period' + (p.id === activePeriodId ? ' active' : ''),
        esc(p.name)
      );
      t.addEventListener('click', function () {
        activePeriodId = p.id;
        renderBook();
      });
      pt.appendChild(t);
    });

    // section summary
    var period = getPeriod();
    var ss = $('gbSectionSummary');
    ss.innerHTML = '';
    if (period) {
      var pa = periodAvg(period);
      ss.appendChild(
        stat(pa == null ? '—' : Math.round(pa * 10) / 10 + '%', 'Average')
      );
      ss.appendChild(stat(pa == null ? '—' : pctToLetter(pa), 'Letter'));
      ss.appendChild(
        stat(
          pa == null ? '—' : (Math.round(pctToGpa(pa) * 100) / 100).toFixed(2),
          'GPA'
        )
      );
      ss.appendChild(stat(String(period.classes.length), 'Classes'));
    }

    // class list

    // --- easy delete for the current section ---
    var __delWrap = $('gbSectionDelete');
    if (__delWrap) {
      __delWrap.remove();
    }
    if (period) {
      var delRow = el('div', 'gb-section-del');
      delRow.id = 'gbSectionDelete';
      var delBtn = el(
        'button',
        'gb-section-del-btn',
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg> Delete section'
      );
      delBtn.type = 'button';
      delBtn.addEventListener('click', function () {
        confirmDeletePeriod(period.id);
      });
      delRow.appendChild(delBtn);
      ss.parentNode.insertBefore(delRow, ss.nextSibling);
    }

    var cl = $('gbClasses');
    cl.innerHTML = '';
    if (!period) {
      cl.appendChild(
        el(
          'div',
          'gb-empty',
          'Add a section (year, semester, quarter…) to begin.'
        )
      );
    } else if (!period.classes.length) {
      cl.appendChild(
        el(
          'div',
          'gb-empty',
          'No classes yet in this section. Tap “Add class” below.'
        )
      );
    } else {
      period.classes.forEach(function (c) {
        var p = gradeToPct(c);
        var row = el('button', 'gb-class');
        row.innerHTML =
          '<span class="gb-class-swatch" style="background:' +
          (c.color || SWATCHES[0]) +
          '"></span>' +
          '<span class="gb-class-main">' +
          '<span class="gb-class-name">' +
          esc(c.name) +
          '</span>' +
          '<span class="gb-class-sub">' +
          (c.teacher ? esc(c.teacher) + ' · ' : '') +
          addedLabel(c.dateAdded) +
          '</span>' +
          '</span>' +
          '<span class="gb-class-grade" style="color:' +
          gradeColor(p) +
          '">' +
          esc(gradeDisplay(c)) +
          '</span>';
        row.addEventListener('click', function () {
          openClassSheet(c.id);
        });
        cl.appendChild(row);
      });
    }
  }
  function stat(val, label) {
    var s = el('div', 'gb-stat');
    s.innerHTML =
      '<span class="gb-stat-val">' +
      esc(val) +
      '</span><span class="gb-stat-label">' +
      esc(label) +
      '</span>';
    return s;
  }

  /* ---------- modal sheet ---------- */
  function openSheet(title, bodyNodes, onSubmit, onDelete) {
    $('gbSheetTitle').textContent = title;
    var form = $('gbForm');
    form.innerHTML = '';
    bodyNodes.forEach(function (n) {
      form.appendChild(n);
    });

    var actions = el('div', 'gb-sheet-actions');
    if (onDelete) {
      var del = el('button', 'gb-delete-btn', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        confirmAction('Delete this? This cannot be undone.', function () {
          onDelete();
        });
        closeSheet();
      });
      actions.appendChild(del);
    }
    var cancel = el('button', 'gb-cancel', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    var savebtn = el('button', 'gb-save', 'Save');
    savebtn.type = 'submit';
    actions.appendChild(cancel);
    actions.appendChild(savebtn);
    form.appendChild(actions);

    form.onsubmit = function (e) {
      e.preventDefault();
      if (onSubmit() !== false) {
        closeSheet();
      }
    };
    $('gbBackdrop').hidden = false;
    requestAnimationFrame(function () {
      $('gbBackdrop').classList.add('open');
    });
  }
  function closeSheet() {
    $('gbBackdrop').classList.remove('open');
    setTimeout(function () {
      $('gbBackdrop').hidden = true;
    }, 200);
  }

  function field(labelText, inputNode, optional) {
    var f = el('div', 'gb-field');
    var lab = el(
      'label',
      null,
      esc(labelText) +
        (optional ? ' <span class="gb-optional">optional</span>' : '')
    );
    f.appendChild(lab);
    f.appendChild(inputNode);
    return f;
  }
  function input(type, val, ph) {
    var i = el('input', 'gb-input');
    i.type = type || 'text';
    if (val != null) i.value = val;
    if (ph) i.placeholder = ph;
    return i;
  }
  function textarea(val, ph) {
    var t = el('textarea', 'gb-textarea');
    if (val != null) t.value = val;
    if (ph) t.placeholder = ph;
    return t;
  }
  function swatchPicker(current) {
    var wrap = el('div', 'gb-swatches');
    wrap._value = current || SWATCHES[0];
    SWATCHES.forEach(function (col) {
      var s = el('button', 'gb-swatch' + (col === wrap._value ? ' on' : ''));
      s.type = 'button';
      s.style.background = col;
      s.addEventListener('click', function () {
        wrap._value = col;
        [].forEach.call(wrap.children, function (c) {
          c.classList.remove('on');
        });
        s.classList.add('on');
      });
      wrap.appendChild(s);
    });
    return wrap;
  }

  /* ---------- book create/edit ---------- */
  function bookSheet(existing) {
    var name = input(
      'text',
      existing ? existing.name : '',
      'e.g. 9th Grade, Grade 11, Freshman Year'
    );
    var sw = swatchPicker(existing ? existing.color : SWATCHES[0]);
    var nodes = [field('Book name', name), field('Colour', sw)];
    openSheet(
      existing ? 'Edit book' : 'New book',
      nodes,
      function () {
        var nm = name.value.trim();
        if (!nm) {
          name.focus();
          return false;
        }
        if (existing) {
          existing.name = nm;
          existing.color = sw._value;
        } else {
          var b = {
            id: uid(),
            name: nm,
            color: sw._value,
            periods: [],
            dateAdded: todayISO(),
          };
          DB.books.push(b);
        }
        save();
        renderBooks();
        if (existing) {
          renderBook();
        }
      },
      existing
        ? function () {
            DB.books = DB.books.filter(function (b) {
              return b.id !== existing.id;
            });
            DB.activeBook = null;
            save();
            renderBooks();
            show('booksView');
          }
        : null
    );
  }

  /* ---------- period create ---------- */
  function confirmAction(message, onYes) {
    var back = el('div', 'gb-confirm-back');
    var box = el('div', 'gb-confirm-box');
    var msg = el('p', 'gb-confirm-msg', esc(message));
    var row = el('div', 'gb-confirm-actions');
    var no = el('button', 'gb-confirm-cancel', 'Cancel');
    no.type = 'button';
    var yes = el('button', 'gb-confirm-yes', 'Delete');
    yes.type = 'button';
    row.appendChild(no);
    row.appendChild(yes);
    box.appendChild(msg);
    box.appendChild(row);
    back.appendChild(box);
    document.body.appendChild(back);
    function close() {
      back.classList.remove('open');
      setTimeout(function () {
        if (back.parentNode) back.parentNode.removeChild(back);
      }, 180);
    }
    no.addEventListener('click', close);
    back.addEventListener('click', function (e) {
      if (e.target === back) close();
    });
    yes.addEventListener('click', function () {
      close();
      if (onYes) onYes();
    });
    requestAnimationFrame(function () {
      back.classList.add('open');
    });
  }

  function confirmDeletePeriod(pid) {
    var b = getBook();
    if (!b) return;
    var p = b.periods.filter(function (x) {
      return x.id === pid;
    })[0];
    if (!p) return;
    var count = p.classes.length;
    var msg = 'Delete the section "' + p.name + '"?';
    if (count) {
      msg +=
        ' This will remove ' +
        count +
        ' class' +
        (count === 1 ? '' : 'es') +
        ' inside it.';
    }
    confirmAction(msg, function () {
      b.periods = b.periods.filter(function (x) {
        return x.id !== pid;
      });
      if (activePeriodId === pid) {
        activePeriodId = b.periods.length ? b.periods[0].id : null;
      }
      save();
      renderBook();
    });
  }

  function periodSheet() {
    var b = getBook();
    if (!b) return;
    var presetWrap = el('div', 'gb-row');
    var presets = [
      'Year',
      'Semester 1',
      'Semester 2',
      'Quarter 1',
      'Quarter 2',
      'Quarter 3',
      'Quarter 4',
      'Term 1',
      'Term 2',
      'Term 3',
    ];
    var name = input('text', '', 'Section name');
    presets.forEach(function (pn) {
      var chip = el('button', 'gb-period', pn);
      chip.type = 'button';
      chip.style.margin = '0';
      chip.addEventListener('click', function () {
        name.value = pn;
        name.focus();
      });
      presetWrap.appendChild(chip);
    });
    var nodes = [
      field('Section name', name),
      field('Quick pick', presetWrap, true),
    ];
    openSheet(
      'New section',
      nodes,
      function () {
        var nm = name.value.trim();
        if (!nm) {
          name.focus();
          return false;
        }
        var p = { id: uid(), name: nm, classes: [], dateAdded: todayISO() };
        b.periods.push(p);
        activePeriodId = p.id;
        save();
        renderBook();
      },
      null
    );
  }

  /* ---------- class create/edit ---------- */
  function openClassSheet(classId) {
    var period = getPeriod();
    if (!period) return;
    var existing = classId
      ? period.classes.filter(function (c) {
          return c.id === classId;
        })[0]
      : null;

    var name = input('text', existing ? existing.name : '', 'e.g. Algebra II');
    var teacher = input(
      'text',
      existing ? existing.teacher : '',
      'e.g. Ms. Rivera'
    );

    // grade type toggle
    var gtWrap = el('div', 'gb-gradetype');
    var types = [
      ['letter', 'Letter'],
      ['percent', 'Percent'],
      ['number', 'Points'],
    ];
    var curType = existing ? existing.gradeType : 'letter';
    var gvField = el('div'); // dynamic grade value area
    function renderGV() {
      gvField.innerHTML = '';
      if (curType === 'letter') {
        var sel = el('select', 'gb-select');
        [
          '',
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
        ].forEach(function (l) {
          var o = el('option', null, l || '— select —');
          o.value = l;
          sel.appendChild(o);
        });
        if (existing && existing.gradeType === 'letter')
          sel.value = (existing.gradeValue || '').toUpperCase();
        gvField._get = function () {
          return { gradeType: 'letter', gradeValue: sel.value };
        };
        gvField.appendChild(field('Letter grade', sel));
      } else if (curType === 'percent') {
        var pi = input(
          'number',
          existing && existing.gradeType === 'percent'
            ? existing.gradeValue
            : '',
          'e.g. 92.5'
        );
        pi.step = '0.1';
        pi.min = '0';
        pi.max = '100';
        gvField._get = function () {
          return { gradeType: 'percent', gradeValue: pi.value };
        };
        gvField.appendChild(field('Percentage (0–100)', pi));
      } else {
        var got = input(
          'number',
          existing && existing.gradeType === 'number'
            ? existing.gradeValue
            : '',
          'e.g. 88'
        );
        var outof = input(
          'number',
          existing && existing.gradeType === 'number' ? existing.gradeMax : '',
          'out of, e.g. 100'
        );
        var row = el('div', 'gb-row');
        row.appendChild(got);
        row.appendChild(outof);
        gvField._get = function () {
          return {
            gradeType: 'number',
            gradeValue: got.value,
            gradeMax: outof.value,
          };
        };
        gvField.appendChild(field('Points earned / total', row));
      }
    }
    types.forEach(function (t) {
      var btn = el('button', t[0] === curType ? 'active' : null, t[1]);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        curType = t[0];
        [].forEach.call(gtWrap.children, function (c) {
          c.classList.remove('active');
        });
        btn.classList.add('active');
        renderGV();
      });
      gtWrap.appendChild(btn);
    });
    renderGV();

    var sw = swatchPicker(
      existing
        ? existing.color
        : SWATCHES[period.classes.length % SWATCHES.length]
    );
    var notes = textarea(
      existing ? existing.notes : '',
      'Room, period, goals, anything useful…'
    );

    var nodes = [
      field('Class name', name),
      field('Teacher', teacher, true),
      field('Grade type', gtWrap),
      gvField,
      field('Colour', sw),
      field('Notes', notes, true),
    ];

    openSheet(
      existing ? 'Edit class' : 'Add class',
      nodes,
      function () {
        var nm = name.value.trim();
        if (!nm) {
          name.focus();
          return false;
        }
        var gv = gvField._get();
        if (existing) {
          existing.name = nm;
          existing.teacher = teacher.value.trim();
          existing.gradeType = gv.gradeType;
          existing.gradeValue = gv.gradeValue;
          existing.gradeMax =
            gv.gradeMax != null ? gv.gradeMax : existing.gradeMax;
          existing.color = sw._value;
          existing.notes = notes.value.trim();
        } else {
          var c = {
            id: uid(),
            name: nm,
            teacher: teacher.value.trim(),
            gradeType: gv.gradeType,
            gradeValue: gv.gradeValue,
            gradeMax: gv.gradeMax,
            color: sw._value,
            notes: notes.value.trim(),
            dateAdded: todayISO(),
          };
          period.classes.push(c);
        }
        save();
        renderBook();
      },
      existing
        ? function () {
            period.classes = period.classes.filter(function (c) {
              return c.id !== existing.id;
            });
            save();
            renderBook();
          }
        : null
    );
  }

  /* ---------- progress view ---------- */
  function openProgress() {
    var b = getBook();
    if (!b) return;
    // build track options: overall + each class name that appears
    var sel = $('gbTrackSelect');
    sel.innerHTML = '';
    var oOverall = el('option', null, 'Overall average');
    oOverall.value = '__overall__';
    sel.appendChild(oOverall);
    var names = {};
    b.periods.forEach(function (p) {
      p.classes.forEach(function (c) {
        names[c.name] = true;
      });
    });
    Object.keys(names)
      .sort()
      .forEach(function (n) {
        var o = el('option', null, n);
        o.value = 'cls:' + n;
        sel.appendChild(o);
      });
    sel.onchange = drawChart;
    if (b.periods.length < 2) {
      $('gbProgressHint').textContent =
        'Add at least two sections (e.g. Quarter 1 & Quarter 2) to see your grades develop over time.';
    } else {
      $('gbProgressHint').textContent =
        'Grades across your sections, in order. Pick what to track.';
    }
    drawChart();
    show('progressView');
  }

  function seriesFor(book, track) {
    // returns array of {label, pct|null}
    return book.periods.map(function (p) {
      var pct;
      if (track === '__overall__') {
        pct = periodAvg(p);
      } else {
        var nm = track.slice(4);
        var matches = p.classes.filter(function (c) {
          return c.name === nm;
        });
        if (!matches.length) {
          pct = null;
        } else {
          var s = 0,
            n = 0;
          matches.forEach(function (c) {
            var g = gradeToPct(c);
            if (g != null) {
              s += g;
              n++;
            }
          });
          pct = n ? s / n : null;
        }
      }
      return { label: p.name, pct: pct };
    });
  }

  function drawChart() {
    var b = getBook();
    if (!b) return;
    var track = $('gbTrackSelect').value || '__overall__';
    var data = seriesFor(b, track);
    var svg = $('gbChart');
    var W = 320,
      H = 200,
      padL = 34,
      padR = 12,
      padT = 14,
      padB = 10;
    var plotW = W - padL - padR,
      plotH = H - padT - padB;
    var minY = 50,
      maxY = 100; // fixed academic band for readability
    function x(i) {
      return data.length <= 1
        ? padL + plotW / 2
        : padL + plotW * (i / (data.length - 1));
    }
    function y(p) {
      return padT + plotH * (1 - (p - minY) / (maxY - minY));
    }

    var parts = [];
    // gridlines + y labels at 60,70,80,90,100
    [60, 70, 80, 90, 100].forEach(function (g) {
      var yy = y(g);
      parts.push(
        '<line x1="' +
          padL +
          '" y1="' +
          yy +
          '" x2="' +
          (W - padR) +
          '" y2="' +
          yy +
          '" stroke="var(--gb-line)" stroke-width="1"/>'
      );
      parts.push(
        '<text x="' +
          (padL - 6) +
          '" y="' +
          (yy + 3) +
          '" text-anchor="end" font-size="8" fill="var(--gb-muted)">' +
          g +
          '</text>'
      );
    });

    // build point path from non-null values
    var pts = [];
    data.forEach(function (d, i) {
      if (d.pct != null)
        pts.push({
          i: i,
          x: x(i),
          y: y(Math.max(minY, Math.min(maxY, d.pct))),
          pct: d.pct,
        });
    });
    if (pts.length >= 2) {
      var dpath =
        'M' +
        pts
          .map(function (p) {
            return p.x + ',' + p.y;
          })
          .join(' L');
      // area fill
      var area =
        'M' +
        pts[0].x +
        ',' +
        (H - padB) +
        ' L' +
        pts
          .map(function (p) {
            return p.x + ',' + p.y;
          })
          .join(' L') +
        ' L' +
        pts[pts.length - 1].x +
        ',' +
        (H - padB) +
        ' Z';
      parts.push('<path d="' + area + '" fill="rgba(111,78,55,0.10)"/>');
      parts.push(
        '<path d="' +
          dpath +
          '" fill="none" stroke="var(--gb-coffee)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'
      );
    }
    pts.forEach(function (p) {
      parts.push(
        '<circle cx="' +
          p.x +
          '" cy="' +
          p.y +
          '" r="3.5" fill="var(--gb-coffee)"/>'
      );
      parts.push(
        '<text x="' +
          p.x +
          '" y="' +
          (p.y - 7) +
          '" text-anchor="middle" font-size="8" fill="var(--gb-ink)">' +
          Math.round(p.pct) +
          '</text>'
      );
    });
    if (pts.length === 1) {
      parts.push(
        '<circle cx="' +
          pts[0].x +
          '" cy="' +
          pts[0].y +
          '" r="4" fill="var(--gb-coffee)"/>'
      );
    }
    if (pts.length === 0) {
      parts.push(
        '<text x="' +
          W / 2 +
          '" y="' +
          H / 2 +
          '" text-anchor="middle" font-size="10" fill="var(--gb-muted)">No grades to plot yet</text>'
      );
    }
    svg.innerHTML = parts.join('');

    // x-axis labels
    var xax = $('gbChartX');
    xax.innerHTML = '';
    data.forEach(function (d) {
      xax.appendChild(el('span', null, esc(d.label)));
    });

    // legend
    $('gbChartLegend').innerHTML =
      '<span class="gb-legend-item"><span class="gb-legend-dot" style="background:var(--gb-coffee)"></span>' +
      (track === '__overall__' ? 'Overall average' : esc(track.slice(4))) +
      '</span>';

    // delta table
    var tbl = $('gbProgressTable');
    tbl.innerHTML = '';
    var prev = null;
    data.forEach(function (d) {
      var row = el('div', 'gb-prow');
      var val =
        d.pct == null
          ? '—'
          : Math.round(d.pct * 10) / 10 + '% (' + pctToLetter(d.pct) + ')';
      var delta = '';
      if (d.pct != null && prev != null) {
        var diff = d.pct - prev;
        var sign = diff > 0 ? '+' : '';
        var cls = diff > 0.05 ? 'gb-up' : diff < -0.05 ? 'gb-down' : '';
        delta =
          '<span class="gb-delta ' +
          cls +
          '">' +
          sign +
          Math.round(diff * 10) / 10 +
          '</span>';
      }
      row.innerHTML =
        '<span>' +
        esc(d.label) +
        '</span><span>' +
        esc(val) +
        ' ' +
        delta +
        '</span>';
      tbl.appendChild(row);
      if (d.pct != null) prev = d.pct;
    });
  }

  /* ---------- wire buttons ---------- */
  function wire() {
    $('gbAddBook').addEventListener('click', function () {
      bookSheet(null);
    });
    $('gbBackToBooks').addEventListener('click', function () {
      renderBooks();
      show('booksView');
    });
    $('gbBookMenu').addEventListener('click', function () {
      var b = getBook();
      if (b) bookSheet(b);
    });
    $('gbAddPeriod').addEventListener('click', periodSheet);
    $('gbAddClass').addEventListener('click', function () {
      if (getPeriod()) openClassSheet(null);
      else periodSheet();
    });
    $('gbShowProgress').addEventListener('click', openProgress);
    $('gbBackFromProgress').addEventListener('click', function () {
      renderBook();
      show('bookView');
    });
    $('gbSheetClose').addEventListener('click', closeSheet);
    $('gbBackdrop').addEventListener('click', function (e) {
      if (e.target === $('gbBackdrop')) closeSheet();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    renderBooks();
    show('booksView');
  });
})();
