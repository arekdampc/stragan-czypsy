const { fetchFragranticaLinks, buildPerfumes } = require('../../_lib/sheets');
const { getImages, saveImages } = require('../../_lib/blobImages');

function extractFragranticaId(url) {
  const m = url.match(/-(\d+)\.html$/);
  return m ? m[1] : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id } = req.query;

  try {
    const [links, perfumes, images] = await Promise.all([
      fetchFragranticaLinks(),
      buildPerfumes(),
      getImages(),
    ]);

    const perfume = perfumes.find(p => p.id === id);
    if (!perfume) return res.status(404).json({ error: 'Perfuma nie znaleziona' });

    const url = links[id];
    if (!url) return res.status(404).json({ error: 'Brak linku Fragrantica dla tej perfumy' });

    const fragId = extractFragranticaId(url);
    if (!fragId) return res.status(400).json({ error: 'Nie udało się wyciągnąć ID z URL Fragrantica' });

    const imageUrl = `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragId}.jpg`;
    images[perfume.fullName] = imageUrl;
    await saveImages(images);

    res.json({ imageUrl, source: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
