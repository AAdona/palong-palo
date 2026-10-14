/* Usage: npm run set-url https://your-domain.com
   Replaces the placeholder site URL in index.html, robots.txt and sitemap.xml. */
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = 'https://palong-palo.vercel.app';
const target = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/\s]+$/.test(target)) {
  console.error('Pass your site URL, for example: npm run set-url https://my-doubles.vercel.app');
  process.exit(1);
}

for (const file of ['index.html', 'robots.txt', 'sitemap.xml']) {
  const p = path.join(__dirname, '..', file);
  const next = fs.readFileSync(p, 'utf8').split(PLACEHOLDER).join(target);
  fs.writeFileSync(p, next);
  console.log('updated', file);
}
console.log('Remember: run this once, then commit. The placeholder is gone after the first run.');
