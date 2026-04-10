const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Dw9bd9LFtzoIv8FtK9BnQndlG00u9S5JdBHNZxk5AFo/export?format=csv&gid=0';
const SHEET_XLSX_URL = 'https://docs.google.com/spreadsheets/d/1Dw9bd9LFtzoIv8FtK9BnQndlG00u9S5JdBHNZxk5AFo/export?format=xlsx&gid=0';

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
  if (idx !== -1) return { brand: nazwa.slice(0, idx).trim(), name: nazwa.slice(idx + 3).trim() };
  const parts = nazwa.trim().split(' ');
  return { brand: parts[0], name: parts.slice(1).join(' ') || nazwa };
}

function extractFragranticaId(url) {
  const m = url.match(/-(\d+)\.html$/);
  return m ? m[1] : null;
}

async function fetchPerfumesFromSheet() {
  const res = await fetch(SHEET_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Google Sheets fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  const headerIdx = lines.findIndex(l => l.startsWith('LP,'));
  if (headerIdx === -1) throw new Error('Nie znaleziono nagłówka LP w arkuszu');
  const csvData = lines.slice(headerIdx).join('\n');
  return parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
}

async function fetchFragranticaLinks() {
  const res = await fetch(SHEET_XLSX_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`XLSX fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];

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

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let row = rowOffset; row <= range.e.r + 1; row++) {
    const lpCell = ws[`${lpCol}${row}`];
    if (!lpCell || !lpCell.v) continue;
    const id = String(lpCell.v).trim();
    const eCell = ws[`E${row}`];
    if (eCell && eCell.l && eCell.l.Target) links[id] = eCell.l.Target;
  }
  return links;
}

async function buildPerfumes(customImages = {}) {
  const [records, links] = await Promise.all([
    fetchPerfumesFromSheet(),
    fetchFragranticaLinks(),
  ]);

  return records
    .filter(r => r.LP && r.Nazwa)
    .map(r => {
      const { brand, name } = parseBrandAndName(r['Nazwa'] || '');
      const id = String(r['LP']).trim();
      const fullName = r['Nazwa'];
      const fragUrl = links[id];
      const fragId = fragUrl ? extractFragranticaId(fragUrl) : null;
      const fragImage = fragId ? `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragId}.jpg` : null;

      return {
        id,
        fullName,
        brand,
        name,
        type: parseType(r['Fragrantica']),
        pricePerMl: parseFloat(r['Cena ml']) || 0,
        availableMl: parseAvailableMl(r['ml do odlania / waga bez korka']),
        fullBottlePrice: r['Cena za cały flakon'] || null,
        fragrantica: r['Fragrantica'] || '',
        image: customImages[fullName] || fragImage || null,
      };
    });
}

module.exports = { buildPerfumes, fetchFragranticaLinks };
