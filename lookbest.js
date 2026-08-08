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

  // ---- Content data ----------------------------------------------------
  var CATS = [
    { id: 'all', label: 'All', icon: 'sparkles' },
    { id: 'skincare', label: 'Skincare', icon: 'droplet' },
    { id: 'hygiene', label: 'Hygiene', icon: 'shower-head' },
    { id: 'hair', label: 'Hair', icon: 'scissors' },
    { id: 'style', label: 'Style', icon: 'shirt' },
    { id: 'grooming', label: 'Grooming', icon: 'wand-sparkles' },
  ];

  var ARTICLES = [
    {
      id: 'skin-basics',
      cat: 'skincare',
      title: 'A skincare routine that actually works',
      blurb: 'Three simple steps, morning and night — no 12-step hype needed.',
      minutes: 3,
      body: [
        {
          h: 'Keep it to three steps',
          p: 'Great skin is mostly consistency, not expensive products. Morning and night, do the same three things: cleanse, moisturise, and (in the morning) protect with sunscreen. That is genuinely enough for most students.',
        },
        {
          h: '1. Cleanse gently',
          p: 'Use a mild, fragrance-free cleanser and lukewarm water. Wash your face when you wake up and before bed, plus after heavy sweating. Scrubbing hard or using very hot water strips your skin and makes oiliness worse, not better.',
        },
        {
          h: '2. Moisturise every time',
          p: 'Even oily and acne-prone skin needs moisturiser — skipping it makes your skin overproduce oil. Apply a light moisturiser while your face is still slightly damp to lock in water.',
        },
        {
          h: '3. Sunscreen is the glow-up',
          p: 'Daily SPF 30+ is the single biggest thing you can do for clear, even-toned skin long term. It prevents dark spots, uneven tone, and early ageing. Use it every morning, even when it is cloudy or you are mostly indoors near windows.',
        },
        {
          h: 'Give it time',
          p: 'Skin renews on roughly a 4-6 week cycle, so give any routine at least a month before deciding it is not working. Change one thing at a time so you know what actually helped.',
        },
      ],
    },
    {
      id: 'acne',
      cat: 'skincare',
      title: 'Dealing with breakouts without making them worse',
      blurb:
        'What helps spots calm down — and the habits that quietly cause them.',
      minutes: 4,
      body: [
        {
          h: 'Do not pick',
          p: 'It is tempting, but squeezing spots pushes bacteria deeper, makes them redder, and is the main cause of scars and dark marks that last for months. Hands off is the hardest and most effective rule.',
        },
        {
          h: 'Look for these ingredients',
          p: 'Salicylic acid helps unclog pores and works well for blackheads and whiteheads. Benzoyl peroxide targets acne bacteria. Start with one, a few times a week, and build up slowly so you do not dry out or irritate your skin.',
        },
        {
          h: 'Check your everyday habits',
          p: 'Phone screens, pillowcases, and hats touch your face constantly. Wipe your phone, swap pillowcases twice a week, and try not to rest your chin in your hands during class. Wash your face after sport.',
        },
        {
          h: 'When to see someone',
          p: 'If breakouts are painful, cystic, or really affecting your confidence, a doctor or dermatologist can help — acne is medical, not a personal failing, and there are treatments that work. Asking for help is a smart move, not a vain one.',
        },
      ],
    },
    {
      id: 'shower',
      cat: 'hygiene',
      title: 'Daily hygiene that keeps you fresh all day',
      blurb:
        'The unglamorous basics that make the biggest difference to how you come across.',
      minutes: 3,
      body: [
        {
          h: 'Shower and the details',
          p: 'A daily shower (or after any workout) is the foundation. Pay attention to the easy-to-forget spots: behind the ears, the back of the neck, feet, and underarms. Dry off properly — damp skin traps odour.',
        },
        {
          h: 'Deodorant vs antiperspirant',
          p: 'Deodorant masks smell; antiperspirant reduces sweat. Apply to clean, dry skin. Putting it on at night as well as the morning can actually work better, because it has time to absorb.',
        },
        {
          h: 'Fresh breath',
          p: 'Brush twice a day for two minutes, floss once, and gently brush your tongue — most bad breath comes from the tongue, not the teeth. Keep water handy; a dry mouth smells stronger. Sugar-free gum is a fine backup between classes.',
        },
        {
          h: 'Hands and nails',
          p: 'Clean, trimmed nails and regular hand-washing quietly signal that you look after yourself, and they cut down on the germs that cause breakouts and illness.',
        },
      ],
    },
    {
      id: 'sweat',
      cat: 'hygiene',
      title: 'Managing sweat and body odour',
      blurb:
        'Why we smell, and the practical fixes that actually hold up during a long day.',
      minutes: 3,
      body: [
        {
          h: 'Sweat itself is odourless',
          p: 'Body odour comes from bacteria breaking down sweat, not the sweat itself. That is why washing, drying, and fresh clothes matter as much as any product — you are removing the bacteria and their food.',
        },
        {
          h: 'Fabrics matter',
          p: 'Natural fabrics like cotton let your skin breathe, while tight synthetic fabrics can trap heat and smell. Always start the day in fresh clothes — re-wearing a worn shirt is the most common hidden cause of odour.',
        },
        {
          h: 'Feet',
          p: 'Feet sweat a lot. Rotate your shoes so each pair dries out for a day, wear clean socks daily, and let trainers air out. A quick foot wash and full dry before bed makes a surprising difference.',
        },
        {
          h: 'When to get advice',
          p: 'If you sweat far more than people around you and it bothers you, that is common and treatable — a doctor can suggest stronger options. It is nothing to be embarrassed about.',
        },
      ],
    },
    {
      id: 'hair-care',
      cat: 'hair',
      title: 'Healthy hair without overthinking it',
      blurb:
        'How often to wash, how to protect it, and why less is often more.',
      minutes: 3,
      body: [
        {
          h: 'You probably wash too often',
          p: 'Washing every single day can strip the natural oils that keep hair healthy and make your scalp produce even more oil. Most hair does well washed every 2-3 days — experiment to find your rhythm.',
        },
        {
          h: 'Condition the ends, not the roots',
          p: 'Apply conditioner from the mid-lengths down to the ends, where hair is oldest and driest. Keeping it off your scalp stops roots getting greasy fast.',
        },
        {
          h: 'Be gentle when wet',
          p: 'Hair is weakest when wet. Pat it dry instead of rubbing, and detangle with a wide-tooth comb starting from the ends and working up. Blasting it with the hottest dryer setting every day causes breakage.',
        },
        {
          h: 'Trims and basics',
          p: 'A trim every 6-10 weeks keeps ends from splitting and hair looking intentional. Drinking enough water and eating decently shows up in your hair and skin more than any product does.',
        },
      ],
    },
    {
      id: 'hair-style',
      cat: 'hair',
      title: 'Finding a style that suits you',
      blurb:
        'Simple ways to figure out what works — and how to talk to a barber or stylist.',
      minutes: 3,
      body: [
        {
          h: 'Work with your hair, not against it',
          p: 'The easiest style to maintain is one that works with your natural texture and growth. Fighting curly hair straight (or vice versa) every morning gets exhausting fast. Lean into what you have got.',
        },
        {
          h: 'Face shape is a loose guide',
          p: 'Styles with a bit of height on top can lengthen a rounder face; softer, fuller sides can balance a longer one. Treat this as a starting hint, not a rule — confidence carries a look more than geometry does.',
        },
        {
          h: 'How to ask for a cut',
          p: 'Bring a photo, and describe length in practical terms ("enough to still comb it to the side"). Ask the barber or stylist what will be easy to maintain for you — a good one will tell you honestly.',
        },
        {
          h: 'Give it a week',
          p: 'A fresh cut almost always feels strange for a few days. Let it settle and see how it looks once it has relaxed before deciding you dislike it.',
        },
      ],
    },
    {
      id: 'style-basics',
      cat: 'style',
      title: 'Building a simple wardrobe that always works',
      blurb:
        'Fit, a few solid basics, and looking put-together without spending much.',
      minutes: 4,
      body: [
        {
          h: 'Fit beats brand every time',
          p: 'A cheap top that fits your shoulders and torso well looks better than an expensive one that is too big or too tight. When you shop, judge the fit at the shoulders first — that is the hardest thing to fix.',
        },
        {
          h: 'Start with versatile basics',
          p: 'A few plain tees, one pair of jeans that fit well, a neutral hoodie or jumper, clean shoes, and one slightly smarter option covers almost everything. Neutral colours (white, black, grey, navy, beige) mix together effortlessly.',
        },
        {
          h: 'Keep it clean and cared for',
          p: 'Clean, un-wrinkled, un-stained clothes read as "put-together" far more than trendiness does. A quick iron or steam and clean shoes lift an ordinary outfit instantly.',
        },
        {
          h: 'Dress for the situation',
          p: 'Notice what fits the setting — school, a presentation, meeting friends. You do not need many clothes; you need a few things you can combine and that suit where you are going.',
        },
      ],
    },
    {
      id: 'style-confidence',
      cat: 'style',
      title: 'Wear it with confidence',
      blurb:
        'Small styling tricks and the mindset that makes any outfit look better.',
      minutes: 2,
      body: [
        {
          h: 'Confidence is the real accessory',
          p: 'The exact same outfit looks completely different on someone standing tall and relaxed versus someone hunched and fidgeting. Good posture and an easy manner do more for a look than any single item.',
        },
        {
          h: 'One or two small touches',
          p: 'A watch, a simple chain, tucking in a shirt, or rolling your sleeves can pull a plain outfit together. Pick one or two details rather than piling everything on at once.',
        },
        {
          h: 'Dress for yourself',
          p: 'Trends come and go, and chasing every one is expensive and exhausting. Figure out what you feel good in and lean into it — comfort in your own clothes reads as style.',
        },
      ],
    },
    {
      id: 'scent',
      cat: 'grooming',
      title: 'Smelling good, the subtle way',
      blurb: 'How to use fragrance so people notice you, not your perfume.',
      minutes: 2,
      body: [
        {
          h: 'Clean comes first',
          p: 'No fragrance covers up skipped basics — it just mixes with them. Shower, fresh clothes, and deodorant are the foundation; scent is the finishing touch on top of that, never a substitute.',
        },
        {
          h: 'Less is more',
          p: 'One or two sprays on the pulse points — wrists, neck — is plenty. If you can strongly smell your own fragrance after a few minutes, everyone around you is getting far too much. Subtle means people catch it only when they are close.',
        },
        {
          h: 'Make it last',
          p: 'Fragrance clings better to moisturised skin, so apply after a shower onto slightly moisturised skin. Do not rub your wrists together — it breaks down the scent. A little on your clothes can help it last through the day.',
        },
      ],
    },
    {
      id: 'grooming-details',
      cat: 'grooming',
      title: 'The little grooming details people notice',
      blurb:
        'Eyebrows, nails, lips, and the small finishing touches that add up.',
      minutes: 3,
      body: [
        {
          h: 'Tidy, not perfect',
          p: 'Grooming is about looking intentional, not flawless. A few tidy details — neat nails, groomed eyebrows, moisturised lips — quietly signal that you take care of yourself, without anyone being able to point to why.',
        },
        {
          h: 'Eyebrows and stray hairs',
          p: 'You do not need to shape your brows dramatically; just tidying obvious stray hairs makes your whole face look neater. Go slow — it is easy to over-do and it grows back slowly.',
        },
        {
          h: 'Lips and hands',
          p: 'Chapped lips and dry, cracked hands are easy to fix and very noticeable. Keep a lip balm and a small hand cream in your bag, especially in cold weather.',
        },
        {
          h: 'Shaving or growing it out',
          p: 'Whether you shave or grow facial hair, the key is keeping it deliberate — clean lines or an evenly maintained length both look good. Patchy and forgotten is the only thing to avoid. Use a fresh blade and moisturise after to prevent irritation.',
        },
      ],
    },
  ];

  // ---- Element helpers -------------------------------------------------
  function $(id) {
    return document.getElementById(id);
  }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  var state = { cat: 'all' };

  // ---- Category chips --------------------------------------------------
  function renderChips() {
    var row = $('lbChips');
    row.innerHTML = '';
    CATS.forEach(function (c) {
      var chip = el(
        'button',
        'lb-chip' + (state.cat === c.id ? ' is-active' : '')
      );
      chip.type = 'button';
      var ic = document.createElement('i');
      ic.setAttribute('data-lucide', c.icon);
      chip.appendChild(ic);
      chip.appendChild(el('span', null, c.label));
      chip.addEventListener('click', function () {
        state.cat = c.id;
        renderChips();
        renderCards();
      });
      row.appendChild(chip);
    });
    refreshIcons();
  }

  // ---- Cards -----------------------------------------------------------
  function catMeta(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[0];
  }

  function renderCards() {
    var grid = $('lbGrid');
    grid.innerHTML = '';
    var list = ARTICLES.filter(function (a) {
      return state.cat === 'all' || a.cat === state.cat;
    });
    list.forEach(function (a) {
      var meta = catMeta(a.cat);
      var card = el('button', 'lb-card');
      card.type = 'button';

      var top = el('div', 'lb-card-top');
      var tag = el('span', 'lb-card-tag');
      var ti = document.createElement('i');
      ti.setAttribute('data-lucide', meta.icon);
      tag.appendChild(ti);
      tag.appendChild(el('span', null, meta.label));
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

  // ---- Reader ----------------------------------------------------------
  function openReader(a) {
    var meta = catMeta(a.cat);
    $('lbReadTag').textContent = meta.label;
    $('lbReadMin').textContent = a.minutes + ' min read';
    $('lbReadTitle').textContent = a.title;

    var body = $('lbReadBody');
    body.innerHTML = '';
    a.body.forEach(function (sec) {
      body.appendChild(el('h4', 'lb-sec-h', sec.h));
      body.appendChild(el('p', 'lb-sec-p', sec.p));
    });

    var wrap = $('lbReader');
    wrap.removeAttribute('hidden');
    // reset scroll to top
    var sc = wrap.querySelector('.lb-reader-scroll');
    if (sc) sc.scrollTop = 0;
    requestAnimationFrame(function () {
      wrap.classList.add('is-open');
    });
    refreshIcons();
  }
  function closeReader() {
    var wrap = $('lbReader');
    wrap.classList.remove('is-open');
    setTimeout(function () {
      wrap.setAttribute('hidden', '');
    }, 220);
  }

  // ---- Date chip -------------------------------------------------------
  function fillDateChip() {
    var d = new Date();
    var dd = $('dateDay'),
      mm = $('dateMonth');
    if (dd) dd.textContent = d.getDate();
    if (mm) mm.textContent = MONTHS[d.getMonth()];
  }

  // ---- Init ------------------------------------------------------------
  function init() {
    fillDateChip();
    renderChips();
    renderCards();
    var cb = $('lbReadClose');
    if (cb) cb.addEventListener('click', closeReader);
    var bd = $('lbReadBackdrop');
    if (bd) bd.addEventListener('click', closeReader);
    refreshIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
