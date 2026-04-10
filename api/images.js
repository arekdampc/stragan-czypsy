const { getImages } = require('./_lib/blobImages');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const images = await getImages();
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
