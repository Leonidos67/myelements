import template from './assets/tt-stat/index.html?raw';
import css from './assets/tt-stat/style.css?raw';
export function buildStatPreview(code) {
  // Restrict network activity and isolate the uploaded script from the cabinet.
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  return template
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*href=["']style\.css["'][^>]*>/gi, '')
    .replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="' + policy + '">')
    .replace('</head>', () => '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style></head>')
    .replace('</body>', () => '<script>' + code.replace(/<\/script/gi, '<\\/script') + '</script></body>');
}
