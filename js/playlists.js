fetch('/data/playlists.json')
  .then(response => response.json())
  .then(playlists => {
    const container = document.getElementById('playlist-container');

    playlists.forEach((playlist, index) => {
      const div = document.createElement('div');
      div.className = 'bg-white p-4 rounded shadow hover:shadow-md transition';

      div.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">${playlist.title}</h3>
        <p class="text-sm text-gray-600 mb-3">${playlist.description}</p>
        <ul class="space-y-2">
          ${playlist.videos.slice(0, 5).map(video => `
            <li class="cursor-pointer text-blue-600 hover:underline" data-title="${video.title}" data-id="${video.videoId}">
              🎬 ${video.title}
            </li>
          `).join('')}
        </ul>
        <button class="mt-3 text-sm text-blue-500 hover:underline" onclick="openPlaylist('${playlist.playlistId}')">View Full Playlist</button>
      `;

      container.appendChild(div);
    });

    // Event delegation for opening video modal
    container.addEventListener('click', e => {
      if (e.target.tagName === 'LI' && e.target.dataset.id) {
        const title = e.target.dataset.title;
        const id = e.target.dataset.id;
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-iframe').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
        document.getElementById('video-modal').classList.remove('hidden');
      }
    });
  });

// Close modal
document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('video-modal').classList.add('hidden');
  document.getElementById('modal-iframe').src = '';
});

function openPlaylist(playlistId) {
  window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
}
