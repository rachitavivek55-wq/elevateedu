// ElevateEdu Service Worker — network-first so updates appear instantly
const CACHE = 'elevateedu-v3';
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
  var url = new URL(req.url);
  // Only handle same-origin; let Supabase/Stripe/fonts go straight to network.
  if(url.origin !== self.location.origin){ return; }
  // NETWORK-FIRST: always try the live network so code updates show immediately.
  // Fall back to cache only when offline.
  e.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){ return m || caches.match('./index.html'); });
    })
  );
});
