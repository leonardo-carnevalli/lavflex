// Monta a pasta public/ para a Vercel (site estático; api/ vira função sozinha).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'public');
const SITE = process.env.SITE_URL || 'https://lavflex.vetoragencia.com.br';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
['index.html', 'painel.html', 'conta.html', 'seed.js', 'img', 'og.png'].forEach((rel) => {
  const from = path.join(ROOT, rel);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(OUT, rel), { recursive: true });
});

const ld = {
  '@context': 'https://schema.org', '@type': 'DryCleaningOrLaundry', name: 'Lav-Flex Lavanderia', url: SITE + '/',
  image: SITE + '/og.png', telephone: '+55-14-99885-2752', sameAs: ['https://www.instagram.com/lavflexmarilia/'],
  address: { '@type': 'PostalAddress', streetAddress: 'Av. Santo Antônio, 3220', addressLocality: 'Marília', addressRegion: 'SP', postalCode: '17507-050', addressCountry: 'BR' },
  geo: { '@type': 'GeoCoordinates', latitude: -22.196382, longitude: -49.9614483 },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '07:30', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '07:00', closes: '13:00' }
  ]
};
const tags = `<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${SITE}/">
<meta property="og:title" content="Lav-Flex Lavanderia, Marília">
<meta property="og:description" content="Lavanderia de roupas finas com Wet Cleaning em Marília. Veja os preços e acompanhe sua roupa pelo código.">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>`;
const idx = path.join(OUT, 'index.html');
if (fs.existsSync(idx)) fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('</head>', tags));
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /painel\nDisallow: /conta\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url></urlset>\n`);
console.log('public/ pronto');
