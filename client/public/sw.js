/*
 * Kill-switch service worker.
 *
 * A previous version of this site shipped a *cache-first* service worker
 * (also named sw.js) that stored the app shell and hashed bundles and then
 * served them from cache forever, never revalidating against the network. As a
 * result users — especially installed-PWA / mobile clients — kept being served
 * an outdated JavaScript bundle after new deploys, and even a page refresh did
 * not help (the stale shell was returned from cache). Desktop clients whose
 * cache had been cleared saw the current build, hence "works on desktop, broken
 * on mobile".
 *
 * The current application registers no service worker at all, so the only way to
 * reach those stuck clients is through the browser's automatic service-worker
 * update check, which fetches this script bypassing the old SW's cache. This
 * replacement therefore does the opposite of caching: on activation it deletes
 * every cache, unregisters itself, and reloads any open windows once, so the app
 * is loaded fresh from the network from then on. Nothing re-registers a service
 * worker afterwards, so this runs once per stuck client and then disappears.
 */
self.addEventListener("install", function () {
  // Take over immediately instead of waiting for all old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return caches.delete(key);
          }),
        );
      })
      .then(function () {
        return self.registration.unregister();
      })
      .then(function () {
        return self.clients.matchAll({ type: "window" });
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          // Reload each open window so it re-fetches the current app from the
          // network now that the stale cache and this worker are gone.
          client.navigate(client.url);
        });
      }),
  );
});
