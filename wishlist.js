(function () {
  'use strict';

  var ITEMS_KEY = 'elevate_wishlist_items';
  var BALANCE_KEY = 'elevate_balance_state';

  var $ = function (id) {
    return document.getElementById(id);
  };
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function load() {
    try {
      var raw = localStorage.getItem(ITEMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function save(items) {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  var items = load();
  var filter = 'all';

  function fmtMoney(v) {
    if (v == null || isNaN(v)) return '';
    return (
      '$' +
      Number(v).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function normalizeUrl(u) {
    if (!u) return '';
    u = u.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }
  function hostOf(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, '');
    } catch (e) {
      return 'link';
    }
  }

  function refreshLucide() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
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

  // ---------- Render ----------
  function passesFilter(it) {
    if (filter === 'all') return true;
    if (filter === 'high') return it.priority === 'high';
    if (filter === 'open') return !it.got;
    if (filter === 'got') return it.got;
    return true;
  }

  function getPiggyBalance() {
    try {
      var raw = localStorage.getItem(BALANCE_KEY);
      if (!raw) return 0;
      var s = JSON.parse(raw);
      return typeof s.amount === 'number' ? s.amount : 0;
    } catch (e) {
      return 0;
    }
  }

  function renderSummary() {
    var open = items.filter(function (i) {
      return !i.got;
    });
    var total = open.reduce(function (s, i) {
      return s + (Number(i.price) || 0);
    }, 0);
    $('wlTotalOpen').textContent = fmtMoney(total) || '$0.00';
    $('wlCountOpen').textContent = String(open.length);

    var piggy = getPiggyBalance();
    var piggyEl = $('wlPiggy');
    if (piggyEl) piggyEl.textContent = fmtMoney(piggy) || '$0.00';
  }

  function render() {
    renderSummary();
    var ul = $('wlList');
    var empty = $('wlEmpty');
    var visible = items.filter(passesFilter);

    if (items.length === 0) {
      ul.innerHTML = '';
      empty.hidden = false;
      empty.querySelector('p').textContent = 'Your wishlist is empty.';
      empty.querySelector('span').textContent =
        "Tap the + to save something you're dreaming about — a hoodie, a game, concert tickets.";
      refreshLucide();
      return;
    }
    if (visible.length === 0) {
      ul.innerHTML = '';
      empty.hidden = false;
      empty.querySelector('p').textContent = 'Nothing here yet.';
      empty.querySelector('span').textContent = 'No items match this filter.';
      refreshLucide();
      return;
    }
    empty.hidden = true;

    var html = '';
    visible.forEach(function (it) {
      var cls =
        'wl-item' +
        (it.got ? ' got' : '') +
        (it.priority === 'high' ? ' high' : '');
      var priceHtml =
        it.price != null && it.price !== ''
          ? '<span class="wl-item-price">' + esc(fmtMoney(it.price)) + '</span>'
          : '';
      var noteHtml = it.note
        ? '<p class="wl-item-note">' + esc(it.note) + '</p>'
        : '';
      var meta = [];
      if (it.priority === 'high')
        meta.push('<span class="wl-tag high">Must have</span>');
      if (it.link) {
        meta.push(
          '<a class="wl-link" href="' +
            esc(normalizeUrl(it.link)) +
            '" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i>' +
            esc(hostOf(normalizeUrl(it.link))) +
            '</a>'
        );
      }
      var metaHtml = meta.length
        ? '<div class="wl-item-meta">' +
          meta.join('') +
          '<div class="wl-item-actions">' +
          '<button class="wl-mini-btn" data-act="edit" data-id="' +
          it.id +
          '" title="Edit"><i data-lucide="pencil"></i></button>' +
          '<button class="wl-mini-btn danger" data-act="del" data-id="' +
          it.id +
          '" title="Remove"><i data-lucide="trash-2"></i></button>' +
          '</div></div>'
        : '<div class="wl-item-meta"><div class="wl-item-actions">' +
          '<button class="wl-mini-btn" data-act="edit" data-id="' +
          it.id +
          '" title="Edit"><i data-lucide="pencil"></i></button>' +
          '<button class="wl-mini-btn danger" data-act="del" data-id="' +
          it.id +
          '" title="Remove"><i data-lucide="trash-2"></i></button>' +
          '</div></div>';

      html +=
        '<li class="' +
        cls +
        '" data-id="' +
        it.id +
        '">' +
        '<button class="wl-check" data-act="toggle" data-id="' +
        it.id +
        '" title="Mark as got"><i data-lucide="check"></i></button>' +
        '<div class="wl-item-body">' +
        '<div class="wl-item-top">' +
        '<h3 class="wl-item-name">' +
        esc(it.name) +
        '</h3>' +
        priceHtml +
        '</div>' +
        noteHtml +
        metaHtml +
        '</div>' +
        '</li>';
    });
    ul.innerHTML = html;
    refreshLucide();
  }

  // ---------- Sheet (add / edit) ----------
  var editingId = null;

  function openSheet(item) {
    editingId = item ? item.id : null;
    $('wlSheetTitle').textContent = item ? 'Edit item' : 'Add to wishlist';
    var prio = item && item.priority === 'high' ? 'high' : 'normal';
    $('wlSheetBody').innerHTML =
      '<div class="wl-field">' +
      '<label>What is it?</label>' +
      '<input class="wl-input" id="wlName" type="text" maxlength="80" placeholder="e.g. Wireless headphones" value="' +
      esc(item ? item.name : '') +
      '" />' +
      '</div>' +
      '<div class="wl-row">' +
      '<div class="wl-field">' +
      '<label>Price</label>' +
      '<input class="wl-input" id="wlPrice" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="' +
      esc(item && item.price != null ? item.price : '') +
      '" />' +
      '</div>' +
      '<div class="wl-field">' +
      '<label>Priority</label>' +
      '<div class="wl-prio">' +
      '<button type="button" class="wl-prio-opt' +
      (prio === 'normal' ? ' active' : '') +
      '" data-prio="normal">Want</button>' +
      '<button type="button" class="wl-prio-opt' +
      (prio === 'high' ? ' active' : '') +
      '" data-prio="high">Must</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="wl-field">' +
      '<label>Link (optional)</label>' +
      '<input class="wl-input" id="wlLink" type="text" placeholder="Paste a product link" value="' +
      esc(item ? item.link : '') +
      '" />' +
      '</div>' +
      '<div class="wl-field">' +
      '<label>Note (optional)</label>' +
      '<textarea class="wl-textarea" id="wlNote" maxlength="240" placeholder="Colour, size, why you want it…">' +
      esc(item ? item.note : '') +
      '</textarea>' +
      '</div>' +
      '<button class="wl-btn wl-btn-primary" id="wlSave">' +
      (item ? 'Save changes' : 'Add to wishlist') +
      '</button>';

    $('wlBackdrop').hidden = false;
    $('wlSheet').hidden = false;

    var nameInput = $('wlName');
    var saveBtn = $('wlSave');
    var selectedPrio = prio;

    function validate() {
      saveBtn.disabled = nameInput.value.trim() === '';
    }
    validate();
    nameInput.addEventListener('input', validate);

    $('wlSheetBody')
      .querySelectorAll('.wl-prio-opt')
      .forEach(function (b) {
        b.addEventListener('click', function () {
          selectedPrio = b.getAttribute('data-prio');
          $('wlSheetBody')
            .querySelectorAll('.wl-prio-opt')
            .forEach(function (x) {
              x.classList.remove('active');
            });
          b.classList.add('active');
        });
      });

    saveBtn.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) return;
      var priceRaw = $('wlPrice').value.trim();
      var price =
        priceRaw === '' ? null : Math.round(parseFloat(priceRaw) * 100) / 100;
      if (price != null && (isNaN(price) || price < 0)) price = null;
      var link = $('wlLink').value.trim();
      var note = $('wlNote').value.trim();

      if (editingId) {
        var idx = items.findIndex(function (i) {
          return i.id === editingId;
        });
        if (idx > -1) {
          items[idx].name = name;
          items[idx].price = price;
          items[idx].link = link;
          items[idx].note = note;
          items[idx].priority = selectedPrio;
        }
      } else {
        items.unshift({
          id: uid(),
          name: name,
          price: price,
          link: link,
          note: note,
          priority: selectedPrio,
          got: false,
          created: Date.now(),
        });
      }
      save(items);
      closeSheet();
      render();
    });

    setTimeout(function () {
      nameInput.focus();
    }, 60);
    refreshLucide();
  }

  function closeSheet() {
    $('wlBackdrop').hidden = true;
    $('wlSheet').hidden = true;
    editingId = null;
  }

  // ---------- Confirm ----------
  var pendingDelete = null;
  function askDelete(id) {
    var it = items.find(function (i) {
      return i.id === id;
    });
    pendingDelete = id;
    $('wlConfirmMsg').textContent = it
      ? 'Remove "' + it.name + '" from your wishlist?'
      : 'Remove this item?';
    $('wlConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('wlConfirmWrap').hidden = true;
    pendingDelete = null;
  }
  function doDelete() {
    if (!pendingDelete) return;
    items = items.filter(function (i) {
      return i.id !== pendingDelete;
    });
    save(items);
    closeConfirm();
    render();
  }

  function toggleGot(id) {
    var it = items.find(function (i) {
      return i.id === id;
    });
    if (!it) return;
    it.got = !it.got;
    save(items);
    render();
  }

  // ---------- Wire ----------
  function wire() {
    $('wlFab').addEventListener('click', function () {
      openSheet(null);
    });
    $('wlSheetClose').addEventListener('click', closeSheet);
    $('wlBackdrop').addEventListener('click', closeSheet);
    $('wlConfirmNo').addEventListener('click', closeConfirm);
    $('wlConfirmYes').addEventListener('click', doDelete);

    $('wlFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('.wl-chip');
      if (!chip) return;
      filter = chip.getAttribute('data-filter');
      $('wlFilters')
        .querySelectorAll('.wl-chip')
        .forEach(function (c) {
          c.classList.remove('active');
        });
      chip.classList.add('active');
      render();
    });

    $('wlList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var id = btn.getAttribute('data-id');
      if (act === 'toggle') toggleGot(id);
      else if (act === 'del') askDelete(id);
      else if (act === 'edit') {
        var it = items.find(function (i) {
          return i.id === id;
        });
        if (it) openSheet(it);
      }
    });

    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var tab = b.getAttribute('data-tab');
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
    });
  }

  function init() {
    setDateChip();
    wire();
    window.addEventListener('storage', function (e) {
      if (e.key === BALANCE_KEY) renderSummary();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderSummary();
    });
    window.addEventListener('storage', function (e) {
      if (e.key === BALANCE_KEY) renderSummary();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderSummary();
    });
    window.addEventListener('storage', function (e) {
      if (e.key === BALANCE_KEY) renderSummary();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderSummary();
    });
    // Keep the piggy-bank figure in sync with the Balance tool
    window.addEventListener('storage', function (e) {
      if (e.key === BALANCE_KEY) renderSummary();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderSummary();
    });
    render();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
/* saved */
