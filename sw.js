// ElevateEdu Service Worker — network-first so updates appear instantly
const CACHE = 'elevateedu-v2';
const CORE = [
  './',
  './index.html',
  './planner.html',
  './pricing.html',
  './privacy.html',
  './styles.css',
  './script.js'
];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
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
