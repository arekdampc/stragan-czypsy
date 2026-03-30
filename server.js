const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const app = express();
const PORT = 3001;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const IMAGES_FILE = path.join(__dirname, 'images.json');
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Dw9bd9LFtzoIv8FtK9BnQndlG00u9S5JdBHNZxk5AFo/export?format=csv&gid=0';
const SHEET_XLSX_URL = 'https://docs.google.com/spreadsheets/d/1Dw9bd9LFtzoIv8FtK9BnQndlG00u9S5JdBHNZxk5AFo/export?format=xlsx&gid=0';

// Cache for Fragrantica links: { [LP_id]: fragranticaUrl }
let fragranticaLinksCache = null;
let fragranticaLinksCacheTime = 0;

// Cache
let csvCache = null;
let csvCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(IMAGES_FILE)) fs.writeFileSync(IMAGES_FILE, JSON.stringify({}));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer config
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `perfume_${req.params.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Tylko pliki graficzne są dozwolone'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

function parseType(fragrantica) {
  const f = (fragrantica || '').toLowerCase();
  if (f.includes('dla kobiet i mężczyzn') || f.includes('unisex')) return 'unisex';
  if (f.includes('dla kobiet')) return 'damskie';
  if (f.includes('dla mężczyzn')) return 'męskie';
  return 'unisex';
}

function parseAvailableMl(raw) {
  if (!raw || raw.trim() === '?') return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseBrandAndName(nazwa) {
  const idx = nazwa.indexOf(' - ');
  if (idx !== -1) {
    return { brand: nazwa.slice(0, idx).trim(), name: nazwa.slice(idx + 3).trim() };
  }
  // Try to split on first space for "Brand Name" format
  const parts = nazwa.trim().split(' ');
  return { brand: parts[0], name: parts.slice(1).join(' ') || nazwa };
}

async function fetchPerfumes() {
  const now = Date.now();
  if (csvCache && now - csvCacheTime < CACHE_TTL) return csvCache;

  const res = await fetch(SHEET_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Google Sheets fetch failed: ${res.status}`);
  const text = await res.text();

  // The sheet has a few intro rows before the actual LP header row
  const lines = text.split('\n');
  const headerIdx = lines.findIndex(l => l.startsWith('LP,'));
  if (headerIdx === -1) throw new Error('Nie znaleziono nagłówka LP w arkuszu');
  const csvData = lines.slice(headerIdx).join('\n');

  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const images = JSON.parse(fs.readFileSync(IMAGES_FILE));

  const perfumes = records
    .filter(r => r.LP && r.Nazwa)
    .map(r => {
      const { brand, name } = parseBrandAndName(r['Nazwa'] || '');
      const availableMl = parseAvailableMl(r['ml do odlania / waga bez korka']);
      const pricePerMl = parseFloat(r['Cena ml']) || 0;
      const type = parseType(r['Fragrantica']);
      const id = String(r['LP']).trim();

      return {
        id,
        fullName: r['Nazwa'],
        brand,
        name,
        type,
        pricePerMl,
        availableMl,
        fullBottlePrice: r['Cena za cały flakon'] || null,
        fragrantica: r['Fragrantica'] || '',
        image: images[id] || null
      };
    });

  csvCache = perfumes;
  csvCacheTime = now;
  return perfumes;
}

// Fetch Fragrantica hyperlinks from XLSX export
async function fetchFragranticaLinks() {
  const now = Date.now();
  if (fragranticaLinksCache && now - fragranticaLinksCacheTime < CACHE_TTL) return fragranticaLinksCache;

  const res = await fetch(SHEET_XLSX_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`XLSX fetch failed: ${res.status}`);
  const buf = await res.buffer();
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Find the header row (LP column)
  let lpCol = null, rowOffset = 0;
  for (const addr in ws) {
    const cell = ws[addr];
    if (cell && cell.v === 'LP') {
      lpCol = addr.replace(/[0-9]/g, '');
      rowOffset = parseInt(addr.replace(/[A-Z]/g, ''), 10);
      break;
    }
  }

  const links = {};
  if (!lpCol) return links;

  // Map each row: LP value → Fragrantica URL
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let row = rowOffset; row <= range.e.r + 1; row++) {
    const lpCell = ws[`${lpCol}${row}`];
    if (!lpCell || !lpCell.v) continue;
    const id = String(lpCell.v).trim();

    // Fragrantica link is in column E (5th column)
    const eCell = ws[`E${row}`];
    if (eCell && eCell.l && eCell.l.Target) {
      links[id] = eCell.l.Target;
    }
  }

  fragranticaLinksCache = links;
  fragranticaLinksCacheTime = now;
  return links;
}

// Extract numeric Fragrantica ID from URL: .../Name-920.html → 920
function extractFragranticaId(url) {
  const m = url.match(/-(\d+)\.html$/);
  return m ? m[1] : null;
}

// Download image from URL, save to uploads/, return local path
async function downloadImage(imageUrl, perfumeId) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' }
  });
  if (!res.ok) throw new Error(`Image download failed: ${res.status} for ${imageUrl}`);

  const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const filename = `perfume_${perfumeId}_fragrantica.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  const buffer = await res.buffer();
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
}

// GET /api/perfumes
app.get('/api/perfumes', async (req, res) => {
  try {
    const perfumes = await fetchPerfumes();
    res.json(perfumes);
  } catch (err) {
    console.error('Error fetching perfumes:', err);
    res.status(500).json({ error: 'Nie udało się pobrać danych z arkusza.' });
  }
});

// POST /api/perfumes/:id/image
app.post('/api/perfumes/:id/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });

  const images = JSON.parse(fs.readFileSync(IMAGES_FILE));

  // Remove old image file if exists
  if (images[req.params.id]) {
    const oldFile = path.join(UPLOADS_DIR, path.basename(images[req.params.id]));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  images[req.params.id] = imageUrl;
  fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));

  // Invalidate cache
  csvCache = null;

  res.json({ imageUrl });
});

// DELETE /api/perfumes/:id/image
app.delete('/api/perfumes/:id/image', (req, res) => {
  const images = JSON.parse(fs.readFileSync(IMAGES_FILE));

  if (images[req.params.id]) {
    const oldFile = path.join(UPLOADS_DIR, path.basename(images[req.params.id]));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    delete images[req.params.id];
    fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
    csvCache = null;
  }

  res.json({ ok: true });
});

// GET /api/images
app.get('/api/images', (req, res) => {
  const images = JSON.parse(fs.readFileSync(IMAGES_FILE));
  res.json(images);
});

// GET /api/fragrantica-links — returns { id: url } map
app.get('/api/fragrantica-links', async (req, res) => {
  try {
    const links = await fetchFragranticaLinks();
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/perfumes/:id/fetch-image — fetch image for single perfume from Fragrantica
app.post('/api/perfumes/:id/fetch-image', async (req, res) => {
  try {
    const links = await fetchFragranticaLinks();
    const url = links[req.params.id];
    if (!url) return res.status(404).json({ error: 'Brak linku Fragrantica dla tej perfumy' });

    const fragId = extractFragranticaId(url);
    if (!fragId) return res.status(400).json({ error: 'Nie udało się wyciągnąć ID z URL Fragrantica' });

    const imageUrl = `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragId}.jpg`;
    const localPath = await downloadImage(imageUrl, req.params.id);

    const images = JSON.parse(fs.readFileSync(IMAGES_FILE));
    // Remove old image file if it was manually uploaded
    if (images[req.params.id] && images[req.params.id] !== localPath) {
      const oldFile = path.join(UPLOADS_DIR, path.basename(images[req.params.id]));
      if (fs.existsSync(oldFile)) try { fs.unlinkSync(oldFile); } catch {}
    }
    images[req.params.id] = localPath;
    fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
    csvCache = null;

    res.json({ imageUrl: localPath, source: imageUrl });
  } catch (err) {
    console.error('fetch-image error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fetch-all-images — fetch images for all perfumes that don't have one yet
app.post('/api/fetch-all-images', async (req, res) => {
  const { force = false } = req.body;

  try {
    const [perfumes, links] = await Promise.all([fetchPerfumes(), fetchFragranticaLinks()]);
    const images = JSON.parse(fs.readFileSync(IMAGES_FILE));

    const results = [];

    for (const p of perfumes) {
      if (!force && images[p.id]) {
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

      try {
        const imageUrl = `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragId}.jpg`;
        const localPath = await downloadImage(imageUrl, p.id);
        if (images[p.id] && images[p.id] !== localPath) {
          const oldFile = path.join(UPLOADS_DIR, path.basename(images[p.id]));
          if (fs.existsSync(oldFile)) try { fs.unlinkSync(oldFile); } catch {}
        }
        images[p.id] = localPath;
        results.push({ id: p.id, name: p.fullName, status: 'ok', imageUrl: localPath });
      } catch (err) {
        results.push({ id: p.id, name: p.fullName, status: 'error', reason: err.message });
      }

      // Small delay to be polite to the server
      await new Promise(r => setTimeout(r, 150));
    }

    fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
    csvCache = null;

    const ok = results.filter(r => r.status === 'ok').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    res.json({ ok, skipped, errors, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
