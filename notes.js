(function () {
  'use strict';

  var SECTIONS_KEY = 'elevate_notes_sections';
  var NOTES_KEY = 'elevate_notes_items';

  function $(id) {
    return document.getElementById(id);
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function icons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }
  function save(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  var sections = load(SECTIONS_KEY);
  var notes = load(NOTES_KEY);

  var ICON_CHOICES = [
    'notebook-pen',
    'user',
    'lightbulb',
    'book-open',
    'graduation-cap',
    'star',
    'heart',
    'flask-conical',
    'calculator',
    'globe',
    'music',
    'palette',
  ];

  // ---- date chip ----
  function setDateChip() {
    var d = new Date();
    var mons = [
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
    if ($('dateDay')) $('dateDay').textContent = d.getDate();
    if ($('dateMonth')) $('dateMonth').textContent = mons[d.getMonth()];
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    var mons = [
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
    return mons[d.getMonth()] + ' ' + d.getDate();
  }

  function sectionById(id) {
    return sections.filter(function (s) {
      return s.id === id;
    })[0];
  }
  function noteById(id) {
    return notes.filter(function (n) {
      return n.id === id;
    })[0];
  }
  function notesInSection(sid) {
    return notes
      .filter(function (n) {
        return n.sectionId === sid;
      })
      .sort(function (a, b) {
        return b.updated - a.updated;
      });
  }

  function plainPreview(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    var blocks = tmp.querySelectorAll('li, p, div, br, h1, h2, h3, h4, h5, h6');
    blocks.forEach(function (b) {
      b.insertAdjacentText('afterend', ' ');
    });
    var txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    return txt;
  }

  // ================= views =================
  var currentSectionId = null;
  var currentNoteId = null;

  function showView(which) {
    $('ntListView').hidden = which !== 'list';
    $('ntSectionView').hidden = which !== 'section';
    $('ntEditorView').hidden = which !== 'editor';
    $('ntFab').hidden = which === 'editor';
  }

  function renderSections() {
    var wrap = $('ntSectionList');
    wrap.innerHTML = '';
    if (!sections.length) {
      $('ntEmpty').hidden = false;
      $('ntHint').hidden = false;
      icons();
      return;
    }
    $('ntEmpty').hidden = true;
    var html = '';
    sections.forEach(function (s) {
      var count = notesInSection(s.id).length;
      html +=
        '<button class="nt-section-card" data-open-section="' +
        s.id +
        '">' +
        '<span class="nt-section-icon"><i data-lucide="' +
        esc(s.icon || 'notebook-pen') +
        '"></i></span>' +
        '<span class="nt-section-meta">' +
        '<span class="nt-section-name">' +
        esc(s.name) +
        '</span>' +
        '<span class="nt-section-count">' +
        count +
        (count === 1 ? ' note' : ' notes') +
        '</span>' +
        '</span>' +
        '<span class="nt-section-arrow"><i data-lucide="chevron-right"></i></span>' +
        '</button>';
    });
    wrap.innerHTML = html;
    icons();
  }

  function renderSectionView() {
    var s = sectionById(currentSectionId);
    if (!s) {
      openList();
      return;
    }
    $('ntSectionName').textContent = s.name;
    var list = notesInSection(s.id);
    var wrap = $('ntNoteList');
    if (!list.length) {
      wrap.innerHTML = '';
      $('ntNoteEmpty').hidden = false;
      icons();
      return;
    }
    $('ntNoteEmpty').hidden = true;
    var html = '';
    list.forEach(function (n) {
      var prev = plainPreview(n.body);
      html +=
        '<button class="nt-note-card" data-open-note="' +
        n.id +
        '">' +
        '<div class="nt-note-title">' +
        esc(n.title || 'Untitled note') +
        '</div>' +
        (prev ? '<div class="nt-note-preview">' + esc(prev) + '</div>' : '') +
        '<div class="nt-note-date">' +
        fmtDate(n.updated) +
        '</div>' +
        '</button>';
    });
    wrap.innerHTML = html;
    icons();
  }

  function openList() {
    currentSectionId = null;
    showView('list');
    renderSections();
  }

  function openSection(id) {
    currentSectionId = id;
    showView('section');
    renderSectionView();
  }

  // ================= editor =================
  var saveTimer = null;

  function openNote(id) {
    var n = noteById(id);
    if (!n) return;
    currentNoteId = id;
    var s = sectionById(n.sectionId);
    $('ntEditorBackLabel').textContent = s ? s.name : 'Back';
    $('ntNoteTitle').value = n.title || '';
    $('ntEditor').innerHTML = cleanBody(n.body || '');
    showView('editor');
    updateToolbarStates();
    icons();
  }

  function createNote() {
    var n = {
      id: uid(),
      sectionId: currentSectionId,
      title: '',
      body: '',
      created: Date.now(),
      updated: Date.now(),
    };
    notes.push(n);
    save(NOTES_KEY, notes);
    openNote(n.id);
    setTimeout(function () {
      $('ntNoteTitle').focus();
    }, 60);
  }

  function persistCurrentNote() {
    var n = noteById(currentNoteId);
    if (!n) return;
    n.title = $('ntNoteTitle').value.trim();
    n.body = $('ntEditor').innerHTML;
    n.updated = Date.now();
    save(NOTES_KEY, notes);
    flashSaved();
  }

  var savedTimer = null;
  function flashSaved() {
    var el = $('ntSavedNote');
    if (!el) return;
    el.textContent = 'Saved';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () {
      el.textContent = 'Saved automatically';
    }, 1200);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistCurrentNote, 400);
  }

  // ---- images ----
  // blob: URLs from an earlier paste never survive a reload, so drop them.
  function cleanBody(html) {
    if (!html || html.indexOf('blob:') === -1) return html;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var bad = tmp.querySelectorAll('img[src^="blob:"]');
    for (var i = 0; i < bad.length; i++) bad[i].parentNode.removeChild(bad[i]);
    return tmp.innerHTML;
  }

  var IMG_MAX = 1280;
  function shrinkImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw = String(reader.result);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || 0;
        var h = img.naturalHeight || 0;
        if (!w || !h) return cb(raw);
        var k = Math.min(1, IMG_MAX / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * k));
        cv.height = Math.max(1, Math.round(h * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var out = '';
        try {
          out = cv.toDataURL('image/jpeg', 0.82);
        } catch (err) {
          out = '';
        }
        cb(out && out.length < raw.length ? out : raw);
      };
      img.onerror = function () {
        cb(raw);
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  }

  function insertImage(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
    shrinkImage(file, function (src) {
      var ed = $('ntEditor');
      ed.focus();
      document.execCommand('insertHTML', false, '<img src="' + src + '" alt="" />');
      persistCurrentNote();
    });
  }

  // ---- full-screen photo viewer with pinch / wheel / double-tap zoom ----
  var pz = {
    scale: 1,
    x: 0,
    y: 0,
    pinch: null,
    drag: null,
    moved: false,
    lastTap: 0,
  };
  var pzMAX = 6;

  function pzImg() {
    return $('ntPhotoImg');
  }

  function pzBox() {
    return $('ntPhoto').getBoundingClientRect();
  }

  function pzApply() {
    var img = pzImg();
    if (!img) return;
    img.style.transform =
      'translate3d(' + pz.x + 'px, ' + pz.y + 'px, 0) scale(' + pz.scale + ')';
    img.style.cursor = pz.scale > 1 ? 'grab' : 'zoom-in';
    var lvl = $('ntPhotoLevel');
    if (lvl) lvl.textContent = Math.round(pz.scale * 100) + '%';
    var out = $('ntPhotoOut');
    if (out) out.disabled = pz.scale <= 1.01;
    var zin = $('ntPhotoIn');
    if (zin) zin.disabled = pz.scale >= pzMAX - 0.01;
  }

  /* Keeps the photo from being dragged away from the frame: at 1x it stays
     centred, and past that it can only move as far as the hidden overflow. */
  function pzClamp() {
    var img = pzImg();
    if (!img) return;
    var box = pzBox();
    var maxX = Math.max(0, (img.offsetWidth * pz.scale - box.width) / 2);
    var maxY = Math.max(0, (img.offsetHeight * pz.scale - box.height) / 2);
    pz.x = Math.min(maxX, Math.max(-maxX, pz.x));
    pz.y = Math.min(maxY, Math.max(-maxY, pz.y));
  }

  function pzReset() {
    pz.scale = 1;
    pz.x = 0;
    pz.y = 0;
    pz.pinch = null;
    pz.drag = null;
    pz.moved = false;
    pz.lastTap = 0;
    pzApply();
  }

  /* Zooms to scale s. When qx/qy are passed, that screen point is held still,
     so pinching or double tapping keeps the spot under the finger in place. */
  function pzZoomTo(s, qx, qy) {
    var img = pzImg();
    if (!img) return;
    var r = img.getBoundingClientRect();
    var cx = r.left + r.width / 2 - pz.x;
    var cy = r.top + r.height / 2 - pz.y;
    var next = Math.min(pzMAX, Math.max(1, s));
    var k = next / pz.scale;
    if (typeof qx === 'number' && typeof qy === 'number') {
      pz.x = (qx - cx) * (1 - k) + k * pz.x;
      pz.y = (qy - cy) * (1 - k) + k * pz.y;
    }
    pz.scale = next;
    if (next <= 1.001) {
      pz.x = 0;
      pz.y = 0;
    }
    pzClamp();
    pzApply();
  }

  function pzStep(f) {
    var b = pzBox();
    pzZoomTo(pz.scale * f, b.left + b.width / 2, b.top + b.height / 2);
  }

  function pzTouchList(e) {
    var list = [];
    for (var i = 0; i < e.touches.length; i++) list.push(e.touches[i]);
    return list;
  }

  function pzGap(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pzOnControls(t) {
    return !!(t && t.closest && t.closest('.nt-photo-zoom, .nt-photo-close'));
  }

  /* Gestures run off touch events rather than pointer events: mobile browsers
     hand two finger pinches to their own page zoom and never report the second
     pointer, which is why pinching did nothing here before. */
  function pzTouchStart(e) {
    if (pzOnControls(e.target)) return;
    var t = pzTouchList(e);
    pz.moved = false;
    if (t.length >= 2) {
      pz.drag = null;
      pz.pinch = { d: pzGap(t[0], t[1]), s: pz.scale };
      e.preventDefault();
    } else if (t.length === 1) {
      pz.pinch = null;
      pz.drag = { x: t[0].clientX, y: t[0].clientY, tx: pz.x, ty: pz.y };
    }
  }

  function pzTouchMove(e) {
    if (pzOnControls(e.target)) return;
    var t = pzTouchList(e);
    if (t.length >= 2) {
      if (!pz.pinch || !(pz.pinch.d > 0)) {
        pz.pinch = { d: pzGap(t[0], t[1]), s: pz.scale };
        return;
      }
      e.preventDefault();
      pz.moved = true;
      var mx = (t[0].clientX + t[1].clientX) / 2;
      var my = (t[0].clientY + t[1].clientY) / 2;
      pzZoomTo((pz.pinch.s * pzGap(t[0], t[1])) / pz.pinch.d, mx, my);
      return;
    }
    if (t.length === 1 && pz.drag && pz.scale > 1) {
      e.preventDefault();
      var dx = t[0].clientX - pz.drag.x;
      var dy = t[0].clientY - pz.drag.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pz.moved = true;
      pz.x = pz.drag.tx + dx;
      pz.y = pz.drag.ty + dy;
      pzClamp();
      pzApply();
    }
  }

  function pzTouchEnd(e) {
    if (pzOnControls(e.target)) return;
    var remaining = e.touches ? e.touches.length : 0;
    if (remaining >= 2) return;
    if (remaining === 1) {
      pz.pinch = null;
      pz.drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: pz.x, ty: pz.y };
      return;
    }
    var ch = e.changedTouches && e.changedTouches[0];
    var wasPinch = !!pz.pinch;
    pz.pinch = null;
    pz.drag = null;
    if (pz.moved || wasPinch) return;
    if (e.target !== pzImg()) return;
    var now = Date.now();
    if (now - pz.lastTap < 320) {
      pz.lastTap = 0;
      if (e.cancelable) e.preventDefault();
      if (pz.scale > 1.05) pzZoomTo(1);
      else if (ch) pzZoomTo(2.5, ch.clientX, ch.clientY);
      else pzStep(2.5);
    } else {
      pz.lastTap = now;
    }
  }

  /* Mouse and trackpad only - touches are handled above. */
  function pzDown(e) {
    if (e.pointerType === 'touch' || pzOnControls(e.target)) return;
    pz.moved = false;
    pz.drag = { x: e.clientX, y: e.clientY, tx: pz.x, ty: pz.y };
  }

  function pzMove(e) {
    if (e.pointerType === 'touch') return;
    if (!pz.drag || pz.scale <= 1) return;
    var dx = e.clientX - pz.drag.x;
    var dy = e.clientY - pz.drag.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pz.moved = true;
    pz.x = pz.drag.tx + dx;
    pz.y = pz.drag.ty + dy;
    pzClamp();
    pzApply();
    e.preventDefault();
  }

  function pzUp(e) {
    if (e.pointerType === 'touch') return;
    pz.drag = null;
  }

  function pzWheel(e) {
    if (pzOnControls(e.target)) return;
    e.preventDefault();
    pzZoomTo(pz.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
  }

  /* Safari fires these for pinches; swallow them so the page itself never zooms. */
  function pzGesture(e) {
    if (e.cancelable) e.preventDefault();
  }

  function pzViewport() {
    var vv = window.visualViewport;
    var h = vv && vv.height ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--nt-vh', Math.round(h) + 'px');
  }

  function openPhoto(src) {
    pzReset();
    pzViewport();
    $('ntPhotoImg').setAttribute('src', src);
    $('ntPhoto').hidden = false;
    document.body.style.overflow = 'hidden';
    pzApply();
  }

  function closePhoto() {
    $('ntPhoto').hidden = true;
    $('ntPhotoImg').removeAttribute('src');
    document.body.style.overflow = '';
    pzReset();
  }

  // ---- formatting ----
  function exec(cmd, val) {
    document.execCommand('styleWithCSS', false, true);
    if (cmd === 'hiliteColor') {
      // toggle highlight
      var active = isHighlighted();
      document.execCommand(
        'hiliteColor',
        false,
        active ? 'transparent' : '#f7e7a6'
      );
    } else if (cmd === 'formatBlock') {
      // toggle heading
      var block = currentBlock();
      document.execCommand(
        'formatBlock',
        false,
        block === 'h3' ? 'div' : val || 'h3'
      );
    } else {
      document.execCommand(cmd, false, val || null);
    }
    $('ntEditor').focus();
    updateToolbarStates();
    scheduleSave();
  }

  function isHighlighted() {
    try {
      var c =
        document.queryCommandValue('hiliteColor') ||
        document.queryCommandValue('backColor');
      if (!c) return false;
      c = c.toLowerCase().replace(/\s/g, '');
      return c.indexOf('247,231,166') >= 0 || c === '#f7e7a6';
    } catch (e) {
      return false;
    }
  }

  function currentBlock() {
    try {
      return (document.queryCommandValue('formatBlock') || '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function updateToolbarStates() {
    var tools = document.querySelectorAll('.nt-tool');
    tools.forEach(function (t) {
      var cmd = t.getAttribute('data-cmd');
      var on = false;
      try {
        if (
          cmd === 'bold' ||
          cmd === 'italic' ||
          cmd === 'underline' ||
          cmd === 'strikeThrough'
        )
          on = document.queryCommandState(cmd);
        else if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList')
          on = document.queryCommandState(cmd);
        else if (cmd === 'hiliteColor') on = isHighlighted();
        else if (cmd === 'formatBlock') on = currentBlock() === 'h3';
      } catch (e) {
        on = false;
      }
      t.classList.toggle('active', !!on);
    });
  }

  // ================= sheet (section name / rename) =================
  function openSheet(title, bodyHtml) {
    $('ntSheetTitle').textContent = title;
    $('ntSheetBody').innerHTML = bodyHtml;
    $('ntBackdrop').hidden = false;
    $('ntSheet').hidden = false;
    icons();
  }
  function closeSheet() {
    $('ntBackdrop').hidden = true;
    $('ntSheet').hidden = true;
    $('ntSheetBody').innerHTML = '';
  }

  function iconPickerHtml(selected) {
    var h = '<div class="nt-icon-picker" id="ntIconPicker">';
    ICON_CHOICES.forEach(function (ic) {
      h +=
        '<button type="button" class="nt-icon-opt' +
        (ic === selected ? ' active' : '') +
        '" data-icon="' +
        ic +
        '"><i data-lucide="' +
        ic +
        '"></i></button>';
    });
    h += '</div>';
    return h;
  }

  function openNewSectionSheet() {
    var body =
      '<label class="nt-field-label">Section name</label>' +
      '<input class="nt-input" id="ntNameInput" placeholder="e.g. Teachers, Random thoughts" maxlength="40" />' +
      '<label class="nt-field-label" style="margin-top:16px;">Icon</label>' +
      iconPickerHtml('notebook-pen') +
      '<div class="nt-sheet-row">' +
      '<button class="nt-btn-ghost" id="ntCancelBtn">Cancel</button>' +
      '<button class="nt-btn-primary" id="ntSaveBtn">Create section</button>' +
      '</div>';
    openSheet('New section', body);
    wireSheetIconPicker();
    var chosen = { icon: 'notebook-pen' };
    bindIconPicker(chosen);
    setTimeout(function () {
      $('ntNameInput').focus();
    }, 60);
    $('ntCancelBtn').onclick = closeSheet;
    $('ntSaveBtn').onclick = function () {
      var name = $('ntNameInput').value.trim();
      if (!name) {
        $('ntNameInput').focus();
        return;
      }
      sections.push({
        id: uid(),
        name: name,
        icon: chosen.icon,
        created: Date.now(),
      });
      save(SECTIONS_KEY, sections);
      closeSheet();
      renderSections();
    };
  }

  function openEditSectionSheet() {
    var s = sectionById(currentSectionId);
    if (!s) return;
    var body =
      '<label class="nt-field-label">Section name</label>' +
      '<input class="nt-input" id="ntNameInput" maxlength="40" />' +
      '<label class="nt-field-label" style="margin-top:16px;">Icon</label>' +
      iconPickerHtml(s.icon || 'notebook-pen') +
      '<div class="nt-sheet-row">' +
      '<button class="nt-btn-ghost" id="ntCancelBtn">Cancel</button>' +
      '<button class="nt-btn-primary" id="ntSaveBtn">Save changes</button>' +
      '</div>' +
      '<div class="nt-delete-row"><button class="nt-delete-link" id="ntDeleteSection">Delete this section</button></div>';
    openSheet('Edit section', body);
    $('ntNameInput').value = s.name;
    var chosen = { icon: s.icon || 'notebook-pen' };
    bindIconPicker(chosen);
    $('ntCancelBtn').onclick = closeSheet;
    $('ntSaveBtn').onclick = function () {
      var name = $('ntNameInput').value.trim();
      if (!name) {
        $('ntNameInput').focus();
        return;
      }
      s.name = name;
      s.icon = chosen.icon;
      save(SECTIONS_KEY, sections);
      closeSheet();
      renderSectionView();
    };
    $('ntDeleteSection').onclick = function () {
      var count = notesInSection(s.id).length;
      var msg = count
        ? 'Delete "' +
          s.name +
          '" and its ' +
          count +
          (count === 1 ? ' note' : ' notes') +
          '?'
        : 'Delete "' + s.name + '"?';
      confirmAction(msg, function () {
        notes = notes.filter(function (n) {
          return n.sectionId !== s.id;
        });
        sections = sections.filter(function (x) {
          return x.id !== s.id;
        });
        save(NOTES_KEY, notes);
        save(SECTIONS_KEY, sections);
        closeSheet();
        openList();
      });
    };
  }

  function bindIconPicker(chosen) {
    var picker = $('ntIconPicker');
    if (!picker) return;
    picker.addEventListener('click', function (e) {
      var b = e.target.closest('[data-icon]');
      if (!b) return;
      chosen.icon = b.getAttribute('data-icon');
      picker.querySelectorAll('.nt-icon-opt').forEach(function (o) {
        o.classList.remove('active');
      });
      b.classList.add('active');
    });
  }
  function wireSheetIconPicker() {}

  // ================= custom confirm =================
  var confirmCb = null;
  function confirmAction(message, onYes) {
    $('ntConfirmMsg').textContent = message;
    confirmCb = onYes;
    $('ntConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('ntConfirmWrap').hidden = true;
    confirmCb = null;
  }

  // delete current note from editor
  function deleteCurrentNote() {
    var n = noteById(currentNoteId);
    if (!n) return;
    confirmAction('Delete this note?', function () {
      notes = notes.filter(function (x) {
        return x.id !== currentNoteId;
      });
      save(NOTES_KEY, notes);
      currentNoteId = null;
      openSection(currentSectionId);
    });
  }

  // ================= wiring =================
  function wire() {
    // section list clicks
    $('ntSectionList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-open-section]');
      if (b) openSection(b.getAttribute('data-open-section'));
    });
    // note list clicks
    $('ntNoteList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-open-note]');
      if (b) openNote(b.getAttribute('data-open-note'));
    });
    // back links
    $('ntSectionBack').onclick = openList;
    $('ntEditorBack').onclick = function () {
      persistCurrentNote();
      openSection(currentSectionId);
    };
    // edit section
    $('ntSectionEdit').onclick = openEditSectionSheet;

    // FAB: add section (list) or add note (section)
    $('ntFab').onclick = function () {
      if (!$('ntSectionView').hidden) createNote();
      else openNewSectionSheet();
    };

    // sheet close
    $('ntSheetClose').onclick = closeSheet;
    $('ntBackdrop').onclick = closeSheet;

    // confirm buttons
    $('ntConfirmNo').onclick = closeConfirm;
    $('ntConfirmYes').onclick = function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    };

    // toolbar
    $('ntToolbar').addEventListener('mousedown', function (e) {
      var t = e.target.closest('.nt-tool[data-cmd]');
      if (!t) return;
      e.preventDefault(); // keep selection
      exec(t.getAttribute('data-cmd'), t.getAttribute('data-val'));
    });

    // editor typing / selection
    var ed = $('ntEditor');
    ed.addEventListener('input', scheduleSave);
    ed.addEventListener('keyup', updateToolbarStates);
    ed.addEventListener('mouseup', updateToolbarStates);
    document.addEventListener('selectionchange', function () {
      if (!$('ntEditorView').hidden) updateToolbarStates();
    });
    $('ntNoteTitle').addEventListener('input', scheduleSave);

    // images: add from the toolbar, paste, and tap to view full screen
    $('ntImgBtn').addEventListener('click', function () {
      $('ntImgInput').click();
    });
    $('ntImgInput').addEventListener('change', function () {
      if (this.files && this.files[0]) insertImage(this.files[0]);
      this.value = '';
    });
    ed.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image/') === 0) {
          e.preventDefault();
          insertImage(items[i].getAsFile());
          return;
        }
      }
    });
    ed.addEventListener('click', function (e) {
      var im = e.target && e.target.closest ? e.target.closest('img') : null;
      if (im && im.getAttribute('src')) {
        e.preventDefault();
        openPhoto(im.getAttribute('src'));
      }
    });
    var pvw = $('ntPhoto');
    pvw.addEventListener('click', function (e) {
      if (pz.moved) return;
      if (e.target === pvw || (e.target.closest && e.target.closest('.nt-photo-close'))) {
        closePhoto();
      }
    });
    pvw.addEventListener('touchstart', pzTouchStart, { passive: false });
    pvw.addEventListener('touchmove', pzTouchMove, { passive: false });
    pvw.addEventListener('touchend', pzTouchEnd, { passive: false });
    pvw.addEventListener('touchcancel', pzTouchEnd, { passive: false });
    pvw.addEventListener('pointerdown', pzDown);
    pvw.addEventListener('pointermove', pzMove);
    pvw.addEventListener('pointerup', pzUp);
    pvw.addEventListener('pointercancel', pzUp);
    pvw.addEventListener('wheel', pzWheel, { passive: false });
    pvw.addEventListener('gesturestart', pzGesture);
    pvw.addEventListener('gesturechange', pzGesture);
    pvw.addEventListener('gestureend', pzGesture);
    $('ntPhotoIn').addEventListener('click', function (e) {
      e.stopPropagation();
      pzStep(1.5);
    });
    $('ntPhotoOut').addEventListener('click', function (e) {
      e.stopPropagation();
      pzStep(1 / 1.5);
    });
    pvw.addEventListener('dblclick', function (e) {
      e.preventDefault();
      if (e.target !== $('ntPhotoImg')) return;
      if (pz.scale > 1.05) pzZoomTo(1);
      else pzZoomTo(2.5, e.clientX, e.clientY);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('ntPhoto').hidden) closePhoto();
    });
    var onViewport = function () {
      if ($('ntPhoto').hidden) return;
      pzViewport();
      pzClamp();
      pzApply();
    };
    window.addEventListener('resize', onViewport);
    window.addEventListener('orientationchange', onViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewport);
      window.visualViewport.addEventListener('scroll', onViewport);
    }

    // long-press / delete note: add a delete via editor back area? Provide delete on title double-context.
    // We add a delete affordance: pressing the edit pencil area is only sections.
    // Delete note handled through a dedicated button appended below toolbar:
  }

  // add a small "delete note" control into editor view dynamically
  function addDeleteNoteControl() {
    var saved = $('ntSavedNote');
    if (!saved) return;
    var link = document.createElement('button');
    link.className = 'nt-delete-link';
    link.id = 'ntDeleteNote';
    link.textContent = 'Delete this note';
    var row = document.createElement('div');
    row.className = 'nt-delete-row';
    row.appendChild(link);
    saved.parentNode.insertBefore(row, saved.nextSibling);
    link.onclick = deleteCurrentNote;
  }

  // ---- init ----
  function init() {
    setDateChip();
    wire();
    addDeleteNoteControl();
    openList();
    icons();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// build tag
