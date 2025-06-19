
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('data/playlists.json');
    const playlists = await response.json();
    const container = document.getElementById('playlist-container');

    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <h2>${playlist.title}</h2>
            <p>${playlist.description}</p>
            <a href="${playlist.link}" target="_blank">Watch on YouTube</a>
        `;
        container.appendChild(card);
    });
});
