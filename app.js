/* global exifr */
const photoInput = document.querySelector('#photo-input');
const dropZone = document.querySelector('#drop-zone');
const timeline = document.querySelector('#timeline');
const emptyState = document.querySelector('#empty-state');
const status = document.querySelector('#status');
const photoCount = document.querySelector('#photo-count');
const clearButton = document.querySelector('#clear-button');
const exportButton = document.querySelector('#export-button');
const dialog = document.querySelector('#photo-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogDate = document.querySelector('#dialog-date');
const dialogName = document.querySelector('#dialog-name');
let photos = [];

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long' });

function usableDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readPhoto(file) {
  let metadata = {};
  try { metadata = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude'] }) || {}; }
  catch (_) { /* Some formats do not expose readable EXIF; use the file date below. */ }
  const captured = usableDate(metadata.DateTimeOriginal) || usableDate(metadata.CreateDate) || usableDate(metadata.ModifyDate) || new Date(file.lastModified);
  return { id: crypto.randomUUID(), name: file.name, type: file.type, captured, source: metadata.DateTimeOriginal || metadata.CreateDate ? 'embedded metadata' : 'file date', url: URL.createObjectURL(file) };
}

async function addPhotos(files) {
  const imageFiles = [...files].filter(file => file.type.startsWith('image/') || /\.hei[cf]$/i.test(file.name));
  if (!imageFiles.length) { status.textContent = 'Choose image files to add them to the timeline.'; return; }
  status.textContent = `Reading dates from ${imageFiles.length} photo${imageFiles.length === 1 ? '' : 's'}…`;
  const newPhotos = await Promise.all(imageFiles.map(readPhoto));
  photos.push(...newPhotos);
  photos.sort((a, b) => a.captured - b.captured);
  render();
  status.textContent = `Added ${newPhotos.length} photo${newPhotos.length === 1 ? '' : 's'}. Dates come from EXIF when available, otherwise the file date.`;
}

function render() {
  timeline.replaceChildren();
  // A plain Map keeps this compatible with browsers that do not yet support Map.groupBy.
  const grouped = new Map();
  for (const photo of photos) {
    const key = `${photo.captured.getFullYear()}-${String(photo.captured.getMonth() + 1).padStart(2, '0')}`;
    grouped.set(key, [...(grouped.get(key) || []), photo]);
  }
  for (const [key, group] of grouped) {
    const [year, month] = key.split('-').map(Number);
    const section = document.createElement('section'); section.className = 'time-group';
    section.innerHTML = `<div class="time-label"><h2>${year}</h2><p>${monthFormat.format(new Date(year, month - 1, 1)).toUpperCase()}</p></div><div class="photo-grid"></div>`;
    const grid = section.querySelector('.photo-grid');
    group.forEach(photo => grid.append(photoCard(photo)));
    timeline.append(section);
  }
  emptyState.hidden = photos.length > 0;
  photoCount.textContent = `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'}`;
  clearButton.disabled = exportButton.disabled = !photos.length;
}

function photoCard(photo) {
  const button = document.createElement('button'); button.className = 'photo-card'; button.type = 'button';
  button.innerHTML = `<span class="photo-frame"><img src="${photo.url}" alt="${escapeHtml(photo.name)}" loading="lazy"></span><span class="photo-meta"><span class="photo-name">${escapeHtml(photo.name)}</span><time datetime="${photo.captured.toISOString()}">${dateFormat.format(photo.captured)}</time></span>`;
  button.addEventListener('click', () => { dialogImage.src = photo.url; dialogImage.alt = photo.name; dialogDate.textContent = `${dateFormat.format(photo.captured).toUpperCase()} · ${photo.source.toUpperCase()}`; dialogName.textContent = photo.name; dialog.showModal(); });
  return button;
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
dropZone.addEventListener('drop', event => { event.preventDefault(); dropZone.classList.remove('is-dragging'); addPhotos(event.dataTransfer.files); });
dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); photoInput.click(); } });
photoInput.addEventListener('change', event => { addPhotos(event.target.files); photoInput.value = ''; });
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
clearButton.addEventListener('click', () => { photos.forEach(photo => URL.revokeObjectURL(photo.url)); photos = []; render(); status.textContent = 'Timeline cleared. Nothing was uploaded or saved.'; });
exportButton.addEventListener('click', () => { const data = photos.map(({ id, url, ...photo }) => ({ ...photo, captured: photo.captured.toISOString() })); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'photo-timeline.json' }); link.click(); URL.revokeObjectURL(link.href); });
