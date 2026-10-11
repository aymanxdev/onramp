// Theme before first paint. Only three keys ever touch storage: theme, sound, intake-mode.
// A static file, not inline, because the CSP forbids inline scripts.
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
