const { put, list, del } = require('@vercel/blob');

const BLOB_KEY = 'images.json';

async function getImages() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return {};
    const res = await fetch(blobs[0].url + `?t=${Date.now()}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function saveImages(images) {
  // Delete existing blob first
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    for (const blob of blobs) await del(blob.url);
  } catch {}

  await put(BLOB_KEY, JSON.stringify(images, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

module.exports = { getImages, saveImages };
