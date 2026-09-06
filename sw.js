// ElevateEdu Service Worker — network-first so updates appear instantly
const CACHE = 'elevateedu-v23';
// Full app shell, so every tool works offline from the moment it is installed.
const CORE = [
  './',
  './assignments.html',
  './balance.html',
  './bodystats.html',
  './calendar.html',
  './checklists.html',
  './gradebook.html',
  './index.html',
  './mealplanner.html',
  './meditation.html',
  './minddump.html',
  './mindset.html',
  './notes.html',
  './planner.html',
  './privacy.html',
  './progress.html',
  './terms.html',
  './visionboard.html',
  './wallet.html',
  './wellness.html',
  './wishlist.html',
  './workout.html',
  './assignments.css',
  './balance.css',
  './bodystats.css',
  './calendar.css',
  './checklists.css',
  './focus.css',
  './gradebook.css',
  './lookbest.css',
  './mealplanner.css',
  './meditation.css',
  './minddump.css',
  './notes.css',
  './progress.css',
  './social.css',
  './styles.css',
  './visionboard.css',
  './wishlist.css',
  './workout.css',
  './assignments.js',
  './balance.js',
  './bodystats.js',
  './calendar.js',
  './checklists.js',
  './focus.js',
  './gbscores.js',
  './gradebook.js',
  './lookbest.js',
  './mealplanner.js',
  './meditation.js',
  './minddump.js',
  './notes.js',
  './progress.js',
  './script.js',
  './social.js',
  './visionboard.js',
  './wishlist.js',
  './workout.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    // Cache each file individually: with addAll() a single missing file would
    // reject the whole batch and leave nothing precached.
    return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET'){ return; }
  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  // Only handle same-origin; let Supabase/Stripe/fonts go straight to network.
  if(url.origin !== self.location.origin){ return; }
  // Never intercept sign-in redirects. They carry one-time tokens that must
  // reach the page untouched, and must never be written to disk.
  if(url.search && /token|code|access|refresh|type/i.test(url.search)){ return; }
  // NETWORK-FIRST: always try the live network so code updates show instantly.
  e.respondWith(
    fetch(req).then(function(res){
      // Only store real, complete, successful pages. Without this guard an
      // error page (a 404, or a 503 while the host is down) overwrites the
      // good copy and then keeps getting served back as if it were the app.
      var storable = res && res.status === 200 && res.ok && !url.search &&
        (res.type === 'basic' || res.type === 'default');
      if(storable){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
      }
      return res;
    }).catch(function(){
      // Offline: fall back to whatever was precached.
      return caches.match(req).then(function(m){
        return m || caches.match('./index.html');
      }).then(function(m){
        return m || new Response('ElevateEdu is offline right now.',
          { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
