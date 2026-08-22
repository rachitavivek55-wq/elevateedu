(function () {
  'use strict';
  var KEY = 'elevate_visionboard';

  /* ---------- Picture storage ----------
     Photos live in a private Supabase Storage bucket; localStorage only keeps a
     short path like 'sb:<user>/<id>.jpg'. If the bucket or the network is not
     available the picture simply stays inline, exactly as before, so nothing is
     ever lost. ---------------------------------------------------------------- */
  var BUCKET = 'visionboard';
  var URL_CACHE = {};
  var migrating = false;
  var migrateTries = 0;

  function sbClient() {
    try { return window.eeSupabase ? window.eeSupabase() : null; } catch (e) { return null; }
  }
  function sbUser() {
    var c = sbClient();
    if (!c) return Promise.resolve(null);
    return c.auth
      .getSession()
      .then(function (s) {
        return s && s.data && s.data.session ? s.data.session.user : null;
      })
      .catch(function () { return null; });
  }
  function isStored(v) {
    return typeof v === 'string' && v.slice(0, 3) === 'sb:';
  }
  function isInline(v) {
    return typeof v === 'string' && v.slice(0, 5) === 'data:';
  }
  function dataUrlToBlob(d) {
    var parts = d.split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    var bin = atob(parts[1]);
    var n = bin.length;
    var arr = new Uint8Array(n);
    while (n--) arr[n] = bin.charCodeAt(n);
    return new Blob([arr], { type: mime });
  }
  function uploadImage(dataUrl) {
    var c = sbClient();
    if (!c || !c.storage || !isInline(dataUrl)) return Promise.resolve(null);
    return sbUser()
      .then(function (user) {
        if (!user) return null;
        var path = user.id + '/' + uid() + '.jpg';
        return c.storage
          .from(BUCKET)
          .upload(path, dataUrlToBlob(dataUrl), { contentType: 'image/jpeg', upsert: false })
          .then(function (res) {
            return res && res.error ? null : 'sb:' + path;
          });
      })
      .catch(function () { return null; });
  }
  function signedUrl(val) {
    if (!isStored(val)) return Promise.resolve(val || '');
    var path = val.slice(3);
    var hit = URL_CACHE[path];
    if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
    var c = sbClient();
    if (!c || !c.storage) return Promise.resolve('');
    return c.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(function (res) {
        if (!res || res.error || !res.data) return '';
        URL_CACHE[path] = { url: res.data.signedUrl, exp: Date.now() + 3000000 };
        return res.data.signedUrl;
      })
      .catch(function () { return ''; });
  }
  function setImgSrc(el, val, asBackground) {
    if (!el || !val) return;
    if (!isStored(val)) {
      if (asBackground) el.style.backgroundImage = 'url(' + val + ')';
      else el.src = val;
      return;
    }
    signedUrl(val).then(function (u) {
      if (!u) return;
      if (asBackground) el.style.backgroundImage = 'url(' + u + ')';
      else el.src = u;
    });
  }
  /* Move one inline picture at a time into the bucket, then shrink the saved copy. */
  function migrateImages() {
    if (migrating || !state || !state.boards) return;
    if (!sbClient()) {
      /* supabase-js is loaded async, so it may not be ready yet — try again shortly. */
      if (migrateTries++ < 20) setTimeout(migrateImages, 1500);
      return;
    }
    var pending = null;
    for (var i = 0; i < state.boards.length && !pending; i++) {
      var items = state.boards[i].items || [];
      for (var j = 0; j < items.length; j++) {
        if (isInline(items[j].image)) { pending = items[j]; break; }
      }
    }
    if (!pending) return;
    migrating = true;
    var original = pending.image;
    uploadImage(original)
      .then(function (path) {
        migrating = false;
        if (!path) {
          if (migrateTries++ < 20) setTimeout(migrateImages, 4000);
          return;
        }
        if (pending.image !== original) return;
        pending.image = path;
        persistSafe();
        migrateImages();
      })
      .catch(function () { migrating = false; });
  }
  var $ = function (id) {
    return document.getElementById(id);
  };

  var MONTHS = [
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
  var THEME_HEX = {
    coffee: '#6f4e37',
    clay: '#b07d62',
    sage: '#7d8471',
    plum: '#7a6583',
    gold: '#c2a14d',
  };
  var TYPE_LABEL = {
    goal: 'Goal',
    milestone: 'Milestone',
    achievement: 'Achievement',
    certificate: 'Certificate',
    note: 'Note',
  };
  var STYLE_LABEL = {
    board: 'Plain',
    cork: 'Cork',
    binder: 'Lined',
    bulletin: 'Felt',
  };
  var DEFAULT_BOARD_COLOR = {
    board: '#f5e6ca',
    cork: '#cda373',
    binder: '#fffdf7',
    bulletin: '#e9d9c0',
  };
  var DEFAULT_HI = '#6f4e37';

  var state = { boards: [] };
  var currentBoardId = null;
  var editingBoardId = null;
  var editingItemId = null;
  var draftImage = null;
  var draftType = 'goal';
  var draftPin = 'coffee';
  var draftBoardStyle = 'board';
  var draftBoardColor = DEFAULT_BOARD_COLOR.board;
  var draftHiColor = DEFAULT_HI;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function hexToRgb(hex) {
    var h = (hex || '').replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var r = parseInt(h.slice(0, 2), 16),
      g = parseInt(h.slice(2, 4), 16),
      b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '111,78,55';
    return r + ',' + g + ',' + b;
  }

  function migrateBoard(b) {
    if (!b.boardColor) {
      b.boardColor = DEFAULT_BOARD_COLOR[b.style] || DEFAULT_BOARD_COLOR.board;
    }
    if (!b.hiColor) {
      b.hiColor = THEME_HEX[b.theme] || DEFAULT_HI;
    }
    return b;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.boards)) {
        state = parsed;
        state.boards.forEach(migrateBoard);
        return;
      }
      if (parsed && Array.isArray(parsed.items)) {
        var b = migrateBoard({
          id: uid(),
          name: 'My Board',
          style: parsed.style || 'board',
          theme: parsed.theme || 'coffee',
          scattered: !!parsed.scattered,
          items: parsed.items,
        });
        state = { boards: [b] };
      }
    } catch (e) {
      state = { boards: [] };
    }
  }

  function persistSafe() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('Storage full — try a smaller image');
      return false;
    }
  }

  function getBoard(id) {
    for (var i = 0; i < state.boards.length; i++) {
      if (state.boards[i].id === id) return state.boards[i];
    }
    return null;
  }

  function showBoards() {
    currentBoardId = null;
    $('vbBoardsView').hidden = false;
    $('vbDetailView').hidden = true;
    $('vbAddBoardFab').hidden = false;
    $('vbAddItemFab').hidden = true;
    $('vbIntro').textContent =
      'Create boards for anything — goals, achievements, dreams. Tap one to open it.';
    renderBoards();
  }

  function openBoard(id) {
    var b = getBoard(id);
    if (!b) return;
    currentBoardId = id;
    $('vbBoardsView').hidden = true;
    $('vbDetailView').hidden = false;
    $('vbAddBoardFab').hidden = true;
    $('vbAddItemFab').hidden = false;
    $('vbIntro').textContent =
      'Tap the + to add goals, photos, certificates or notes.';
    $('vbBoardTitle').textContent = b.name;
    renderDetail();
  }

  function renderBoards() {
    var grid = $('vbBoardsGrid');
    grid.innerHTML = '';
    for (var i = 0; i < state.boards.length; i++) {
      grid.appendChild(buildBoardCard(state.boards[i]));
    }
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'vb-add-tile';
    add.innerHTML = '<i data-lucide="plus"></i><span>New board</span>';
    add.addEventListener('click', function () {
      openBoardSheet(null);
    });
    grid.appendChild(add);
    refreshIcons();
  }

  function buildBoardCard(b) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'vb-board-card';
    var preview = document.createElement('div');
    preview.className = 'vb-board-card-preview';
    preview.setAttribute('data-style', b.style || 'board');
    var firstImg = null;
    for (var k = 0; k < b.items.length; k++) {
      if (b.items[k].image) {
        firstImg = b.items[k].image;
        break;
      }
    }
    if (firstImg) {
      setImgSrc(preview, firstImg, true);
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    } else {
      preview.style.background =
        'linear-gradient(135deg,' + b.boardColor + ',' + b.hiColor + '55)';
    }
    var count = document.createElement('span');
    count.className = 'vb-board-card-count';
    count.textContent =
      b.items.length + (b.items.length === 1 ? ' item' : ' items');
    preview.appendChild(count);
    var body = document.createElement('div');
    body.className = 'vb-board-card-body';
    var name = document.createElement('span');
    name.className = 'vb-board-card-name';
    name.textContent = b.name;
    var meta = document.createElement('span');
    meta.className = 'vb-board-card-meta';
    meta.innerHTML =
      '<span class="vb-board-card-dot" style="background:' +
      b.hiColor +
      '"></span>' +
      (STYLE_LABEL[b.style] || 'Plain');
    body.appendChild(name);
    body.appendChild(meta);
    card.appendChild(preview);
    card.appendChild(body);
    card.addEventListener('click', function () {
      openBoard(b.id);
    });
    return card;
  }

  function applyColors(b) {
    var el = $('vbBoard');
    el.style.setProperty('--vb-accent', b.hiColor);
    el.style.setProperty('--vb-accent-rgb', hexToRgb(b.hiColor));
    el.style.setProperty('--vb-board-color', b.boardColor);
    el.style.setProperty('--vb-board-color-rgb', hexToRgb(b.boardColor));
  }

  function renderDetail() {
    var b = getBoard(currentBoardId);
    if (!b) {
      showBoards();
      return;
    }
    var board = $('vbBoard');
    board.setAttribute('data-style', b.style || 'board');
    board.classList.toggle('is-scattered', !!b.scattered);
    applyColors(b);
    var chips = $('vbStyles').querySelectorAll('.vb-style-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle(
        'is-active',
        chips[i].getAttribute('data-style') === (b.style || 'board')
      );
    }
    var grid = $('vbGrid');
    grid.innerHTML = '';
    if (!b.items.length) {
      $('vbEmpty').hidden = false;
    } else {
      $('vbEmpty').hidden = true;
      for (var k = 0; k < b.items.length; k++) {
        grid.appendChild(buildItem(b.items[k]));
      }
    }
    refreshIcons();
  }

  function fmtDate(d) {
    if (!d) return '';
    var parts = d.split('-');
    if (parts.length !== 3) return d;
    return (
      parseInt(parts[2], 10) +
      ' ' +
      MONTHS[parseInt(parts[1], 10) - 1] +
      ' ' +
      parts[0]
    );
  }

  function buildItem(item) {
    var b = getBoard(currentBoardId);
    var card = document.createElement('div');
    card.className = 'vb-item';
    var pinHex = item.pin
      ? THEME_HEX[item.pin] || item.pin
      : b
      ? b.hiColor
      : DEFAULT_HI;
    var pin = document.createElement('span');
    pin.className = 'vb-item-pin';
    pin.style.background = pinHex;
    card.appendChild(pin);
    var badge = document.createElement('span');
    badge.className = 'vb-item-badge';
    badge.textContent = TYPE_LABEL[item.type] || 'Note';
    card.appendChild(badge);
    if (item.image) {
      var img = document.createElement('img');
      img.className = 'vb-item-img';
      setImgSrc(img, item.image, false);
      img.alt = '';
      card.appendChild(img);
    }
    if (item.title) {
      var t = document.createElement('p');
      t.className = 'vb-item-title';
      t.textContent = item.title;
      card.appendChild(t);
    }
    if (item.notes) {
      var n = document.createElement('p');
      n.className = 'vb-item-notes';
      n.textContent = item.notes;
      card.appendChild(n);
    }
    if (item.date) {
      var dt = document.createElement('p');
      dt.className = 'vb-item-date';
      dt.textContent = fmtDate(item.date);
      card.appendChild(dt);
    }
    card.addEventListener('click', function () {
      openItemSheet(item.id);
    });
    return card;
  }

  // ---- board sheet ----
  function openBoardSheet(boardId) {
    editingBoardId = boardId;
    var isEdit = !!boardId;
    var b = isEdit ? getBoard(boardId) : null;
    $('vbBoardSheetTitle').textContent = isEdit ? 'Edit board' : 'New board';
    $('vbBoardSave').textContent = isEdit ? 'Save changes' : 'Create board';
    $('vbBoardName').value = isEdit ? b.name : '';
    $('vbBoardDelete').hidden = !isEdit;
    draftBoardStyle = isEdit ? b.style || 'board' : 'board';
    draftBoardColor = isEdit ? b.boardColor : DEFAULT_BOARD_COLOR.board;
    draftHiColor = isEdit ? b.hiColor : DEFAULT_HI;
    reflectBoardStyle();
    reflectColors();
    $('vbBoardBackdrop').hidden = false;
    $('vbBoardSheet').hidden = false;
    setTimeout(function () {
      $('vbBoardName').focus();
    }, 60);
  }
  function closeBoardSheet() {
    $('vbBoardBackdrop').hidden = true;
    $('vbBoardSheet').hidden = true;
    editingBoardId = null;
  }
  function reflectBoardStyle() {
    var chips = $('vbBoardStyleRow').querySelectorAll('.vb-style-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle(
        'is-active',
        chips[i].getAttribute('data-style') === draftBoardStyle
      );
    }
    // if switching style and boardColor still equals another style default, snap to this style default
  }
  function reflectColors() {
    // board colour swatches
    var br = $('vbBoardColorRow').querySelectorAll('.vb-swatch');
    for (var i = 0; i < br.length; i++) {
      br[i].classList.toggle(
        'is-active',
        (br[i].getAttribute('data-color') || '').toLowerCase() ===
          draftBoardColor.toLowerCase()
      );
    }
    var hr = $('vbHiColorRow').querySelectorAll('.vb-swatch');
    for (var k = 0; k < hr.length; k++) {
      hr[k].classList.toggle(
        'is-active',
        (hr[k].getAttribute('data-color') || '').toLowerCase() ===
          draftHiColor.toLowerCase()
      );
    }
    $('vbBoardColorPicker').value = draftBoardColor;
    $('vbHiColorPicker').value = draftHiColor;
  }
  function saveBoard() {
    var name = $('vbBoardName').value.trim();
    if (!name) {
      toast('Give your board a name');
      $('vbBoardName').focus();
      return;
    }
    if (editingBoardId) {
      var b = getBoard(editingBoardId);
      if (b) {
        b.name = name;
        b.style = draftBoardStyle;
        b.boardColor = draftBoardColor;
        b.hiColor = draftHiColor;
      }
    } else {
      var nb = {
        id: uid(),
        name: name,
        style: draftBoardStyle,
        boardColor: draftBoardColor,
        hiColor: draftHiColor,
        scattered: false,
        items: [],
      };
      state.boards.unshift(nb);
      editingBoardId = nb.id;
    }
    persistSafe();
    closeBoardSheet();
    if (currentBoardId) {
      openBoard(currentBoardId);
    } else {
      showBoards();
    }
  }
  function askDeleteBoard() {
    var b = getBoard(editingBoardId);
    if (!b) return;
    confirmAsk('Delete "' + b.name + '" and everything on it?', function () {
      state.boards = state.boards.filter(function (x) {
        return x.id !== editingBoardId;
      });
      persistSafe();
      closeBoardSheet();
      showBoards();
    });
  }

  // ---- item sheet ----
  function openItemSheet(itemId) {
    var b = getBoard(currentBoardId);
    if (!b) return;
    editingItemId = itemId || null;
    var item = itemId
      ? b.items.filter(function (x) {
          return x.id === itemId;
        })[0]
      : null;
    $('vbSheetTitle').textContent = item ? 'Edit item' : 'Add to board';
    draftType = item ? item.type : 'goal';
    draftPin = item ? item.pin : 'coffee';
    draftImage = item ? item.image || null : null;
    $('vbTitle').value = item ? item.title || '' : '';
    $('vbNotes').value = item ? item.notes || '' : '';
    $('vbDate').value = item ? item.date || '' : '';
    setTypeActive(draftType);
    setPinActive(draftPin);
    reflectImage();
    $('vbDelete').hidden = !item;
    $('vbBackdrop').hidden = false;
    $('vbSheet').hidden = false;
  }
  function closeItemSheet() {
    $('vbBackdrop').hidden = true;
    $('vbSheet').hidden = true;
    editingItemId = null;
    draftImage = null;
  }
  function setTypeActive(type) {
    draftType = type;
    var chips = $('vbTypeRow').querySelectorAll('[data-type]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle(
        'is-active',
        chips[i].getAttribute('data-type') === type
      );
    }
  }
  function setPinActive(pin) {
    draftPin = pin;
    var pins = $('vbPins').querySelectorAll('[data-pin]');
    for (var i = 0; i < pins.length; i++) {
      pins[i].classList.toggle(
        'is-active',
        pins[i].getAttribute('data-pin') === pin
      );
    }
  }
  function reflectImage() {
    if (draftImage) {
      setImgSrc($('vbImageImg'), draftImage, false);
      $('vbImagePreview').hidden = false;
      $('vbImageBtnText').textContent = 'Change picture';
    } else {
      $('vbImagePreview').hidden = true;
      $('vbImageImg').src = '';
      $('vbImageBtnText').textContent = 'Add picture';
    }
  }
  function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('Please choose an image');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast('Image too large (max 4MB)');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      resizeImage(e.target.result, function (data) {
        draftImage = data;
        reflectImage();
      });
    };
    reader.readAsDataURL(file);
  }
  function resizeImage(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var maxDim = 900,
        w = img.width,
        h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      try {
        cb(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        cb(dataUrl);
      }
    };
    img.onerror = function () {
      cb(dataUrl);
    };
    img.src = dataUrl;
  }
  function saveItem() {
    var b = getBoard(currentBoardId);
    if (!b) return;
    var title = $('vbTitle').value.trim();
    var notes = $('vbNotes').value.trim();
    var date = $('vbDate').value;
    if (!title && !notes && !draftImage) {
      toast('Add a title, note or picture');
      return;
    }
    if (editingItemId) {
      var it = b.items.filter(function (x) {
        return x.id === editingItemId;
      })[0];
      if (it) {
        it.type = draftType;
        it.title = title;
        it.notes = notes;
        it.date = date;
        it.pin = draftPin;
        it.image = draftImage;
      }
    } else {
      b.items.unshift({
        id: uid(),
        type: draftType,
        title: title,
        notes: notes,
        date: date,
        pin: draftPin,
        image: draftImage,
        created: Date.now(),
      });
    }
    if (persistSafe()) {
      closeItemSheet();
      renderDetail();
      migrateImages();
    }
  }
  function askDeleteItem() {
    var b = getBoard(currentBoardId);
    if (!b) return;
    confirmAsk('Remove this item from the board?', function () {
      b.items = b.items.filter(function (x) {
        return x.id !== editingItemId;
      });
      persistSafe();
      closeItemSheet();
      renderDetail();
    });
  }

  var confirmCb = null;
  function confirmAsk(msg, cb) {
    confirmCb = cb;
    $('vbConfirmMsg').textContent = msg;
    $('vbConfirmWrap').hidden = false;
  }
  function confirmClose() {
    $('vbConfirmWrap').hidden = true;
    confirmCb = null;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('vbToast');
    t.textContent = msg;
    t.hidden = false;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-show');
      setTimeout(function () {
        t.hidden = true;
      }, 250);
    }, 2200);
  }

  function fillDateChip() {
    var now = new Date();
    if ($('dateDay')) $('dateDay').textContent = now.getDate();
    if ($('dateMonth')) $('dateMonth').textContent = MONTHS[now.getMonth()];
  }
  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  function init() {
    fillDateChip();
    load();

    $('vbAddBoardFab').addEventListener('click', function () {
      openBoardSheet(null);
    });
    $('vbAddItemFab').addEventListener('click', function () {
      openItemSheet(null);
    });
    $('vbBackBoards').addEventListener('click', showBoards);
    $('vbBoardMenu').addEventListener('click', function () {
      if (currentBoardId) openBoardSheet(currentBoardId);
    });

    $('vbStyles').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-style]');
      if (!chip) return;
      var b = getBoard(currentBoardId);
      if (!b) return;
      b.style = chip.getAttribute('data-style');
      persistSafe();
      renderDetail();
    });

    $('vbBoardBackdrop').addEventListener('click', closeBoardSheet);
    $('vbBoardClose').addEventListener('click', closeBoardSheet);
    $('vbBoardSave').addEventListener('click', saveBoard);
    $('vbBoardDelete').addEventListener('click', askDeleteBoard);
    $('vbBoardStyleRow').addEventListener('click', function (e) {
      var c = e.target.closest('[data-style]');
      if (!c) return;
      draftBoardStyle = c.getAttribute('data-style');
      reflectBoardStyle();
    });
    $('vbBoardColorRow').addEventListener('click', function (e) {
      var c = e.target.closest('[data-color]');
      if (!c) return;
      draftBoardColor = c.getAttribute('data-color');
      reflectColors();
    });
    $('vbHiColorRow').addEventListener('click', function (e) {
      var c = e.target.closest('[data-color]');
      if (!c) return;
      draftHiColor = c.getAttribute('data-color');
      reflectColors();
    });
    $('vbBoardColorPicker').addEventListener('input', function (e) {
      draftBoardColor = e.target.value;
      reflectColors();
    });
    $('vbHiColorPicker').addEventListener('input', function (e) {
      draftHiColor = e.target.value;
      reflectColors();
    });
    $('vbBoardName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBoard();
      }
    });

    $('vbBackdrop').addEventListener('click', closeItemSheet);
    $('vbClose').addEventListener('click', closeItemSheet);
    $('vbSave').addEventListener('click', saveItem);
    $('vbDelete').addEventListener('click', askDeleteItem);
    $('vbTypeRow').addEventListener('click', function (e) {
      var c = e.target.closest('[data-type]');
      if (!c) return;
      setTypeActive(c.getAttribute('data-type'));
    });
    $('vbPins').addEventListener('click', function (e) {
      var c = e.target.closest('[data-pin]');
      if (!c) return;
      setPinActive(c.getAttribute('data-pin'));
    });
    $('vbImageBtn').addEventListener('click', function () {
      $('vbFile').click();
    });
    $('vbFile').addEventListener('change', function (e) {
      handleFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $('vbImageRemove').addEventListener('click', function () {
      draftImage = null;
      reflectImage();
    });

    $('vbConfirmNo').addEventListener('click', confirmClose);
    $('vbConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      confirmClose();
      if (cb) cb();
    });

    showBoards();
    refreshIcons();
    migrateImages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
