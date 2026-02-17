// YouTube Sandbox - plain iframe embed (no remote YouTube IFrame API script)
// Uses postMessage to communicate with the YouTube embed via enablejsapi=1

let youtubeIframe = null;
let currentVideoId = null;

function createPlayer(videoId) {
  currentVideoId = videoId;

  // Remove existing iframe
  const container = document.getElementById('player');
  container.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.id = 'yt-iframe';
  iframe.width = '640';
  iframe.height = '360';
  iframe.allow = 'autoplay; encrypted-media';
  iframe.setAttribute('allowfullscreen', '');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;

  iframe.addEventListener('load', () => {
    console.log('[Tempo Sandbox] Player ready, video:', videoId);
    window.parent.postMessage({ type: 'yt-playing', videoId: videoId }, '*');
    // Nudge autoplay
    setTimeout(() => postCommand('playVideo'), 200);
  });

  iframe.addEventListener('error', () => {
    console.error('[Tempo Sandbox] Player error');
    window.parent.postMessage({ type: 'yt-error', error: 'iframe_load_failed' }, '*');
  });

  container.appendChild(iframe);
  youtubeIframe = iframe;
}

// Send commands to YouTube embed via postMessage (enablejsapi=1 protocol)
function postCommand(func, args) {
  if (!youtubeIframe || !youtubeIframe.contentWindow) return;
  youtubeIframe.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: func,
    args: args || []
  }), '*');
}

// Listen for commands from parent (offscreen document)
window.addEventListener('message', function(event) {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'yt-play':
      createPlayer(data.videoId);
      break;

    case 'yt-stop':
      if (youtubeIframe) {
        youtubeIframe.remove();
        youtubeIframe = null;
      }
      currentVideoId = null;
      document.getElementById('player').innerHTML = '';
      window.parent.postMessage({ type: 'yt-stopped' }, '*');
      break;

    case 'yt-status':
      window.parent.postMessage({
        type: 'yt-status-response',
        isPlaying: !!youtubeIframe && !!currentVideoId,
        videoId: currentVideoId
      }, '*');
      break;

    case 'yt-volume':
      if (youtubeIframe) {
        postCommand('setVolume', [data.volume]);
      }
      break;
  }
});

// Signal readiness (no API to wait for)
window.parent.postMessage({ type: 'yt-api-ready' }, '*');
console.log('[Tempo Sandbox] YouTube sandbox loaded');
