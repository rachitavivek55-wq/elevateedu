(function () {
  'use strict';
  var CAL_KEY = 'elevate_calendar_entries';
  var CLASS_KEY = 'elevate_assignments_classes';
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
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var FULLDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  function $(id) {
    return document.getElementById(id);
  }
  function uid() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
  function loadCal() {
    try {
      return JSON.parse(localStorage.getItem(CAL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveCal(a) {
    localStorage.setItem(CAL_KEY, JSON.stringify(a));
  }
  function loadClasses() {
    try {
      return JSON.parse(localStorage.getItem(CLASS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveClasses(a) {
    localStorage.setItem(CLASS_KEY, JSON.stringify(a));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function icons() {
    if (window.lucide && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function todayYmd() {
    return ymd(new Date());
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
  function parseYmd(s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function daysBetween(a, b) {
    return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
  }
  function whenLabel(dateStr) {
    var diff = daysBetween(todayYmd(), dateStr);
    if (diff < 0) return { text: -diff + 'd overdue', cls: 'overdue' };
    if (diff === 0) return { text: 'Today', cls: 'today' };
    if (diff === 1) return { text: 'Tomorrow', cls: '' };
    if (diff < 7) return { text: 'In ' + diff + ' days', cls: '' };
    var d = parseYmd(dateStr);
    return {
      text: DAYS[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate(),
      cls: '',
    };
  }
  function prettyTime(t) {
    if (!t) return '';
    var p = t.split(':');
    var h = +p[0],
      m = p[1];
    var ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + ':' + m + ' ' + ap;
  }
  function setDateChip() {
    var d = new Date();
    if ($('dateDay')) $('dateDay').textContent = d.getDate();
    if ($('dateMonth'))
      $('dateMonth').textContent = [
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
      ][d.getMonth()];
  }
  function classById(id) {
    return loadClasses().filter(function (c) {
      return String(c.id) === String(id);
    })[0];
  }
  function workItems(filterClassId) {
    return loadCal()
      .filter(function (e) {
        var isWork =
          e.type === 'assignment' || e.type === 'exam' || e.type === 'task';
        if (!isWork) return false;
        if (filterClassId != null)
          return String(e.classId) === String(filterClassId);
        return true;
      })
      .sort(function (a, b) {
        return (
          (a.date || '').localeCompare(b.date || '') ||
          (a.time || '').localeCompare(b.time || '')
        );
      });
  }

  function workItemHtml(i) {
    var w = whenLabel(i.date);
    var cls = i.classId ? classById(i.classId) : null;
    var subParts = [];
    if (cls) subParts.push(esc(cls.name));
    if (i.time) subParts.push(prettyTime(i.time));
    if (i.type === 'exam' && i.location) subParts.push(esc(i.location));
    var badge =
      '<span class="as-badge type-' +
      i.type +
      '">' +
      i.type.charAt(0).toUpperCase() +
      i.type.slice(1) +
      '</span>';
    var prio =
      i.type === 'assignment' && i.priority
        ? '<span class="as-badge prio-' +
          i.priority +
          '">' +
          i.priority +
          '</span>'
        : '';
    return (
      '<div class="as-item" data-open-work="' +
      i.id +
      '">' +
      '<span class="as-item-dot" style="background:' +
      esc(i.color || '#6f4e37') +
      '"></span>' +
      '<div class="as-item-main">' +
      '<div class="as-item-title">' +
      esc(i.title) +
      '</div>' +
      '<div class="as-item-sub">' +
      badge +
      prio +
      (subParts.length
        ? '<span>' + subParts.join(' &middot; ') + '</span>'
        : '') +
      '<span class="as-when ' +
      w.cls +
      '">' +
      w.text +
      '</span>' +
      '</div>' +
      '</div>' +
      '<button class="as-item-del" data-del-cal="' +
      i.id +
      '" aria-label="Delete"><i data-lucide="trash-2"></i></button>' +
      '</div>'
    );
  }
  function groupedWorkHtml(items) {
    var t = todayYmd();
    var groups = [
      {
        label: 'Overdue',
        test: function (d) {
          return d < 0;
        },
      },
      {
        label: 'Today',
        test: function (d) {
          return d === 0;
        },
      },
      {
        label: 'This week',
        test: function (d) {
          return d > 0 && d < 7;
        },
      },
      {
        label: 'Later',
        test: function (d) {
          return d >= 7;
        },
      },
    ];
    var html = '';
    groups.forEach(function (g) {
      var inG = items.filter(function (i) {
        return g.test(daysBetween(t, i.date));
      });
      if (!inG.length) return;
      html += '<div class="as-group-label">' + g.label + '</div>';
      inG.forEach(function (i) {
        html += workItemHtml(i);
      });
    });
    return html;
  }

  function renderWork() {
    var items = workItems();
    var t = todayYmd();
    var overdue = items.filter(function (i) {
      return i.date < t;
    }).length;
    var today = items.filter(function (i) {
      return i.date === t;
    }).length;
    var week = items.filter(function (i) {
      var d = daysBetween(t, i.date);
      return d >= 0 && d < 7;
    }).length;
    $('asSummary').innerHTML =
      '<div class="as-stat"><span class="as-stat-val">' +
      overdue +
      '</span><span class="as-stat-label">Overdue</span></div>' +
      '<div class="as-stat"><span class="as-stat-val">' +
      today +
      '</span><span class="as-stat-label">Due today</span></div>' +
      '<div class="as-stat"><span class="as-stat-val">' +
      week +
      '</span><span class="as-stat-label">This week</span></div>';
    var list = $('asWorkList');
    if (!items.length) {
      list.innerHTML =
        '<div class="as-empty"><i data-lucide="clipboard-check"></i><p>No work due yet.<br>Open a class and tap &ldquo;Add work&rdquo; to add an assignment, exam, or task.</p></div>';
      icons();
      return;
    }
    list.innerHTML = groupedWorkHtml(items);
    icons();
  }

  function renderClasses() {
    var classes = loadClasses();
    var list = $('asClassList');
    if (!classes.length) {
      list.innerHTML =
        '<div class="as-empty"><i data-lucide="graduation-cap"></i><p><b>Step 1: set up your classes.</b><br>Tap the + button below to add a class. Then open a class to add its assignments, exams &amp; tasks.</p></div>';
      $('asTimetable').innerHTML = '';
      icons();
      return;
    }
    list.innerHTML = classes
      .map(function (c) {
        var sub = [];
        if (c.teacher) sub.push(esc(c.teacher));
        if (c.room) sub.push('Room ' + esc(c.room));
        if (c.days && c.days.length)
          sub.push(
            c.days
              .map(function (d) {
                return DAYS[d];
              })
              .join('/') + (c.start ? ' ' + prettyTime(c.start) : '')
          );
        var count = workItems(c.id).length;
        return (
          '<div class="as-class" data-open-class="' +
          c.id +
          '" style="background:' +
          esc(c.color || '#6f4e37') +
          '">' +
          '<div class="as-class-main"><div class="as-class-name">' +
          esc(c.name) +
          '</div>' +
          (sub.length
            ? '<div class="as-class-sub">' + sub.join(' &middot; ') + '</div>'
            : '') +
          '</div>' +
          '<span class="as-class-count">' +
          count +
          ' due</span>' +
          '<i data-lucide="chevron-right" class="as-class-arrow"></i>' +
          '</div>'
        );
      })
      .join('');
    var tt = '';
    for (var d = 0; d < 7; d++) {
      var onDay = classes
        .filter(function (c) {
          return c.days && c.days.indexOf(d) > -1;
        })
        .sort(function (a, b) {
          return (a.start || '').localeCompare(b.start || '');
        });
      if (!onDay.length) continue;
      tt +=
        '<div class="as-tt-day"><div class="as-tt-dayname">' +
        FULLDAYS[d] +
        '</div>' +
        onDay
          .map(function (c) {
            var time = c.start
              ? prettyTime(c.start) +
                (c.end ? ' &ndash; ' + prettyTime(c.end) : '')
              : 'All day';
            return (
              '<div class="as-tt-slot"><span class="as-tt-time">' +
              time +
              '</span><span>' +
              esc(c.name) +
              (c.room ? ' &middot; ' + esc(c.room) : '') +
              '</span></div>'
            );
          })
          .join('') +
        '</div>';
    }
    $('asTimetable').innerHTML = tt
      ? '<div class="as-tt-head">Your week</div>' + tt
      : '';
    icons();
  }

  var currentClassId = null;

  function renderClassDetail() {
    var c = classById(currentClassId);
    if (!c) {
      switchView('classes');
      return;
    }
    $('asDetailTitle').textContent = c.name;
    var meta = [];
    if (c.teacher) meta.push(esc(c.teacher));
    if (c.room) meta.push('Room ' + esc(c.room));
    if (c.days && c.days.length)
      meta.push(
        c.days
          .map(function (d) {
            return DAYS[d];
          })
          .join('/') +
          (c.start
            ? ' ' +
              prettyTime(c.start) +
              (c.end ? '&ndash;' + prettyTime(c.end) : '')
            : '')
      );
    $('asDetailCard').style.background = c.color || '#6f4e37';
    $('asDetailCard').innerHTML =
      '<div class="as-detail-main"><div class="as-detail-name">' +
      esc(c.name) +
      '</div>' +
      (meta.length
        ? '<div class="as-detail-meta">' + meta.join(' &middot; ') + '</div>'
        : '') +
      '</div>' +
      '<button class="as-detail-edit" data-edit-class="' +
      c.id +
      '" aria-label="Edit class"><i data-lucide="pencil"></i></button>';
    var items = workItems(c.id);
    if (!items.length) {
      $('asDetailWork').innerHTML =
        '<div class="as-empty"><i data-lucide="clipboard-list"></i><p>No work for this class yet.<br>Tap &ldquo;Add work&rdquo; below.</p></div>';
    } else {
      $('asDetailWork').innerHTML = groupedWorkHtml(items);
    }
    icons();
  }

  var currentView = 'classes';
  function switchView(v) {
    currentView = v;
    var tabs = document.querySelectorAll('.as-tab');
    tabs.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    var showTabs = v === 'classes' || v === 'work';
    $('asTabs').hidden = !showTabs;
    $('asWorkView').hidden = v !== 'work';
    $('asClassesView').hidden = v !== 'classes';
    $('asDetailView').hidden = v !== 'detail';
    $('asFab').hidden = v === 'detail';
    if (v === 'work') renderWork();
    else if (v === 'classes') renderClasses();
    else if (v === 'detail') renderClassDetail();
  }
  function openClass(id) {
    currentClassId = id;
    switchView('detail');
  }

  var sheetType = 'assignment';
  var sheetColor = SWATCHES[0];
  var sheetDays = [];
  var editId = null;
  var editKind = null;
  var lockClassId = null;

  var TYPES = [
    { key: 'assignment', label: 'Assignment', icon: 'file-pen' },
    { key: 'exam', label: 'Exam', icon: 'graduation-cap' },
    { key: 'task', label: 'Task', icon: 'check-circle' },
  ];

  function openSheetNewClass() {
    editKind = 'class';
    editId = null;
    sheetType = 'class';
    sheetColor = SWATCHES[0];
    sheetDays = [];
    lockClassId = null;
    $('asBackdrop').hidden = false;
    $('asSheet').hidden = false;
    buildForm();
  }
  function openSheetNewWork(classId) {
    editKind = 'work';
    editId = null;
    sheetType = 'assignment';
    sheetColor = SWATCHES[0];
    sheetDays = [];
    lockClassId = classId != null ? classId : null;
    $('asBackdrop').hidden = false;
    $('asSheet').hidden = false;
    buildForm();
  }
  function openSheetEditClass(id) {
    var c = classById(id);
    if (!c) return;
    editKind = 'class';
    editId = id;
    sheetType = 'class';
    sheetColor = c.color || SWATCHES[0];
    sheetDays = (c.days || []).slice();
    lockClassId = null;
    $('asBackdrop').hidden = false;
    $('asSheet').hidden = false;
    buildForm(c);
  }
  function openSheetEditWork(id) {
    var it = loadCal().filter(function (e) {
      return String(e.id) === String(id);
    })[0];
    if (!it) return;
    editKind = 'work';
    editId = id;
    sheetType = it.type;
    sheetColor = it.color || SWATCHES[0];
    sheetDays = [];
    lockClassId = null;
    $('asBackdrop').hidden = false;
    $('asSheet').hidden = false;
    buildForm(it);
  }
  function closeSheet() {
    $('asBackdrop').hidden = true;
    $('asSheet').hidden = true;
    editId = null;
    editKind = null;
    lockClassId = null;
  }

  function classOptions(sel) {
    var cs = loadClasses();
    if (!cs.length) return '';
    return (
      '<div class="as-field"><label class="as-label">Class</label>' +
      '<select class="as-select" id="fClass"><option value="">&mdash; none &mdash;</option>' +
      cs
        .map(function (c) {
          return (
            '<option value="' +
            c.id +
            '"' +
            (String(sel) === String(c.id) ? ' selected' : '') +
            '>' +
            esc(c.name) +
            '</option>'
          );
        })
        .join('') +
      '</select></div>'
    );
  }
  function colorField() {
    return (
      '<div class="as-field"><label class="as-label">Color</label><div class="as-colors" id="fColors">' +
      SWATCHES.map(function (c) {
        return (
          '<span class="as-sw' +
          (c === sheetColor ? ' on' : '') +
          '" data-color="' +
          c +
          '" style="background:' +
          c +
          '"></span>'
        );
      }).join('') +
      '</div></div>'
    );
  }
  function notesField(v) {
    return (
      '<div class="as-field"><label class="as-label">Notes <span>(optional)</span></label><textarea class="as-textarea" id="fNotes" placeholder="Anything to remember...">' +
      esc(v || '') +
      '</textarea></div>'
    );
  }

  function buildForm(data) {
    data = data || {};
    var isClass = editKind === 'class';
    var isEdit = editId != null;
    // header title
    if (isClass) {
      $('asSheetTitle').textContent = isEdit ? 'Edit class' : 'New class';
    } else {
      $('asSheetTitle').textContent = isEdit
        ? 'Edit ' + sheetType
        : 'New ' + sheetType;
    }

    // type picker only for NEW work (not class, not edit)
    var typeRow = '';
    if (!isClass && !isEdit) {
      typeRow =
        '<div class="as-typerow">' +
        TYPES.map(function (t) {
          return (
            '<button type="button" class="as-typebtn' +
            (t.key === sheetType ? ' active' : '') +
            '" data-type="' +
            t.key +
            '"><i data-lucide="' +
            t.icon +
            '"></i>' +
            t.label +
            '</button>'
          );
        }).join('') +
        '</div>';
    }

    var body = '';
    var nameLabel = isClass ? 'Class name' : 'Title';
    var namePh = isClass ? 'e.g. Biology' : 'e.g. Chapter 5 worksheet';
    body +=
      '<div class="as-field"><label class="as-label">' +
      nameLabel +
      '</label><input class="as-input" id="fTitle" placeholder="' +
      namePh +
      '" value="' +
      esc(data.title || data.name || '') +
      '"></div>';

    if (isClass) {
      body +=
        '<div class="as-two">' +
        '<div class="as-field"><label class="as-label">Teacher <span>(optional)</span></label><input class="as-input" id="fTeacher" placeholder="e.g. Mr. Lee" value="' +
        esc(data.teacher || '') +
        '"></div>' +
        '<div class="as-field"><label class="as-label">Room <span>(optional)</span></label><input class="as-input" id="fRoom" placeholder="e.g. 204" value="' +
        esc(data.room || '') +
        '"></div>' +
        '</div>';
      body +=
        '<div class="as-field"><label class="as-label">Days <span>(repeats weekly)</span></label><div class="as-days" id="fDays">' +
        DAYS.map(function (d, i) {
          return (
            '<button type="button" class="as-day' +
            (sheetDays.indexOf(i) > -1 ? ' on' : '') +
            '" data-day="' +
            i +
            '">' +
            d +
            '</button>'
          );
        }).join('') +
        '</div></div>';
      body +=
        '<div class="as-two">' +
        '<div class="as-field"><label class="as-label">Start <span>(optional)</span></label><input class="as-input" id="fStart" type="time" value="' +
        esc(data.start || '') +
        '"></div>' +
        '<div class="as-field"><label class="as-label">End <span>(optional)</span></label><input class="as-input" id="fEnd" type="time" value="' +
        esc(data.end || '') +
        '"></div>' +
        '</div>';
    } else {
      var dateLabel = sheetType === 'exam' ? 'Exam date' : 'Due date';
      body +=
        '<div class="as-two">' +
        '<div class="as-field"><label class="as-label">' +
        dateLabel +
        '</label><input class="as-input" id="fDate" type="date" value="' +
        esc(data.date || todayYmd()) +
        '"></div>' +
        '<div class="as-field"><label class="as-label">Time <span>(optional)</span></label><input class="as-input" id="fTime" type="time" value="' +
        esc(data.time || '') +
        '"></div>' +
        '</div>';
      if (sheetType === 'assignment') {
        var pr = data.priority || 'medium';
        body +=
          '<div class="as-field"><label class="as-label">Priority</label><select class="as-select" id="fPriority">' +
          ['low', 'medium', 'high']
            .map(function (p) {
              return (
                '<option value="' +
                p +
                '"' +
                (p === pr ? ' selected' : '') +
                '>' +
                p.charAt(0).toUpperCase() +
                p.slice(1) +
                '</option>'
              );
            })
            .join('') +
          '</select></div>';
      }
      if (sheetType === 'exam') {
        body +=
          '<div class="as-field"><label class="as-label">Location <span>(optional)</span></label><input class="as-input" id="fLocation" placeholder="e.g. Room 204" value="' +
          esc(data.location || '') +
          '"></div>';
      }
      // class selector: if locked (adding from a class), show it read-only-ish preselected; else dropdown
      var selClass =
        lockClassId != null
          ? lockClassId
          : data.classId != null
          ? data.classId
          : '';
      body += classOptions(selClass);
    }
    body += colorField();
    body += notesField(data.notes);

    var saveLabel = isEdit ? 'Save changes' : 'Save';
    var delBtn = isEdit
      ? '<button type="button" class="as-cancel as-delete-inline" id="fDelete">Delete</button>'
      : '';
    body +=
      '<div class="as-save-row"><button type="button" class="as-cancel" id="fCancel">Cancel</button>' +
      delBtn +
      '<button type="button" class="as-save" id="fSave">' +
      saveLabel +
      '</button></div>';

    $('asSheetBody').innerHTML = typeRow + body;

    if (typeRow) {
      $('asSheetBody')
        .querySelectorAll('.as-typebtn')
        .forEach(function (b) {
          b.addEventListener('click', function () {
            sheetType = b.getAttribute('data-type');
            buildForm(collectDraft());
          });
        });
    }
    $('asSheetBody')
      .querySelectorAll('.as-sw')
      .forEach(function (s) {
        s.addEventListener('click', function () {
          sheetColor = s.getAttribute('data-color');
          $('asSheetBody')
            .querySelectorAll('.as-sw')
            .forEach(function (x) {
              x.classList.remove('on');
            });
          s.classList.add('on');
        });
      });
    if ($('fDays')) {
      $('fDays')
        .querySelectorAll('.as-day')
        .forEach(function (d) {
          d.addEventListener('click', function () {
            var v = +d.getAttribute('data-day');
            var idx = sheetDays.indexOf(v);
            if (idx > -1) {
              sheetDays.splice(idx, 1);
              d.classList.remove('on');
            } else {
              sheetDays.push(v);
              d.classList.add('on');
            }
          });
        });
    }
    $('fCancel').addEventListener('click', closeSheet);
    $('fSave').addEventListener('click', saveEntry);
    if ($('fDelete')) {
      $('fDelete').addEventListener('click', function () {
        deleteFromSheet();
      });
    }
    icons();
  }
  function collectDraft() {
    // preserve entered values when switching type
    var d = {};
    if ($('fTitle')) d.title = $('fTitle').value;
    if ($('fDate')) d.date = $('fDate').value;
    if ($('fTime')) d.time = $('fTime').value;
    if ($('fNotes')) d.notes = $('fNotes').value;
    if ($('fClass')) d.classId = $('fClass').value;
    if ($('fPriority')) d.priority = $('fPriority').value;
    if ($('fLocation')) d.location = $('fLocation').value;
    return d;
  }

  function saveEntry() {
    var title = ($('fTitle').value || '').trim();
    if (!title) {
      $('fTitle').focus();
      $('fTitle').style.borderColor = '#b0645e';
      return;
    }

    if (editKind === 'class') {
      if (editId != null) {
        var classes = loadClasses();
        var c = classes.filter(function (x) {
          return String(x.id) === String(editId);
        })[0];
        if (c) {
          c.name = title;
          c.teacher = ($('fTeacher').value || '').trim();
          c.room = ($('fRoom').value || '').trim();
          c.days = sheetDays.slice().sort();
          c.start = $('fStart').value || '';
          c.end = $('fEnd').value || '';
          c.color = sheetColor;
          saveClasses(classes);
          syncClassCommitment(c);
        }
        closeSheet();
        if (currentView === 'detail') renderClassDetail();
        else switchView('classes');
        return;
      }
      var ncls = {
        id: uid(),
        name: title,
        teacher: ($('fTeacher').value || '').trim(),
        room: ($('fRoom').value || '').trim(),
        days: sheetDays.slice().sort(),
        start: $('fStart').value || '',
        end: $('fEnd').value || '',
        color: sheetColor,
      };
      var arr = loadClasses();
      arr.push(ncls);
      saveClasses(arr);
      syncClassCommitment(ncls);
      closeSheet();
      openClass(ncls.id);
      return;
    }

    // work item
    var cal = loadCal();
    if (editId != null) {
      var it = cal.filter(function (e) {
        return String(e.id) === String(editId);
      })[0];
      if (it) {
        it.type = sheetType;
        it.title = title;
        it.date = $('fDate').value || todayYmd();
        it.time = $('fTime').value || '';
        it.color = sheetColor;
        it.notes = ($('fNotes').value || '').trim();
        delete it.priority;
        delete it.location;
        if (sheetType === 'assignment') it.priority = $('fPriority').value;
        if (sheetType === 'exam')
          it.location = ($('fLocation').value || '').trim();
        var sc = $('fClass') ? $('fClass').value : '';
        if (sc) it.classId = +sc;
        else delete it.classId;
        saveCal(cal);
      }
    } else {
      var entry = {
        id: uid(),
        type: sheetType,
        title: title,
        date: $('fDate').value || todayYmd(),
        time: $('fTime').value || '',
        color: sheetColor,
        notes: ($('fNotes').value || '').trim(),
      };
      if (sheetType === 'assignment') entry.priority = $('fPriority').value;
      if (sheetType === 'exam')
        entry.location = ($('fLocation').value || '').trim();
      var sc2 =
        lockClassId != null
          ? lockClassId
          : $('fClass')
          ? $('fClass').value
          : '';
      if (sc2) entry.classId = +sc2;
      cal.push(entry);
      saveCal(cal);
    }
    closeSheet();
    if (currentView === 'detail') renderClassDetail();
    else if (currentView === 'work') renderWork();
    else renderClasses();
  }

  function syncClassCommitment(c) {
    var cal = loadCal();
    // remove old commitment for this class
    if (c.calId) {
      cal = cal.filter(function (e) {
        return String(e.id) !== String(c.calId);
      });
    }
    // add new one if it has days + start
    if (c.days && c.days.length && c.start) {
      var calId = uid();
      cal.push({
        id: calId,
        type: 'commitment',
        title: c.name,
        days: c.days,
        start: c.start,
        end: c.end || c.start,
        color: c.color,
        notes: c.room ? 'Room ' + c.room : '',
      });
      c.calId = calId;
    } else {
      delete c.calId;
    }
    saveCal(cal);
    // persist calId change
    saveClasses(
      loadClasses().map(function (x) {
        return String(x.id) === String(c.id) ? c : x;
      })
    );
  }

  function deleteFromSheet() {
    if (editKind === 'class') {
      var id = editId;
      closeSheet();
      deleteClass(id);
    } else {
      var id2 = editId;
      closeSheet();
      deleteCalItem(id2);
    }
  }

  function confirmAction(message, onYes) {
    var back = document.createElement('div');
    back.className = 'as-confirm-back';
    back.innerHTML =
      '<div class="as-confirm-box"><div class="as-confirm-msg">' +
      esc(message) +
      '</div>' +
      '<div class="as-confirm-actions"><button class="as-confirm-cancel">Cancel</button><button class="as-confirm-yes">Delete</button></div></div>';
    document.body.appendChild(back);
    back
      .querySelector('.as-confirm-cancel')
      .addEventListener('click', function () {
        back.remove();
      });
    back
      .querySelector('.as-confirm-yes')
      .addEventListener('click', function () {
        back.remove();
        onYes();
      });
    back.addEventListener('click', function (e) {
      if (e.target === back) back.remove();
    });
  }
  function deleteCalItem(id) {
    confirmAction(
      'Delete this item? It will also be removed from your Calendar.',
      function () {
        saveCal(
          loadCal().filter(function (e) {
            return String(e.id) !== String(id);
          })
        );
        if (currentView === 'detail') renderClassDetail();
        else renderWork();
      }
    );
  }
  function deleteClass(id) {
    var c = classById(id);
    confirmAction(
      'Delete ' +
        (c ? c.name : 'this class') +
        '? Its schedule and all its assignments/exams will be removed from your Calendar too.',
      function () {
        var c2 = classById(id);
        var cal = loadCal();
        if (c2 && c2.calId) {
          cal = cal.filter(function (e) {
            return String(e.id) !== String(c2.calId);
          });
        }
        // also remove work items tied to this class
        cal = cal.filter(function (e) {
          return String(e.classId) !== String(id);
        });
        saveCal(cal);
        saveClasses(
          loadClasses().filter(function (x) {
            return String(x.id) !== String(id);
          })
        );
        switchView('classes');
      }
    );
  }

  function wire() {
    setDateChip();
    document.querySelectorAll('.as-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        switchView(b.getAttribute('data-view'));
      });
    });
    $('asFab').addEventListener('click', function () {
      if (currentView === 'work') openSheetNewWork(null);
      else openSheetNewClass();
    });
    $('asSheetClose').addEventListener('click', closeSheet);
    $('asBackdrop').addEventListener('click', closeSheet);
    $('asDetailBack').addEventListener('click', function () {
      switchView('classes');
    });
    $('asDetailAddWork').addEventListener('click', function () {
      openSheetNewWork(currentClassId);
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      var del = t.closest ? t.closest('[data-del-cal]') : null;
      if (del) {
        e.stopPropagation();
        deleteCalItem(del.getAttribute('data-del-cal'));
        return;
      }
      var editC = t.closest ? t.closest('[data-edit-class]') : null;
      if (editC) {
        e.stopPropagation();
        openSheetEditClass(editC.getAttribute('data-edit-class'));
        return;
      }
      var openC = t.closest ? t.closest('[data-open-class]') : null;
      if (openC) {
        openClass(+openC.getAttribute('data-open-class'));
        return;
      }
      var openW = t.closest ? t.closest('[data-open-work]') : null;
      if (openW) {
        openSheetEditWork(openW.getAttribute('data-open-work'));
        return;
      }
    });
    switchView('classes');
    icons();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
