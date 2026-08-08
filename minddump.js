(function () {
  'use strict';
  var KEY = 'elevate_minddump';
  var $ = function (id) {
    return document.getElementById(id);
  };

  var entries = load();
  var current = null;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }
  function uid() {
    return (
      'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    );
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function icons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }
  var toastT;
  function toast(msg) {
    var t = $('mdToast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      t.hidden = true;
    }, 2200);
  }

  var MONTHS = [
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
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtShort(ts) {
    var d = new Date(ts);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function fmtFull(ts) {
    var d = new Date(ts);
    var h = d.getHours(),
      m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12;
    if (hh === 0) hh = 12;
    var mm = m < 10 ? '0' + m : m;
    return fmtDate(ts) + ' · ' + hh + ':' + mm + ' ' + ap;
  }
  function preview(e) {
    return (e.text || '').replace(/\s+/g, ' ').trim() || 'Empty note';
  }
  function wordCount(s) {
    var t = (s || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function thisWeekCount() {
    var now = new Date();
    var day = now.getDay();
    var monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((day + 6) % 7)
    );
    var start = monday.getTime();
    return entries.filter(function (e) {
      return e.created >= start;
    }).length;
  }

  function renderList() {
    var list = $('mdList');
    var empty = $('mdEmpty');
    $('mdTotal').textContent = entries.length;
    var words = 0;
    for (var k = 0; k < entries.length; k++)
      words += wordCount(entries[k].text);
    $('mdStreak').textContent = thisWeekCount();

    var sorted = entries.slice().sort(function (a, b) {
      return b.updated - a.updated;
    });
    if (!sorted.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var e = sorted[i];
      html +=
        '<div class="md-card" data-id="' +
        e.id +
        '">' +
        '<span class="md-card-ic"><i data-lucide="pencil-line"></i></span>' +
        '<div class="md-card-body">' +
        '<div class="md-card-top">' +
        '<span class="md-card-title">' +
        esc(e.title || 'Untitled') +
        '</span>' +
        '</div>' +
        '<div class="md-card-sub">' +
        esc(preview(e)) +
        '</div>' +
        '</div>' +
        '<span class="md-card-date">' +
        fmtShort(e.updated) +
        '</span>' +
        '</div>';
    }
    list.innerHTML = html;
    icons();
    var cards = list.querySelectorAll('.md-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', function () {
        openEntry(this.getAttribute('data-id'));
      });
    }
  }

  function openEntry(id) {
    var e = entries.filter(function (x) {
      return x.id === id;
    })[0];
    if (!e) return;
    current = e;
    openWrite(e, false);
  }

  // ---------- FREE WRITE ----------
  function newFree() {
    current = {
      id: uid(),
      title: '',
      text: '',
      created: Date.now(),
      updated: Date.now(),
    };
    openWrite(current, true);
  }
  function openWrite(e, isNew) {
    $('mdWriteTitle').value = e.title || '';
    $('mdWriteArea').value = e.text || '';
    $('mdWriteDate').textContent = fmtFull(e.created);
    $('mdWriteDelete').hidden = !!isNew;
    $('mdWrite').hidden = false;
    setTimeout(function () {
      $('mdWriteArea').focus();
    }, 60);
  }
  function closeWrite() {
    $('mdWrite').hidden = true;
  }

  function saveWrite() {
    var text = $('mdWriteArea').value;
    var title = $('mdWriteTitle').value.trim();
    if (!text.trim() && !title) {
      closeWrite();
      current = null;
      return;
    }
    current.text = text;
    current.title = title || autoTitle(text);
    current.updated = Date.now();
    upsert(current);
    save();
    renderList();
    closeWrite();
    current = null;
    toast('Saved');
  }
  function autoTitle(text) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    if (!t) return 'Untitled dump';
    if (t.length <= 34) return t;
    return t.slice(0, 34).replace(/\s\S*$/, '') + '…';
  }
  function upsert(e) {
    var idx = -1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === e.id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) entries.push(e);
    else entries[idx] = e;
  }

  // ---------- DELETE / CONFIRM ----------
  var confirmCb = null;
  function askConfirm(msg, cb) {
    $('mdConfirmMsg').textContent = msg;
    confirmCb = cb;
    $('mdConfirmWrap').hidden = false;
  }
  function closeConfirm() {
    $('mdConfirmWrap').hidden = true;
    confirmCb = null;
  }

  function deleteCurrent() {
    if (!current) return;
    var id = current.id;
    askConfirm("Delete this entry? This can't be undone.", function () {
      entries = entries.filter(function (e) {
        return e.id !== id;
      });
      save();
      renderList();
      closeWrite();
      current = null;
      toast('Deleted');
    });
  }

  function wire() {
    $('mdNewFree').addEventListener('click', newFree);
    $('mdWriteBack').addEventListener('click', saveWrite);
    $('mdWriteSave').addEventListener('click', saveWrite);
    $('mdWriteDelete').addEventListener('click', deleteCurrent);
    $('mdConfirmNo').addEventListener('click', closeConfirm);
    $('mdConfirmYes').addEventListener('click', function () {
      var cb = confirmCb;
      closeConfirm();
      if (cb) cb();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    renderList();
    icons();
  });
})();
