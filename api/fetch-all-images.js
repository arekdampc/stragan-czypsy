const { buildPerfumes, fetchFragranticaLinks } = require('./_lib/sheets');
const { getImages, saveImages } = require('./_lib/blobImages');

function extractFragranticaId(url) {
  const m = url.match(/-(\d+)\.html$/);
  return m ? m[1] : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { force = false } = req.body || {};

  try {
    const [perfumes, links, images] = await Promise.all([
      buildPerfumes(),
      fetchFragranticaLinks(),
      getImages(),
    ]);

    const results = [];

    for (const p of perfumes) {
      if (!force && images[p.fullName]) {
        results.push({ id: p.id, name: p.fullName, status: 'skipped', reason: 'już ma zdjęcie' });
        continue;
      }
      const url = links[p.id];
      if (!url) {
        results.push({ id: p.id, name: p.fullName, status: 'skipped', reason: 'brak linku' });
        continue;
      }
      const fragId = extractFragranticaId(url);
      if (!fragId) {
        results.push({ id: p.id, name: p.fullName, status: 'error', reason: 'nie można wyciągnąć ID' });
        continue;
      }
      // Store CDN URL directly — no download needed
      images[p.fullName] = `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragId}.jpg`;
      results.push({ id: p.id, name: p.fullName, status: 'ok' });
    }

    await saveImages(images);

    res.json({
      ok: results.filter(r => r.status === 'ok').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
