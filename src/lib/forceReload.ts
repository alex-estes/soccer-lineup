// A varying query param guarantees a cache miss both in the browser and at
// GitHub Pages' CDN edge (which ignores `cache: 'no-store'` — that only
// affects browser-side request semantics), forcing a real fetch of
// index.html so it picks up the new build's hashed asset filenames.
export function forceReload() {
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString());
  window.location.replace(url.toString());
}
