const windowLocationOrigin = typeof window !== 'undefined' && window.location.origin

let API_URL = 'http://localhost:3000';

const debug = new URLSearchParams(window.location.search).get('debug');

if (windowLocationOrigin.includes('localhost') || windowLocationOrigin.includes('127.0.0.1')) {
  // Development environment
  API_URL = 'http://localhost:3000';
} else {
  // Production environment
  API_URL = `${windowLocationOrigin}/api`;
}

function updateCurrentTime() {
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);
  document.getElementById('currentTime').textContent = timeStr;
  return timeStr;
}

function hideAll() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('videoContainer').classList.add('hidden');
  document.getElementById('noVideo').classList.add('hidden');
}

function showLoading() {
  hideAll();
  document.getElementById('loading').classList.remove('hidden');
}

function showError(message) {
  hideAll();
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function extractTimeFromTitle(title) {
  // Matches HH:MM, HH:MM น., HH:MM AM/PM, etc.
  const timeMatch = title.match(/(\d{1,2}):(\d{2})(?:\s*(?:น\.|AM|PM|am|pm))?/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  return null;
}

function showVideo(videoId, title) {
  hideAll();
  const iframe = document.getElementById('videoPlayer');
  iframe.src = `https://www.youtube.com/embed/${videoId}`;

  const extractedTime = extractTimeFromTitle(title);
  const displayText = extractedTime
    ? `⏰ ${extractedTime} - ${title}`
    : title;

  document.getElementById('videoTitle').textContent = displayText;

    document.getElementById('currentTime').textContent = displayText;


  document.getElementById('videoContainer').classList.remove('hidden');
}

function showNoVideo() {
  hideAll();
  document.getElementById('noVideo').classList.remove('hidden');
}

async function fetchVideo() {
  try {
    showLoading();

    if (debug === 'true') {
      // In debug mode, show a fixed video
      showVideo('dQw4w9WgXcQ', 'Debug Mode Video');
      return;
    }

    // Get user's local time in HH:MM format
    const userTime = new Date().toTimeString().slice(0, 5);

    // Send user's time to the API
    const response = await fetch(`${API_URL}/video?time=${encodeURIComponent(userTime)}`);

    if (response.status === 404) {
      showNoVideo();
      return;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    showVideo(data.videoId, data.title);
  } catch (error) {
    console.error('Error fetching video:', error);
    showError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {

  fetchVideo();
});

