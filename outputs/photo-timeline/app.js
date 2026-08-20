const config = window.PHOTO_TIMELINE_CONFIG || {};
const timeline = document.querySelector('#timeline');
const timelineScroll = document.querySelector('#timeline-scroll');
const photoArchive = document.querySelector('#photo-archive');
const emptyState = document.querySelector('#empty-state');
const dateRange = document.querySelector('#date-range');
const dialog = document.querySelector('#photo-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogDate = document.querySelector('#dialog-date');
const dialogName = document.querySelector('#dialog-name');
const dialogCaption = document.querySelector('#dialog-caption');
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fullDate = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const monthDate = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' });

document.title = config.title || 'Photo Timeline';
document.querySelector('#site-title').textContent = config.title || 'PHOTO TIMELINE';
document.querySelector('#intro-copy').textContent = config.description || 'Photos in this archive are served directly from the repository and organized by their capture metadata.';

function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function displayRange(photos) {
  const dated = photos.filter(photo => photo.capturedDate);
  if (!dated.length) return photos.length ? 'UNDATED ARCHIVE' : 'ADD PHOTOS TO BEGIN';
  const first = fromDateKey(dated[0].capturedDate);
  const last = fromDateKey(dated.at(-1).capturedDate);
  const sameYear = first.getFullYear() === last.getFullYear();
  const firstLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' }).format(first);
  const lastLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(last);
  return first.getTime() === last.getTime() ? lastLabel.toUpperCase() : `${firstLabel} — ${lastLabel}`.toUpperCase();
}

function imageElement(photo) {
  const image = new Image();
  image.src = photo.src;
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  return image;
}

function showPhoto(photo) {
  dialogImage.src = photo.src;
  dialogImage.alt = photo.filename;
  const date = photo.capturedDate ? fullDate.format(fromDateKey(photo.capturedDate)) : 'No capture date available';
  dialogDate.textContent = `${date} · ${photo.dateSource}`;
  dialogName.textContent = photo.filename;
  dialogCaption.textContent = photo.description || '';
  dialogCaption.hidden = !photo.description;
  dialog.showModal();
}

function renderTimeline(photos) {
  timeline.replaceChildren();
  const dated = photos.filter(photo => photo.capturedDate);
  const dayGroups = groupBy(dated, photo => photo.capturedDate);
  for (const [dateKey, dayPhotos] of dayGroups) {
    const day = document.createElement('section');
    day.className = 'day';
    const date = fromDateKey(dateKey);
    day.innerHTML = `<p class="day-count">${dayPhotos.length} ${dayPhotos.length === 1 ? 'photo' : 'photos'}</p><div class="day-strip"></div><time class="day-date" datetime="${dateKey}">${shortDate.format(date)}</time>`;
    const strip = day.querySelector('.day-strip');
    for (const photo of dayPhotos) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-photo';
      button.title = `${photo.filename} — ${fullDate.format(date)}`;
      const image = imageElement(photo);
      image.addEventListener('error', () => button.classList.add('has-error'), { once: true });
      button.append(image);
      button.addEventListener('click', () => showPhoto(photo));
      strip.append(button);
    }
    timeline.append(day);
  }
  requestAnimationFrame(() => { timelineScroll.scrollLeft = Math.max(0, timeline.scrollWidth - timelineScroll.clientWidth); });
}

function archiveHeading(key) {
  if (key === 'undated') return 'Undated';
  return monthDate.format(fromDateKey(`${key}-01`));
}

function renderArchive(photos) {
  photoArchive.replaceChildren();
  const monthGroups = groupBy(photos, photo => photo.capturedDate ? photo.capturedDate.slice(0, 7) : 'undated');
  for (const [monthKey, monthPhotos] of monthGroups) {
    const group = document.createElement('section');
    group.className = 'archive-month';
    const heading = document.createElement('h2');
    heading.className = 'month-heading';
    heading.innerHTML = `${archiveHeading(monthKey)}<span>${monthPhotos.length} ${monthPhotos.length === 1 ? 'PHOTO' : 'PHOTOS'}</span>`;
    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    for (const photo of monthPhotos) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'photo-card';
      const frame = document.createElement('span');
      frame.className = 'photo-frame';
      const image = imageElement(photo);
      image.alt = photo.filename;
      image.addEventListener('error', () => { frame.classList.add('image-missing'); image.remove(); }, { once: true });
      frame.append(image);
      const meta = document.createElement('span');
      meta.className = 'photo-meta';
      meta.innerHTML = `<span class="photo-name">${escapeHtml(photo.filename)}</span><time class="photo-date"${photo.capturedDate ? ` datetime="${photo.capturedDate}"` : ''}>${photo.capturedDate ? shortDate.format(fromDateKey(photo.capturedDate)) : 'NO DATE'}</time>`;
      card.append(frame, meta);
      card.addEventListener('click', () => showPhoto(photo));
      grid.append(card);
    }
    group.append(heading, grid);
    photoArchive.append(group);
  }
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

async function initialise() {
  try {
    const response = await fetch('data/timeline.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load data/timeline.json (${response.status})`);
    const data = await response.json();
    const photos = (data.photos || [])
      .filter(photo => photo.src && (!photo.capturedDate || /^\d{4}-\d{2}-\d{2}$/.test(photo.capturedDate)))
      .sort((a, b) => (a.capturedDate || '9999-12-31').localeCompare(b.capturedDate || '9999-12-31') || a.filename.localeCompare(b.filename));
    dateRange.textContent = displayRange(photos);
    emptyState.hidden = photos.length > 0;
    if (photos.length) {
      renderTimeline(photos);
      renderArchive(photos);
    }
  } catch (error) {
    console.error(error);
    dateRange.textContent = 'BUILD DATA TO BEGIN';
    emptyState.hidden = false;
    emptyState.querySelector('p:last-child').innerHTML = 'The timeline data is missing. Run <code>npm run build</code> from the repository, then publish the generated site.';
  }
}

document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
initialise();
