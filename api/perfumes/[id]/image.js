module.exports.config = { api: { bodyParser: false } };

const { put, del } = require('@vercel/blob');
const { buildPerfumes } = require('../../_lib/sheets');
const { getImages, saveImages } = require('../../_lib/blobImages');

// Vercel doesn't support multipart out of the box in serverless — use formidable
const formidable = require('formidable');
const fs = require('fs');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const [perfumes, images] = await Promise.all([buildPerfumes(), getImages()]);
      const perfume = perfumes.find(p => p.id === id);
      const key = perfume ? perfume.fullName : id;

      if (images[key]) {
        // If it's a Vercel Blob URL, delete it
        if (images[key].includes('vercel-storage.com')) {
          try { await del(images[key]); } catch {}
        }
        delete images[key];
        await saveImages(images);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const form = formidable({ maxFileSize: 5 * 1024 * 1024 });
      const [, files] = await form.parse(req);
      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) return res.status(400).json({ error: 'Brak pliku' });

      const [perfumes, images] = await Promise.all([buildPerfumes(), getImages()]);
      const perfume = perfumes.find(p => p.id === id);
      const key = perfume ? perfume.fullName : id;

      const buffer = fs.readFileSync(file.filepath);
      const ext = file.originalFilename?.split('.').pop() || 'jpg';
      const { url } = await put(`perfume_${id}_custom.${ext}`, buffer, {
        access: 'public',
        addRandomSuffix: true,
      });

      // Delete old blob if it was a custom upload
      if (images[key] && images[key].includes('vercel-storage.com')) {
        try { await del(images[key]); } catch {}
      }

      images[key] = url;
      await saveImages(images);

      res.json({ imageUrl: url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).end();
};
