(function () {
  'use strict';
  var PG_KEY = 'elevate_progress';
  var PRESETS = [
    { name: 'Front pose', icon: 'user' },
    { name: 'Side pose', icon: 'user' },
    { name: 'Back pose', icon: 'user' },
    { name: 'Face / Skin', icon: 'smile' },
    { name: 'Hair', icon: 'scissors' },
    { name: 'Smile', icon: 'smile' },
    { name: 'Legs', icon: 'footprints' },
    { name: 'Arms', icon: 'dumbbell' },
  ];
  var state = []; // [{id,name,icon,photos:[{id,src,date,note}]}]
  var selPreset = null,
    curCatId = null,
    pendingSrc = null;
  var compareMode = false,
    compareSel = [],
    collageLayout = 'side',
    collageLabels = true,
    collageA = null,
    collageB = null,
    viewerPhoto = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function load() {
    try {
      state = JSON.parse(localStorage.getItem(PG_KEY)) || [];
    } catch (e) {
      state = [];
    }
    if (!Array.isArray(state)) state = [];
  }
  function save() {
    try {
      localStorage.setItem(PG_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Storage full — try smaller photos');
    }
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
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }
  function todayYMD() {
    var d = new Date();
    return (
      d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    );
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
  function byId(id) {
    return state.find(function (c) {
      return c.id === id;
    });
  }
  function sortedPhotos(cat) {
    return (cat.photos || []).slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
  }
  function icon(el) {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function $(id) {
    return document.getElementById(id);
  }
  window.__pgState = function () {
    return {
      cats: state.length,
      photos: state.reduce(function (a, c) {
        return a + (c.photos ? c.photos.length : 0);
      }, 0),
    };
  };

  function allDatesSpan() {
    var all = [];
    state.forEach(function (c) {
      (c.photos || []).forEach(function (p) {
        if (p.date) all.push(p.date);
      });
    });
    if (all.length < 2) return 0;
    all.sort();
    var a = new Date(all[0]),
      b = new Date(all[all.length - 1]);
    return Math.round((b - a) / 86400000);
  }
  function render() {
    var cats = $('pgCats'),
      empty = $('pgEmpty');
    var totalPhotos = state.reduce(function (a, c) {
      return a + (c.photos ? c.photos.length : 0);
    }, 0);
    $('pgCatCount').textContent = state.length;
    $('pgPhotoCount').textContent = totalPhotos;
    $('pgSpan').textContent = allDatesSpan();
    if (!state.length) {
      empty.hidden = false;
      cats.innerHTML = '';
      return;
    }
    empty.hidden = true;
    cats.innerHTML = state
      .map(function (c) {
        var ph = sortedPhotos(c);
        var latest = ph.length ? ph[ph.length - 1] : null;
        var thumb = latest
          ? '<img src="' + latest.src + '" alt="' + esc(c.name) + '" />'
          : '<span class="pg-thumb-empty"><i data-lucide="image"></i></span>';
        var meta = ph.length
          ? ph.length +
            ' photo' +
            (ph.length > 1 ? 's' : '') +
            ' · ' +
            fmtDate(latest.date)
          : 'No photos yet';
        return (
          '<article class="pg-card" data-cat="' +
          c.id +
          '">' +
          '<div class="pg-card-thumb">' +
          thumb +
          (ph.length
            ? '<span class="pg-card-badge">' + ph.length + '</span>'
            : '') +
          '</div>' +
          '<div class="pg-card-body"><p class="pg-card-name">' +
          esc(c.name) +
          '</p><p class="pg-card-meta">' +
          meta +
          '</p></div>' +
          '</article>'
        );
      })
      .join('');
    icon();
  }

  var toastT;
  function toast(msg) {
    var t = $('pgToast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      t.hidden = true;
    }, 1900);
  }

  var confirmCb = null;
  function askConfirm(msg, cb) {
    $('pgConfirmMsg').textContent = msg;
    confirmCb = cb;
    $('pgConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('pgConfirmWrap').hidden = true;
    confirmCb = null;
  }

  // ---- Category sheet ----
  function openCatSheet() {
    selPreset = null;
    $('pgCatName').value = '';
    $('pgPresets').innerHTML = PRESETS.map(function (p) {
      return (
        '<button class="pg-preset" data-preset="' +
        esc(p.name) +
        '" data-icon="' +
        p.icon +
        '"><i data-lucide="' +
        p.icon +
        '"></i>' +
        esc(p.name) +
        '</button>'
      );
    }).join('');
    $('pgCatBackdrop').hidden = false;
    icon();
  }
  function closeCatSheet() {
    $('pgCatBackdrop').hidden = true;
  }
  function saveCat() {
    var name = $('pgCatName').value.trim();
    var ic = selPreset ? selPreset.icon : 'camera';
    if (!name && selPreset) name = selPreset.name;
    if (!name) {
      toast('Give it a name first');
      return;
    }
    state.push({ id: uid(), name: name, icon: ic, photos: [] });
    save();
    render();
    closeCatSheet();
    toast('Category added');
  }

  // ---- Photo helpers: resize to keep localStorage small ----
  function fileToResized(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var max = 1000,
          w = img.width,
          h = img.height;
        if (w > max || h > max) {
          if (w > h) {
            h = Math.round((h * max) / w);
            w = max;
          } else {
            w = Math.round((w * max) / h);
            h = max;
          }
        }
        var cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () {
        cb(null);
      };
      img.src = e.target.result;
    };
    reader.onerror = function () {
      cb(null);
    };
    reader.readAsDataURL(file);
  }

  // ---- Photo add sheet ----
  function openPhotoSheet(catId) {
    curCatId = catId;
    pendingSrc = null;
    $('pgPhotoDate').value = todayYMD();
    $('pgPhotoNote').value = '';
    $('pgPreviewWrap').hidden = true;
    $('pgPreviewImg').removeAttribute('src');
    $('pgDropText').textContent = 'Tap to choose a photo';
    $('pgPhotoSave').disabled = true;
    $('pgPhotoFile').value = '';
    $('pgPhotoBackdrop').hidden = false;
    icon();
  }
  function closePhotoSheet() {
    $('pgPhotoBackdrop').hidden = true;
  }
  function onFilePicked(file) {
    if (!file) {
      return;
    }
    $('pgDropText').textContent = 'Processing…';
    fileToResized(file, function (src) {
      if (!src) {
        toast('Could not read that image');
        $('pgDropText').textContent = 'Tap to choose a photo';
        return;
      }
      pendingSrc = src;
      $('pgPreviewImg').src = src;
      $('pgPreviewWrap').hidden = false;
      $('pgDropText').textContent = 'Choose a different photo';
      $('pgPhotoSave').disabled = false;
    });
  }
  function savePhoto() {
    if (!pendingSrc) {
      toast('Choose a photo first');
      return;
    }
    var cat = byId(curCatId);
    if (!cat) {
      return;
    }
    if (!cat.photos) cat.photos = [];
    cat.photos.push({
      id: uid(),
      src: pendingSrc,
      date: $('pgPhotoDate').value || todayYMD(),
      note: $('pgPhotoNote').value.trim(),
    });
    save();
    render();
    closePhotoSheet();
    if (!$('pgDetailBackdrop').hidden) renderDetail();
    toast('Photo saved');
  }

  // ---- Detail / gallery ----
  function openDetail(catId) {
    curCatId = catId;
    compareMode = false;
    compareSel = [];
    renderDetail();
    $('pgDetailBackdrop').hidden = false;
  }
  function closeDetail() {
    $('pgDetailBackdrop').hidden = true;
    compareMode = false;
    compareSel = [];
  }
  function renderDetail() {
    var cat = byId(curCatId);
    if (!cat) return;
    $('pgDetailName').textContent = cat.name;
    var ph = sortedPhotos(cat);
    $('pgDetailCount').textContent =
      ph.length + ' photo' + (ph.length === 1 ? '' : 's');
    var g = $('pgGallery');
    if (!ph.length) {
      g.innerHTML = '';
      $('pgGalleryEmpty').hidden = false;
    } else {
      $('pgGalleryEmpty').hidden = true;
      g.innerHTML = ph
        .map(function (p) {
          var selIdx = compareSel.indexOf(p.id);
          var selCls = selIdx > -1 ? ' pg-sel' : '';
          var num =
            compareMode && selIdx > -1
              ? '<span class="pg-gsel-num">' + (selIdx + 1) + '</span>'
              : '';
          return (
            '<div class="pg-gitem' +
            selCls +
            '" data-photo="' +
            p.id +
            '"><img src="' +
            p.src +
            '" alt="' +
            esc(p.note || cat.name) +
            '" />' +
            num +
            '<span class="pg-gdate">' +
            fmtDate(p.date) +
            '</span></div>'
          );
        })
        .join('');
    }
    var cmpBtn = $('pgCompareBtn');
    if (compareMode) {
      cmpBtn.classList.add('pg-chip-on');
      $('pgCompareHint').hidden = false;
      $('pgCompareActions').hidden = false;
      $('pgDeleteCat').hidden = true;
    } else {
      cmpBtn.classList.remove('pg-chip-on');
      $('pgCompareHint').hidden = true;
      $('pgCompareActions').hidden = true;
      $('pgDeleteCat').hidden = false;
    }
    $('pgCompareGo').textContent = 'Combine (' + compareSel.length + '/2)';
    $('pgCompareGo').disabled = compareSel.length !== 2;
    if (ph.length < 2) {
      cmpBtn.style.display = 'none';
    } else {
      cmpBtn.style.display = '';
    }
    icon();
  }
  function toggleCompare() {
    compareMode = !compareMode;
    compareSel = [];
    renderDetail();
  }
  function onGalleryClick(pid) {
    var cat = byId(curCatId);
    if (!cat) return;
    if (compareMode) {
      var i = compareSel.indexOf(pid);
      if (i > -1) compareSel.splice(i, 1);
      else {
        if (compareSel.length >= 2) {
          toast('Pick just two');
          return;
        }
        compareSel.push(pid);
      }
      renderDetail();
    } else {
      var ph = (cat.photos || []).find(function (x) {
        return x.id === pid;
      });
      if (ph) openViewer(ph);
    }
  }

  // ---- Viewer ----
  function openViewer(p) {
    viewerPhoto = p;
    $('pgViewerImg').src = p.src;
    $('pgViewerMeta').textContent =
      fmtDate(p.date) + (p.note ? ' · ' + p.note : '');
    $('pgViewerBackdrop').hidden = false;
  }
  function closeViewer() {
    $('pgViewerBackdrop').hidden = true;
    viewerPhoto = null;
  }
  function delViewerPhoto() {
    if (!viewerPhoto) return;
    askConfirm('Delete this photo? This cannot be undone.', function () {
      var cat = byId(curCatId);
      if (cat) {
        cat.photos = (cat.photos || []).filter(function (x) {
          return x.id !== viewerPhoto.id;
        });
        save();
        render();
        renderDetail();
      }
      closeViewer();
      toast('Photo deleted');
    });
  }

  // ---- Collage builder ----
  function loadImg(src) {
    return new Promise(function (res) {
      var i = new Image();
      i.onload = function () {
        res(i);
      };
      i.onerror = function () {
        res(null);
      };
      i.src = src;
    });
  }
  function openCollage() {
    var cat = byId(curCatId);
    if (!cat) return;
    if (compareSel.length !== 2) return;
    var ph = cat.photos || [];
    var a = ph.find(function (x) {
      return x.id === compareSel[0];
    });
    var b = ph.find(function (x) {
      return x.id === compareSel[1];
    });
    if (!a || !b) return;
    // order by date so "before" is earlier
    if (a.date > b.date) {
      var t = a;
      a = b;
      b = t;
    }
    collageA = a;
    collageB = b;
    collageLayout = 'side';
    collageLabels = true;
    $('pgLayoutSide').classList.add('pg-seg-on');
    $('pgLayoutStack').classList.remove('pg-seg-on');
    $('pgLabelToggle').checked = true;
    $('pgCollageBackdrop').hidden = false;
    icon();
    drawCollage();
  }
  function closeCollage() {
    $('pgCollageBackdrop').hidden = true;
  }
  function fitCover(ctx, img, dx, dy, dw, dh) {
    var ir = img.width / img.height,
      dr = dw / dh,
      sx,
      sy,
      sw,
      sh;
    if (ir > dr) {
      sh = img.height;
      sw = sh * dr;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / dr;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  function label(ctx, txt, x, y, w) {
    ctx.save();
    ctx.font = 'bold 30px Poppins, sans-serif';
    var tw = ctx.measureText(txt).width;
    var px = x + w / 2;
    ctx.fillStyle = 'rgba(75,56,50,.82)';
    var bw = tw + 34,
      bh = 44;
    var bx = px - bw / 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, y, bw, bh, 22);
    else ctx.rect(bx, y, bw, bh);
    ctx.fill();
    ctx.fillStyle = '#F5E6CA';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, px, y + bh / 2 + 1);
    ctx.restore();
  }
  async function drawCollage() {
    var cv = $('pgCanvas'),
      ctx = cv.getContext('2d');
    var W = 720,
      H = 720,
      gap = 12;
    cv.width = W;
    cv.height = H;
    ctx.fillStyle = '#F5E6CA';
    ctx.fillRect(0, 0, W, H);
    var ia = await loadImg(collageA.src),
      ib = await loadImg(collageB.src);
    if (collageLayout === 'side') {
      var cw = (W - gap) / 2;
      if (ia) fitCover(ctx, ia, 0, 0, cw, H);
      if (ib) fitCover(ctx, ib, cw + gap, 0, cw, H);
      if (collageLabels) {
        label(ctx, 'BEFORE', 0, H - 58, cw);
        label(ctx, 'AFTER', cw + gap, H - 58, cw);
      }
    } else {
      var ch = (H - gap) / 2;
      if (ia) fitCover(ctx, ia, 0, 0, W, ch);
      if (ib) fitCover(ctx, ib, 0, ch + gap, W, ch);
      if (collageLabels) {
        label(ctx, 'BEFORE', 0, ch - 58, W);
        label(ctx, 'AFTER', 0, H - 58, W);
      }
    }
  }
  function saveCollage() {
    var cat = byId(curCatId);
    if (!cat) return;
    var src = $('pgCanvas').toDataURL('image/jpeg', 0.85);
    if (!cat.photos) cat.photos = [];
    cat.photos.push({
      id: uid(),
      src: src,
      date: collageB.date,
      note: 'Before & after',
    });
    save();
    render();
    closeCollage();
    compareMode = false;
    compareSel = [];
    renderDetail();
    toast('Collage saved to category');
  }

  function deleteCat() {
    var cat = byId(curCatId);
    if (!cat) return;
    askConfirm(
      'Delete "' + cat.name + '" and all its photos? This cannot be undone.',
      function () {
        state = state.filter(function (c) {
          return c.id !== curCatId;
        });
        save();
        render();
        closeDetail();
        toast('Category deleted');
      }
    );
  }

  function wire() {
    $('pgFab').addEventListener('click', openCatSheet);
    $('pgCatClose').addEventListener('click', closeCatSheet);
    $('pgCatSave').addEventListener('click', saveCat);
    $('pgPresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      var name = b.getAttribute('data-preset'),
        ic = b.getAttribute('data-icon');
      selPreset = { name: name, icon: ic };
      Array.prototype.forEach.call($('pgPresets').children, function (el) {
        el.classList.remove('pg-preset-on');
      });
      b.classList.add('pg-preset-on');
      $('pgCatName').value = name;
    });

    $('pgPhotoClose').addEventListener('click', closePhotoSheet);
    $('pgDrop').addEventListener('click', function () {
      $('pgPhotoFile').click();
    });
    $('pgPhotoFile').addEventListener('change', function (e) {
      onFilePicked(e.target.files && e.target.files[0]);
    });
    $('pgPhotoSave').addEventListener('click', savePhoto);

    $('pgCats').addEventListener('click', function (e) {
      var card = e.target.closest('[data-cat]');
      if (!card) return;
      openDetail(card.getAttribute('data-cat'));
    });

    $('pgDetailClose').addEventListener('click', closeDetail);
    $('pgDetailAdd').addEventListener('click', function () {
      openPhotoSheet(curCatId);
    });
    $('pgCompareBtn').addEventListener('click', toggleCompare);
    $('pgCompareCancel').addEventListener('click', function () {
      compareMode = false;
      compareSel = [];
      renderDetail();
    });
    $('pgCompareGo').addEventListener('click', openCollage);
    $('pgDeleteCat').addEventListener('click', deleteCat);
    $('pgGallery').addEventListener('click', function (e) {
      var it = e.target.closest('[data-photo]');
      if (!it) return;
      onGalleryClick(it.getAttribute('data-photo'));
    });

    $('pgViewerClose').addEventListener('click', closeViewer);
    $('pgViewerDel').addEventListener('click', delViewerPhoto);

    $('pgCollageClose').addEventListener('click', closeCollage);
    $('pgLayoutSide').addEventListener('click', function () {
      collageLayout = 'side';
      this.classList.add('pg-seg-on');
      $('pgLayoutStack').classList.remove('pg-seg-on');
      drawCollage();
    });
    $('pgLayoutStack').addEventListener('click', function () {
      collageLayout = 'stack';
      this.classList.add('pg-seg-on');
      $('pgLayoutSide').classList.remove('pg-seg-on');
      drawCollage();
    });
    $('pgLabelToggle').addEventListener('change', function () {
      collageLabels = this.checked;
      drawCollage();
    });
    $('pgCollageSave').addEventListener('click', saveCollage);

    $('pgConfirmNo').addEventListener('click', closeConfirm);
    $('pgConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    });

    // backdrop click-to-close (only on the backdrop itself)
    [
      'pgCatBackdrop',
      'pgPhotoBackdrop',
      'pgDetailBackdrop',
      'pgCollageBackdrop',
    ].forEach(function (id) {
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
    load();
    render();
    wire();
    icon();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
