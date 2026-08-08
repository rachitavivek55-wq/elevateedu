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
    { id: 'confidence', label: 'Confidence', icon: 'smile' },
    { id: 'talk', label: 'Talking', icon: 'message-circle' },
    { id: 'friends', label: 'Friends', icon: 'users' },
    { id: 'reading', label: 'Reading', icon: 'eye' },
    { id: 'awkward', label: 'Awkward', icon: 'shield' },
  ];

  var ARTICLES = [
    {
      id: 'confidence',
      cat: 'confidence',
      minutes: 3,
      title: 'Looking Confident',
      blurb:
        'Simple body-language habits that make you come across as calm and self-assured.',
      body: [
        {
          h: 'It starts with posture',
          p: 'Stand tall, shoulders back and relaxed, chin level. You do not have to puff up. Just stop shrinking. People read an open, upright posture as calm and confident before you say a word.',
        },
        {
          h: 'Slow everything down',
          p: 'Nervous energy makes us rush, our words, our walk, our hands. Moving and speaking a little slower instantly reads as more secure. Take a breath before you answer instead of jumping in.',
        },
        {
          h: 'Eye contact, not a stare',
          p: 'Hold eye contact while the other person talks, then look away naturally now and then. Aim for comfortable, not intense. It shows you are present and not intimidated.',
        },
        {
          h: 'Fake it till it is real',
          p: 'Acting confident actually makes you feel more confident over time. Your brain takes cues from your body. Stand and move like you belong there, and the feeling tends to follow.',
        },
      ],
    },
    {
      id: 'small-talk',
      cat: 'talk',
      minutes: 4,
      title: 'Making Conversation',
      blurb:
        'How to start talking to anyone and keep it flowing without it feeling forced.',
      body: [
        {
          h: 'Just start',
          p: 'Most people are relieved when someone else breaks the ice. You do not need a clever line. A simple comment about where you both are, or a genuine question, is plenty to get going.',
        },
        {
          h: 'Ask open questions',
          p: 'Questions that need more than yes or no keep things alive. Instead of "did you have a good weekend", try "what did you get up to this weekend". It gives the other person room to actually talk.',
        },
        {
          h: 'Try one now',
          p: 'Stuck for something to say? Tap the generator below for a natural conversation starter you can adapt to almost any situation.',
        },
        { widget: 'starters' },
        {
          h: 'Listen more than you talk',
          p: 'The best conversationalists are great listeners. Follow up on what people say instead of waiting for your turn. People walk away feeling good and remember you as easy to talk to.',
        },
      ],
    },
    {
      id: 'listening',
      cat: 'talk',
      minutes: 3,
      title: 'Being A Good Listener',
      blurb: 'The skill that makes people genuinely enjoy being around you.',
      body: [
        {
          h: 'Listen to understand',
          p: 'Most people listen just to reply. Try listening to actually understand instead. Put your own response on hold and focus fully on what they mean, not what you will say next.',
        },
        {
          h: 'Show you are with them',
          p: 'Small signals matter: nodding, a bit of eye contact, a quick "that makes sense". They tell the other person you are present, and they will open up far more.',
        },
        {
          h: 'Ask a follow-up',
          p: 'The simplest way to show you were listening is to ask about something they just said. "You mentioned you play guitar, how long have you been at it?" It shows you actually care.',
        },
      ],
    },
    {
      id: 'making-friends',
      cat: 'friends',
      minutes: 4,
      title: 'Making New Friends',
      blurb: 'How friendships actually form, and how to help them along.',
      body: [
        {
          h: 'Proximity and repetition',
          p: 'Most friendships come from seeing the same people over and over, class, a club, a team. If you want more friends, put yourself in places where you will run into the same faces regularly.',
        },
        {
          h: 'Take the first step',
          p: 'Someone has to reach out first, and it might as well be you. Invite someone to sit together, walk the same way, or grab food. Most people are glad to be asked and would not have asked first.',
        },
        {
          h: 'Be the one who follows up',
          p: 'A good chat is a start, not a friendship. Message them after, remember what they told you, suggest doing something again. Friendships grow from small, repeated effort over time.',
        },
        {
          h: 'Give it time',
          p: 'Real friendships take weeks and months, not one great conversation. Do not read a slow start as rejection. Keep showing up and being warm, and closeness builds on its own.',
        },
      ],
    },
    {
      id: 'reading-people',
      cat: 'reading',
      minutes: 4,
      title: 'Reading The Room',
      blurb: 'Pick up on how people feel and what a situation needs.',
      body: [
        {
          h: 'Watch the body, not just words',
          p: 'People say more with their body than their words. Crossed arms, short replies, checking the phone, these often mean someone is not into it. Notice the signals and adjust rather than pushing on.',
        },
        {
          h: 'Match the energy',
          p: 'A loud joke lands badly in a quiet, serious moment. Read the mood of the group first, then match it. Fitting the energy of the room makes you feel easy to be around.',
        },
        {
          h: 'Know when to wrap up',
          p: 'If someone keeps glancing away, giving one-word answers, or edging off, they are ready to go. Let them, warmly. Reading that and not clinging is a social superpower.',
        },
      ],
    },
    {
      id: 'awkward',
      cat: 'awkward',
      minutes: 3,
      title: 'Handling Awkward Moments',
      blurb: 'What to do when things get uncomfortable, so they pass quickly.',
      body: [
        {
          h: 'Everyone feels it',
          p: 'Awkward moments happen to literally everyone, and people forget them fast. The silence or slip you are cringing about is barely registering for anyone else. That alone takes the pressure off.',
        },
        {
          h: 'Name it or move on',
          p: 'For small stuff, a light "well, that was awkward" with a smile clears the air instantly. Or just move the conversation forward. You do not have to fix it, you just have to keep going.',
        },
        {
          h: 'Recover from a blank',
          p: 'Forgot a name or lost your train of thought? A simple honest line works: "sorry, I completely blanked, remind me of your name?" People respect the ease far more than they judge the slip.',
        },
      ],
    },
    {
      id: 'boundaries',
      cat: 'confidence',
      minutes: 3,
      title: 'Saying No Kindly',
      blurb:
        'Set boundaries without feeling guilty or damaging the relationship.',
      body: [
        {
          h: 'No is a full answer',
          p: 'You do not owe a long excuse. "I can not make it, but thanks for thinking of me" is polite and complete. Over-explaining often sounds like you are looking for permission to say no.',
        },
        {
          h: 'Kind but clear',
          p: 'Say it warmly and directly. Wishy-washy answers invite people to push, and then you feel cornered. Clear and friendly actually protects the relationship better than a vague maybe.',
        },
        {
          h: 'You can care and still decline',
          p: 'Saying no to a request is not rejecting the person. Good friends respect your limits. The ones who guilt-trip you for having any are the ones the boundary is protecting you from.',
        },
      ],
    },
    {
      id: 'online',
      cat: 'friends',
      minutes: 3,
      title: 'Texting & Online',
      blurb: 'Keep your online interactions warm, clear, and drama-free.',
      body: [
        {
          h: 'Tone gets lost in text',
          p: 'Without a voice or a face, messages read colder than you mean. A short "ok" can feel harsh. When something matters, add a little warmth, or better, say it in person or on a call.',
        },
        {
          h: 'Do not stew over replies',
          p: 'People get busy and leave messages on read for a hundred harmless reasons. Assume the kindest explanation instead of spiraling. If it truly matters, just ask them directly and lightly.',
        },
        {
          h: 'Think before you post',
          p: 'Anything you send can be screenshotted and shared. Before posting or texting something heated, wait ten minutes. Ask if you would be fine with anyone seeing it. That pause saves a lot of regret.',
        },
      ],
    },
  ];

  var state = { cat: 'all' };

  var STARTERS = [
    'What have you been into lately outside of school?',
    'Seen anything good worth watching recently?',
    'How do you know most people here?',
    'What is something you are looking forward to this month?',
    'If you had a free weekend, what would you do with it?',
    'What is your go-to spot to eat around here?',
    'How did you get into that? I have always been curious about it.',
    'What is the best thing that happened to you this week?',
    'Are you more of a plan-it-out person or a go-with-the-flow one?',
    'What is something you have changed your mind about lately?',
    'Got any trips or plans coming up?',
    'What is a small thing that always makes your day better?',
  ];

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

  function buildStarters() {
    var box = el('div', 'fx-widget fx-starters');
    box.appendChild(el('div', 'fx-widget-label', 'Conversation starter'));
    var last = -1;
    var line = el('div', 'fx-starter-line', STARTERS[0]);
    function shuffle() {
      var i = last;
      while (i === last) {
        i = Math.floor(Math.random() * STARTERS.length);
      }
      last = i;
      line.classList.remove('is-in');
      void line.offsetWidth;
      line.textContent = STARTERS[i];
      line.classList.add('is-in');
    }
    var btn = el('button', 'fx-pomo-btn fx-primary', 'Give me another');
    var bi = el('i');
    bi.setAttribute('data-lucide', 'shuffle');
    bi.className = 'fx-starter-ic';
    btn.insertBefore(bi, btn.firstChild);
    btn.addEventListener('click', shuffle);
    box.appendChild(line);
    box.appendChild(btn);
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
      if (sec.widget === 'starters') {
        body.appendChild(buildStarters());
        return;
      }
      if (sec.h) body.appendChild(el('h4', 'lb-sec-h', sec.h));
      if (sec.p) body.appendChild(el('p', 'lb-sec-p', sec.p));
    });
    reader.hidden = false;
    void reader.offsetWidth;
    reader.classList.add('is-open');
    var sc = reader.querySelector('.lb-reader-scroll');
    if (sc) sc.scrollTop = 0;
    refreshIcons();
  }

  function closeReader() {
    var reader = $('lbReader');
    if (!reader) return;
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
