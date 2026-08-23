// ElevateEdu Service Worker — network-first so updates appear instantly
const CACHE = 'elevateedu-v4';
// Full app shell, so every tool works offline from the moment it is installed.
const CORE = [
  './',
  './index.html',
  './planner.html',
  './calendar.html',
  './assignments.html',
  './checklists.html',
  './gradebook.html',
  './balance.html',
  './bodystats.html',
  './visionboard.html',
  './focus.html',
  './mindset.html',
  './wellness.html',
  './wallet.html',
  './guides.html',
  './privacy.html',
  './styles.css',
  './calendar.css',
  './assignments.css',
  './checklists.css',
  './gradebook.css',
  './balance.css',
  './bodystats.css',
  './visionboard.css',
  './focus.css',
  './script.js',
  './calendar.js',
  './assignments.js',
  './checklists.js',
  './gradebook.js',
  './balance.js',
  './bodystats.js',
  './visionboard.js',
  './focus.js',
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
