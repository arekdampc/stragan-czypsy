const { fetchFragranticaLinks } = require('./_lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const links = await fetchFragranticaLinks();
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
