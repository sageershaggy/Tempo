// YouTube IFrame API - loaded in sandbox context
let player = null;
let currentVideoId = null;

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(tag);

function onYouTubeIframeAPIReady() {
  console.log('[Tempo Sandbox] YouTube IFrame API ready');
  window.parent.postMessage({ type: 'yt-api-ready' }, '*');
}

function createPlayer(videoId) {
  currentVideoId = videoId;
  if (player) {
    try { player.destroy(); } catch (e) {}
    player = null;
  }
  document.getElementById('player').innerHTML = '';

  player = new YT.Player('player', {
    width: '640',
    height: '360',
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      loop: 1,
      playlist: videoId,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: function(event) {
        console.log('[Tempo Sandbox] Player ready, playing video');
        event.target.playVideo();
        window.parent.postMessage({ type: 'yt-playing', videoId: videoId }, '*');
      },
      onStateChange: function(event) {
        if (event.data === 0) {
          event.target.seekTo(0);
          event.target.playVideo();
        }
        window.parent.postMessage({ type: 'yt-state', state: event.data, videoId: currentVideoId }, '*');
      },
      onError: function(event) {
        console.error('[Tempo Sandbox] Player error:', event.data);
        window.parent.postMessage({ type: 'yt-error', error: event.data }, '*');
      }
    }
  });
}

// Listen for commands from parent (offscreen document)
window.addEventListener('message', function(event) {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'yt-play':
      if (typeof YT !== 'undefined' && YT.Player) {
        createPlayer(data.videoId);
      } else {
        currentVideoId = data.videoId;
        const check = setInterval(() => {
          if (typeof YT !== 'undefined' && YT.Player) {
            clearInterval(check);
            createPlayer(data.videoId);
          }
        }, 200);
        setTimeout(() => clearInterval(check), 10000);
      }
      break;

    case 'yt-stop':
      if (player) {
        try { player.destroy(); } catch (e) {}
        player = null;
      }
      currentVideoId = null;
      document.getElementById('player').innerHTML = '';
      window.parent.postMessage({ type: 'yt-stopped' }, '*');
      break;

    case 'yt-status':
      window.parent.postMessage({
        type: 'yt-status-response',
        isPlaying: !!player && !!currentVideoId,
        videoId: currentVideoId
      }, '*');
      break;

    case 'yt-volume':
      if (player && player.setVolume) {
        player.setVolume(data.volume);
      }
      break;
  }
});

console.log('[Tempo Sandbox] YouTube sandbox loaded');
