(function () {
  'use strict';
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

  function $(id) {
    return document.getElementById(id);
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  var CATS = [
    { id: 'all', label: 'All', icon: 'sparkles' },
    { id: 'focus', label: 'Focus', icon: 'target' },
    { id: 'method', label: 'Methods', icon: 'layers' },
    { id: 'memory', label: 'Memory', icon: 'brain' },
    { id: 'time', label: 'Time', icon: 'clock' },
    { id: 'habits', label: 'Habits', icon: 'repeat' },
  ];

  // body sections: {h, p}  OR  {widget:'pomodoro'|'breathing'|'checklist', ...}
  var ARTICLES = [
    {
      id: 'pomodoro',
      cat: 'method',
      minutes: 4,
      title: 'The Pomodoro Technique',
      blurb:
        'Work in short, focused sprints with built-in breaks so your brain never burns out.',
      body: [
        {
          h: 'Why it works',
          p: 'Your focus naturally fades after a while. Instead of fighting it, you work in short blocks and rest before you crash. Short deadlines also make big tasks feel less scary, so you actually start.',
        },
        {
          h: 'How to do it',
          p: 'Pick one task. Work for 25 minutes with zero distractions, then take a 5 minute break. After four rounds, take a longer 15 to 30 minute break. That is one full cycle.',
        },
        {
          h: 'Try it now',
          p: 'Use the timer below. Start a 25 minute focus block, and when it ends, actually step away from your desk for the break.',
        },
        { widget: 'pomodoro' },
        {
          h: 'Make it stick',
          p: 'During a block, if a random thought pops up (text a friend, check a score), jot it on paper and deal with it on your break. Protect the 25 minutes.',
        },
      ],
    },
    {
      id: 'deepwork',
      cat: 'focus',
      minutes: 3,
      title: 'Getting Into Deep Focus',
      blurb:
        'The setup and small rituals that make it easy to lock in on hard work.',
      body: [
        {
          h: 'Remove the friction',
          p: 'Put your phone in another room, not just face down. Close every tab you do not need. Have water and everything for the task within reach so you never have a reason to get up.',
        },
        {
          h: 'Use a start ritual',
          p: 'Do the same tiny thing before every session: clear the desk, open the doc, write the one task at the top. Your brain learns that this means it is focus time.',
        },
        {
          h: 'One tab, one task',
          p: 'Multitasking is a myth. Every switch costs you minutes to refocus. Keep a single task visible and everything else out of sight until it is done.',
        },
      ],
    },
    {
      id: 'distraction',
      cat: 'focus',
      minutes: 3,
      title: 'Beating Distractions',
      blurb:
        'Practical ways to stop your phone and your own brain from pulling you away.',
      body: [
        {
          h: 'Make it harder',
          p: 'Log out of apps, use greyscale mode, or leave the phone in another room. You do not need more willpower, you need more friction between you and the distraction.',
        },
        {
          h: 'Park your thoughts',
          p: 'Keep a scrap of paper next to you. Every time a distracting thought shows up, write it down and return to work. You will not forget it, and you will not chase it.',
        },
        {
          h: 'Reset with breathing',
          p: 'When your mind is racing, one minute of slow breathing calms it enough to start again. Try the exercise below whenever you feel scattered.',
        },
        { widget: 'breathing' },
      ],
    },
    {
      id: 'active-recall',
      cat: 'memory',
      minutes: 4,
      title: 'Active Recall',
      blurb:
        'The single most effective way to actually remember what you study.',
      body: [
        {
          h: 'Stop re-reading',
          p: 'Reading your notes over and over feels productive but barely works. It only feels familiar. Real learning happens when you force your brain to pull the answer out.',
        },
        {
          h: 'Test yourself',
          p: 'Close the book and try to explain the topic from memory, or answer questions without looking. Every time you struggle to recall something, that struggle is you building the memory.',
        },
        {
          h: 'Simple routine',
          p: 'After reading a section, cover it and write down everything you remember. Then check what you missed. Do this instead of highlighting and you will remember far more.',
        },
      ],
    },
    {
      id: 'spaced',
      cat: 'memory',
      minutes: 3,
      title: 'Spaced Repetition',
      blurb:
        'Review at the right moments so things move into long-term memory.',
      body: [
        {
          h: 'The forgetting curve',
          p: 'You forget most new information within a day or two unless you revisit it. Reviewing right before you would forget resets the clock and makes the memory stronger each time.',
        },
        {
          h: 'How to space it',
          p: 'Review a topic the same day, then after two days, then a week, then two weeks. Each round takes less time than the last, and it sticks far longer than cramming.',
        },
        {
          h: 'Cramming vs spacing',
          p: 'Cramming the night before can get you through one test, then it is gone. Spacing the same total study time over days means you actually keep it for finals.',
        },
      ],
    },
    {
      id: 'feynman',
      cat: 'method',
      minutes: 3,
      title: 'The Feynman Trick',
      blurb: 'If you can explain it simply, you truly understand it.',
      body: [
        {
          h: 'Teach it to a kid',
          p: 'Pick a concept and explain it out loud in plain words, as if to a younger student. No jargon allowed. Where you get stuck or vague is exactly what you do not understand yet.',
        },
        {
          h: 'Fill the gaps',
          p: 'Go back to your notes for the parts you fumbled, then explain again. Repeat until the whole thing flows in simple language.',
        },
        {
          h: 'Why it works',
          p: 'Hiding behind fancy words lets you fool yourself into thinking you get it. Simple explanations have nowhere to hide, so they expose the gaps and force real understanding.',
        },
      ],
    },
    {
      id: 'timeblock',
      cat: 'time',
      minutes: 3,
      title: 'Time Blocking',
      blurb: 'Give every hour a job so your day does not slip away.',
      body: [
        {
          h: 'Plan the day',
          p: 'Before you start, block your day into chunks: study math 4 to 5, break, essay 5 to 6. A vague to-do list becomes a real plan with a place for everything.',
        },
        {
          h: 'Be realistic',
          p: 'Leave gaps for breaks, food, and overruns. A plan packed too tight falls apart the moment one thing runs late and then you give up on the whole thing.',
        },
        {
          h: 'Protect the blocks',
          p: 'When it is math time, only math exists. Treat each block like a scheduled class you cannot skip, and the day suddenly holds a lot more.',
        },
      ],
    },
    {
      id: 'eat-frog',
      cat: 'time',
      minutes: 2,
      title: 'Eat The Frog First',
      blurb: 'Do the hardest, most dreaded task before anything else.',
      body: [
        {
          h: 'The idea',
          p: 'Your frog is the task you are most likely to avoid. Do it first thing, before your energy and willpower drain away on easier stuff.',
        },
        {
          h: 'Why mornings',
          p: 'Willpower is highest early and fades through the day. The longer you leave the hard task, the more it hangs over you and drains your focus on everything else.',
        },
        {
          h: 'Instant relief',
          p: 'Once the worst thing is done, the rest of the day feels light. You stop dreading it and you have proof you can tackle hard things.',
        },
      ],
    },
    {
      id: 'two-minute',
      cat: 'habits',
      minutes: 2,
      title: 'The Two-Minute Start',
      blurb:
        'The trick for beating procrastination when you just can not begin.',
      body: [
        {
          h: 'Just two minutes',
          p: 'Do not commit to the whole essay. Commit to two minutes: open the doc and write one sentence. Starting is the hard part, and two minutes is small enough that you cannot say no.',
        },
        {
          h: 'Momentum takes over',
          p: 'Almost every time, once you start you keep going far past two minutes. The goal was never two minutes, it was tricking yourself past the wall of starting.',
        },
        {
          h: 'Shrink the task',
          p: 'Whenever something feels too big to begin, shrink it until the first step feels almost silly. Read one page. Solve one problem. Then let momentum do the rest.',
        },
      ],
    },
    {
      id: 'study-habits',
      cat: 'habits',
      minutes: 3,
      title: 'Building A Study Habit',
      blurb: 'Make studying automatic instead of a fight every single day.',
      body: [
        {
          h: 'Same time, same place',
          p: 'Study at the same time and spot each day. When it becomes routine, you stop wasting energy deciding whether to study and just do it, like brushing your teeth.',
        },
        {
          h: 'Anchor it',
          p: 'Attach study to something you already do. After dinner, I study for 30 minutes. Linking a new habit to an old one makes it far easier to remember and stick to.',
        },
        {
          h: 'Start tiny',
          p: 'A 15 minute habit you keep beats a 3 hour plan you abandon. Build the routine first with something small, then grow it once showing up is automatic.',
        },
      ],
    },
  ];

  var state = { cat: 'all', pomo: null };

  function catMeta(id) {
    for (var i = 0; i < CATS.length; i++) {
      if (CATS[i].id === id) return CATS[i];
    }
    return CATS[0];
  }

  function renderChips() {
    var wrap = $('lbChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    CATS.forEach(function (c) {
      var b = el(
        'button',
        'lb-chip' + (state.cat === c.id ? ' is-active' : '')
      );
      var ic = el('i');
      ic.setAttribute('data-lucide', c.icon);
      b.appendChild(ic);
      b.appendChild(el('span', null, c.label));
      b.addEventListener('click', function () {
        state.cat = c.id;
        renderChips();
        renderCards();
      });
      wrap.appendChild(b);
    });
    refreshIcons();
  }

  function renderCards() {
    var grid = $('lbGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var list = ARTICLES.filter(function (a) {
      return state.cat === 'all' || a.cat === state.cat;
    });
    list.forEach(function (a) {
      var card = el('button', 'lb-card');
      var top = el('div', 'lb-card-top');
      var tag = el('span', 'lb-card-tag');
      var cm = catMeta(a.cat);
      var ti = el('i');
      ti.setAttribute('data-lucide', cm.icon);
      tag.appendChild(ti);
      tag.appendChild(el('span', null, cm.label));
      top.appendChild(tag);
      top.appendChild(el('span', 'lb-card-min', a.minutes + ' min'));
      card.appendChild(top);
      card.appendChild(el('h3', 'lb-card-title', a.title));
      card.appendChild(el('p', 'lb-card-blurb', a.blurb));
      card.addEventListener('click', function () {
        openReader(a);
      });
      grid.appendChild(card);
    });
    refreshIcons();
  }

  function buildPomodoro() {
    var box = el('div', 'fx-widget fx-pomo');
    var display = el('div', 'fx-pomo-time', '25:00');
    var modeRow = el('div', 'fx-pomo-modes');
    var modes = [
      { k: 'focus', label: 'Focus', min: 25 },
      { k: 'short', label: 'Short break', min: 5 },
      { k: 'long', label: 'Long break', min: 15 },
    ];
    var s = { running: false, remaining: 25 * 60, mode: 'focus', tick: null };
    if (state.pomo && state.pomo.tick) {
      clearInterval(state.pomo.tick);
    }
    state.pomo = s;

    function fmt(sec) {
      var m = Math.floor(sec / 60),
        r = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }
    function paint() {
      display.textContent = fmt(s.remaining);
    }
    var modeBtns = [];
    modes.forEach(function (md) {
      var mb = el(
        'button',
        'fx-pomo-mode' + (md.k === s.mode ? ' is-active' : ''),
        md.label
      );
      mb.addEventListener('click', function () {
        s.mode = md.k;
        s.running = false;
        if (s.tick) {
          clearInterval(s.tick);
          s.tick = null;
        }
        s.remaining = md.min * 60;
        paint();
        startBtn.textContent = 'Start';
        modeBtns.forEach(function (x) {
          x.classList.remove('is-active');
        });
        mb.classList.add('is-active');
      });
      modeBtns.push(mb);
      modeRow.appendChild(mb);
    });

    var ctrlRow = el('div', 'fx-pomo-ctrls');
    var startBtn = el('button', 'fx-pomo-btn fx-primary', 'Start');
    var resetBtn = el('button', 'fx-pomo-btn', 'Reset');
    function currentMin() {
      for (var i = 0; i < modes.length; i++) {
        if (modes[i].k === s.mode) return modes[i].min;
      }
      return 25;
    }
    startBtn.addEventListener('click', function () {
      if (s.running) {
        s.running = false;
        if (s.tick) {
          clearInterval(s.tick);
          s.tick = null;
        }
        startBtn.textContent = 'Resume';
      } else {
        s.running = true;
        startBtn.textContent = 'Pause';
        s.tick = setInterval(function () {
          if (s.remaining > 0) {
            s.remaining--;
            paint();
          }
          if (s.remaining <= 0) {
            clearInterval(s.tick);
            s.tick = null;
            s.running = false;
            startBtn.textContent = 'Start';
            display.classList.add('is-done');
            setTimeout(function () {
              display.classList.remove('is-done');
            }, 1600);
          }
        }, 1000);
      }
    });
    resetBtn.addEventListener('click', function () {
      s.running = false;
      if (s.tick) {
        clearInterval(s.tick);
        s.tick = null;
      }
      s.remaining = currentMin() * 60;
      paint();
      startBtn.textContent = 'Start';
    });
    ctrlRow.appendChild(startBtn);
    ctrlRow.appendChild(resetBtn);

    box.appendChild(el('div', 'fx-widget-label', 'Focus timer'));
    box.appendChild(display);
    box.appendChild(modeRow);
    box.appendChild(ctrlRow);
    paint();
    return box;
  }

  function buildBreathing() {
    var box = el('div', 'fx-widget fx-breathe');
    box.appendChild(el('div', 'fx-widget-label', 'Reset breathing'));
    var circle = el('div', 'fx-breathe-circle');
    var word = el('span', 'fx-breathe-word', 'Tap to start');
    circle.appendChild(word);
    var b = { on: false, tick: null, phase: 0 };
    var phases = [
      { t: 'Breathe in', d: 4000 },
      { t: 'Hold', d: 4000 },
      { t: 'Breathe out', d: 4000 },
      { t: 'Hold', d: 4000 },
    ];
    function step() {
      var p = phases[b.phase % phases.length];
      word.textContent = p.t;
      circle.classList.remove('is-in', 'is-out');
      if (p.t === 'Breathe in') circle.classList.add('is-in');
      else if (p.t === 'Breathe out') circle.classList.add('is-out');
      b.phase++;
      b.tick = setTimeout(step, p.d);
    }
    circle.addEventListener('click', function () {
      if (b.on) {
        b.on = false;
        if (b.tick) {
          clearTimeout(b.tick);
          b.tick = null;
        }
        circle.classList.remove('is-in', 'is-out');
        word.textContent = 'Tap to start';
      } else {
        b.on = true;
        b.phase = 0;
        step();
      }
    });
    box.appendChild(circle);
    return box;
  }

  function openReader(a) {
    var reader = $('lbReader');
    if (!reader) return;
    $('lbReadTag').textContent = catMeta(a.cat).label;
    $('lbReadMin').textContent = a.minutes + ' min read';
    $('lbReadTitle').textContent = a.title;
    var body = $('lbReadBody');
    body.innerHTML = '';
    a.body.forEach(function (sec) {
      if (sec.widget === 'pomodoro') {
        body.appendChild(buildPomodoro());
        return;
      }
      if (sec.widget === 'breathing') {
        body.appendChild(buildBreathing());
        return;
      }
      if (sec.h) body.appendChild(el('h4', 'lb-sec-h', sec.h));
      if (sec.p) body.appendChild(el('p', 'lb-sec-p', sec.p));
    });
    reader.hidden = false;
    // force reflow then open for transition
    void reader.offsetWidth;
    reader.classList.add('is-open');
    var sc = reader.querySelector('.lb-reader-scroll');
    if (sc) sc.scrollTop = 0;
    refreshIcons();
  }

  function closeReader() {
    var reader = $('lbReader');
    if (!reader) return;
    // stop any running widgets
    if (state.pomo && state.pomo.tick) {
      clearInterval(state.pomo.tick);
      state.pomo.tick = null;
    }
    reader.classList.remove('is-open');
    setTimeout(function () {
      reader.hidden = true;
      var b = $('lbReadBody');
      if (b) b.innerHTML = '';
    }, 240);
  }

  function fillDateChip() {
    var d = new Date();
    var dd = $('dateDay'),
      dm = $('dateMonth');
    if (dd) dd.textContent = d.getDate();
    if (dm) dm.textContent = MONTHS[d.getMonth()];
  }

  function init() {
    fillDateChip();
    renderChips();
    renderCards();
    var close = $('lbReadClose');
    if (close) close.addEventListener('click', closeReader);
    var back = $('lbReadBackdrop');
    if (back) back.addEventListener('click', closeReader);
    refreshIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
