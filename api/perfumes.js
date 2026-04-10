const { buildPerfumes } = require('./_lib/sheets');
const { getImages } = require('./_lib/blobImages');

// Simple in-memory cache (per serverless instance, ~5min)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const now = Date.now();
    if (!cache || now - cacheTime > CACHE_TTL) {
      const customImages = await getImages();
      cache = await buildPerfumes(customImages);
      cacheTime = now;
    }
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json(cache);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Nie udało się pobrać danych z arkusza.' });
  }
};
