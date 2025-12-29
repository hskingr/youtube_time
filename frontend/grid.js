// Grid View JavaScript for YouTube Time

// API Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')
  ? 'http://localhost:3000'
  : `${window.location.origin}/api`;

// State
let currentTime = '';
let cache = new Map(); // Cache fetched data by page/range
let isLoading = false;
let observer = null;
let lastEntry = null;
let hasUserScrolled = false;
let sentinel = null; // sentinel for infinite scroll
const debug = new URLSearchParams(window.location.search).get('debug');
let requestedTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  requestedTime = urlParams.get('time');

  currentTime = getCurrentTimeHHMM();
    if (debug === 'true') {
    currentTime = '23:45';
  }

  setupEventListeners();
  loadGridDensity();
  await fetchVideo();
  await loadInitialVideos();
  setupIntersectionObserver();
});

async function fetchVideo() {
  try {
    showLoading();

    // Get user's local time in HH:MM format
    const userTime = new Date().toTimeString().slice(0, 5);

    // Send user's time to the API
    const response = await fetch(`${API_BASE}/video?time=${encodeURIComponent(userTime)}`);


    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // showVideo(data.videoId, data.title);
  } catch (error) {
    console.error('Error fetching video:', error);
    showError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


function getCurrentTimeHHMM() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function setupEventListeners() {
  document.getElementById('jumpToNow').addEventListener('click', jumpToCurrentTime);
  document.getElementById('backToMain').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  document.getElementById('closeModal').addEventListener('click', closeModal);

  // Close modal on background click
  document.getElementById('videoModal').addEventListener('click', (e) => {
    if (e.target.id === 'videoModal') {
      closeModal();
    }
  });

  // Grid density controls
  document.getElementById('densityCompact').addEventListener('click', () => setGridDensity('compact'));
  document.getElementById('densityNormal').addEventListener('click', () => setGridDensity('normal'));
  document.getElementById('densityLarge').addEventListener('click', () => setGridDensity('large'));

  // Scroll to top button
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  window.onscroll = function() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
      scrollToTopBtn.style.display = "block";
    } else {
      scrollToTopBtn.style.display = "none";
    }
  };
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
}

async function loadInitialVideos() {
  const timeToLoad = requestedTime || currentTime;
  // Load videos around current time (±60 minutes)
  await loadVideosInRange(timeToLoad, 60, false); // don't append on first load

  // Wait for the DOM to update by checking for the target element, then scroll.
  const checkAndScroll = () => {
    const item = document.querySelector('[data-time="' + timeToLoad + '"]');
    if (item) {
      scrollToTime(timeToLoad);
    } else {
      requestAnimationFrame(checkAndScroll);
    }
  };
  requestAnimationFrame(checkAndScroll);
}

async function loadVideosInRange(centerTime, range, append = false) {
  const cacheKey = `${centerTime}-${range}-${append ? 'append' : 'replace'}`;

  if (cache.has(cacheKey)) {
    renderVideos(cache.get(cacheKey), append);
    return;
  }

  if (isLoading) return;
  isLoading = true;
  showLoading();

  try {
    const response = await fetch(`${API_BASE}/videos?time=${centerTime}&range=${range}`);
    if (!response.ok) throw new Error('Failed to fetch videos');

    const data = await response.json();
    cache.set(cacheKey, data.videos);
    renderVideos(data.videos, append);
    lastEntry = data.videos[data.videos.length - 1];
    console.log('Loaded videos for range:', centerTime, range, 'append:', append);
  } catch (error) {
    console.error('Error loading videos:', error);
    showError('Failed to load videos');
  } finally {
    isLoading = false;
    hideLoading();
  }
}

function renderVideos(videos, append = false) {
  const grid = document.getElementById('videoGrid');
  if (!append) {
    grid.innerHTML = '';
  }

  videos.forEach(video => {
    // if the video time already exists in the grid then remove it
    const existingItem = grid.querySelector(`[data-time="${video.time}"]`);
    if (existingItem) {
      existingItem.remove();
    }

    // Skip duplicates
    if (append && grid.querySelector(`[data-time="${video.time}"]`)) {
      return;
    }
    const item = createGridItem(video);
    grid.appendChild(item);
  });

  // Keep the sentinel at the bottom
  ensureSentinel();
}

function createGridItem(video) {
  const item = document.createElement('div');
  item.className = 'grid-item';
  item.dataset.time = video.time;

  if (video.time === currentTime) {
    item.classList.add('current');
  }

  if (video.cached && video.thumbnailUrl) {
    // Video exists with thumbnail
    // Add loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    item.appendChild(skeleton);

    const img = document.createElement('img');
    img.src = video.thumbnailUrl;
    img.alt = video.title;
    img.loading = 'lazy';

    img.onload = () => {
      skeleton.remove();
    };

    img.onerror = () => {
      // Fallback if thumbnail fails to load
      skeleton.remove();
      img.style.display = 'none';
      const noSignal = document.createElement('div');
      noSignal.className = 'no-signal';
      noSignal.textContent = '[NO SIGNAL]';
      item.appendChild(noSignal);
    };

    item.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'grid-item-overlay';
    overlay.textContent = video.time;
    item.appendChild(overlay);

    item.addEventListener('click', () => openVideo(video));
  } else {
    // Placeholder for missing video
    item.classList.add('placeholder');

    const noSignal = document.createElement('div');
    noSignal.className = 'no-signal';
    noSignal.innerHTML = `[NO SIGNAL]<br>${video.time}`;
    item.appendChild(noSignal);
  }

  return item;
}

function ensureSentinel() {
  const grid = document.getElementById('videoGrid');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'infinite-scroll-sentinel';
    sentinel.style.height = '1px';
  }
  // Move to bottom
  if (grid.lastElementChild !== sentinel) {
    grid.appendChild(sentinel);
  }
  if (observer) {
    observer.observe(sentinel);
  }
}

async function openVideo(video) {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalPlayer');
  const modalTitle = document.getElementById('modalTitle');
  const modalTime = document.getElementById('modalTime');
  const youtubeLink = document.getElementById('youtubeLink');

  player.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
  modalTitle.textContent = video.title;
  modalTime.textContent = video.time;
  youtubeLink.href = `https://www.youtube.com/watch?v=${video.videoId}`;

  modal.classList.add('active');

  // Update URL
  const url = new URL(window.location);
  url.searchParams.set('time', video.time);
  window.history.pushState({}, '', url);
}

function closeModal() {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalPlayer');

  player.src = '';
  modal.classList.remove('active');

  // Clear URL param
  const url = new URL(window.location);
  url.searchParams.delete('time');
  window.history.pushState({}, '', url);
}

function jumpToCurrentTime() {
  currentTime = getCurrentTimeHHMM();

  scrollToTime(currentTime);

  // Reload videos around current time if not in cache
  loadVideosInRange(currentTime, 60);
}

function scrollToTime(time) {
  console.log('Scrolling to time:', time);
  console.log(`document.querySelector(\`[data-time="${time}"]\`)`)
  const item = document.querySelector(`[data-time="${time}"]`);
  if (item) {
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Highlight briefly
    item.style.boxShadow = '0 0 30px #ff0000';
    setTimeout(() => {
      if (!item.classList.contains('current')) {
        item.style.boxShadow = '';
      }
    }, 2000);
  }
}

document.addEventListener('scroll', () => {
  console.log('User scrolled');
  hasUserScrolled = true;
});

function setupIntersectionObserver() {
  // Lazy load more content as user scrolls
  const options = {
    root: null,
    rootMargin: '400px', // prefetch sooner
    threshold: 0
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(async entry => {
      // Trigger only on the sentinel
      if (entry.isIntersecting && entry.target.id === 'infinite-scroll-sentinel') {
        if (isLoading) return;
        console.log('Sentinel intersected. Loading more...');
        const nextCenter = addMinutesToHHMM(lastEntry?.time || currentTime, 60);
        await loadVideosInRange(nextCenter, 60, true); // append new items
        hasUserScrolled = false;
      }
    });
  }, options);

  // Ensure sentinel exists and is observed
  ensureSentinel();

  // Observe grid items as they're added (optional, keeps existing behavior)
  const grid = document.getElementById('videoGrid');
  const observerCallback = (mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.classList && node.classList.contains('grid-item')) {
          observer.observe(node);
        }
      });
    });
  };

  const mutationObserver = new MutationObserver(observerCallback);
  mutationObserver.observe(grid, { childList: true });
}

// Add a small helper to step forward in time
function addMinutesToHHMM(hhmm, minutesToAdd) {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function showLoading() {
  document.getElementById('loadingMore').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingMore').classList.add('hidden');
}

function showError(message) {
  alert(`ERROR: ${message}`);
}

function setGridDensity(density) {
  const grid = document.getElementById('videoGrid');
  const sizes = {
    compact: '150px',
    normal: '200px',
    large: '300px'
  };

  grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${sizes[density]}, 1fr))`;

  // Update button states
  document.querySelectorAll('.density-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`density${density.charAt(0).toUpperCase() + density.slice(1)}`).classList.add('active');

  // Save preference
  localStorage.setItem('gridDensity', density);
}

// Load saved grid density on init
function loadGridDensity() {
  const saved = localStorage.getItem('gridDensity') || 'normal';
  setGridDensity(saved);
}


// Request backend to invalidate cache and find new video
async function refetchVideoForTime(time) {
  try {
    showLoading();
    const response = await fetch(`${API_BASE}/video?time=${encodeURIComponent(time)}&refresh=true`);

    if (!response.ok) {
      throw new Error('Failed to fetch alternative video');
    }

    const data = await response.json();

    // Update grid with new video
    const gridItem = document.querySelector(`[data-time="${time}"]`);
    if (gridItem) {
      const newItem = createGridItem({ ...data, time });
      gridItem.replaceWith(newItem);
    }

    alert(`Found new video for ${time}: "${data.title}"`);
  } catch (error) {
    console.error('Error refetching video:', error);
    showError('Could not find alternative video');
  } finally {
    hideLoading();
  }
}