import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const photosDirectory = resolve(root, 'photos');
const outputDirectory = resolve(root, 'dist', 'data');
const overridesPath = resolve(root, 'timeline-overrides.json');
const imageExtensions = new Set(['.avif', '.gif', '.heic', '.heif', '.jpeg', '.jpg', '.png', '.webp']);

async function recursivelyFindImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const location = resolve(directory, entry.name);
    if (entry.isDirectory()) return recursivelyFindImages(location);
    return imageExtensions.has(extname(entry.name).toLowerCase()) ? [location] : [];
  }));
  return files.flat();
}

async function loadOverrides() {
  try {
    const raw = await readFile(overridesPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('must be an object');
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Could not read timeline-overrides.json: ${error.message}`);
  }
}

function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : null;
}

function dateKeyFromExif(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{4})[:-](\d{2})[:-](\d{2})/);
    return match ? validDateKey(`${match[1]}-${match[2]}-${match[3]}`) : null;
  }
  return null;
}

function dateKeyFromFilename(filename) {
  const match = filename.match(/(?:^|[^0-9])(\d{4})[-_.](\d{2})[-_.](\d{2})(?:[^0-9]|$)/);
  return match ? validDateKey(`${match[1]}-${match[2]}-${match[3]}`) : null;
}

function publicPath(relativePath) {
  return `photos/${relativePath.split(/[/\\]/).map(encodeURIComponent).join('/')}`;
}

function normalizeOverride(value) {
  if (typeof value === 'string') return { date: value };
  return value && typeof value === 'object' ? value : {};
}

async function recordFor(file, overrides) {
  const relativePath = relative(photosDirectory, file).replaceAll('\\', '/');
  const override = normalizeOverride(overrides[relativePath]);
  let metadata = {};
  try {
    metadata = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ImageDescription']) || {};
  } catch (error) {
    console.warn(`Could not read metadata for ${relativePath}: ${error.message}`);
  }

  const exifCaptureDate = dateKeyFromExif(metadata.DateTimeOriginal);
  const exifCreateDate = dateKeyFromExif(metadata.CreateDate);
  const overrideDate = validDateKey(override.date);
  const filenameDate = dateKeyFromFilename(basename(relativePath));
  const capturedDate = exifCaptureDate || exifCreateDate || overrideDate || filenameDate;
  const dateSource = exifCaptureDate ? 'EXIF capture date'
    : exifCreateDate ? 'EXIF creation date'
      : overrideDate ? 'manual override'
        : filenameDate ? 'filename date'
          : 'undated';

  return {
    id: createHash('sha256').update(relativePath).digest('hex').slice(0, 12),
    filename: basename(relativePath),
    src: publicPath(relativePath),
    capturedDate: capturedDate || null,
    dateSource,
    description: typeof override.caption === 'string' ? override.caption : (typeof metadata.ImageDescription === 'string' ? metadata.ImageDescription.trim() : '')
  };
}

const overrides = await loadOverrides();
const files = await recursivelyFindImages(photosDirectory);
const photos = await Promise.all(files.map(file => recordFor(file, overrides)));
photos.sort((a, b) => (a.capturedDate || '9999-12-31').localeCompare(b.capturedDate || '9999-12-31') || a.filename.localeCompare(b.filename));
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'timeline.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), photos }, null, 2)}\n`);

const undated = photos.filter(photo => !photo.capturedDate).length;
const unsupported = photos.filter(photo => /\.hei[cf]$/i.test(photo.src)).length;
console.log(`Generated data for ${photos.length} photo${photos.length === 1 ? '' : 's'}${undated ? ` (${undated} undated)` : ''}.`);
if (unsupported) console.warn(`${unsupported} HEIC/HEIF file${unsupported === 1 ? ' is' : 's are'} included; convert them to JPEG or WebP for reliable browser display.`);
