document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('data/playlists.json');
    const playlists = await response.json();
    
    const container = document.getElementById('playlist-container');
    const menuContainer = document.getElementById('category-menu');

    // 1. Get unique categories from your JSON
    // We add "All" at the beginning
    const categories = ['All', ...new Set(playlists.map(item => item.category))];

    // 2. Generate Menu Buttons Dynamically
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = category === 'All' ? 'menu-btn active' : 'menu-btn';
        btn.textContent = category;
        btn.addEventListener('click', () => filterCategory(category, btn));
        menuContainer.appendChild(btn);
    });

    // 3. Filter Logic
    function filterCategory(category, activeBtn) {
        // Toggle Active Class on buttons
        document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');

        // Filter Playlists
        const filtered = category === 'All' 
            ? playlists 
            : playlists.filter(p => p.category === category);

        renderPlaylists(filtered);
    }

    // 4. Render Function
    function renderPlaylists(items) {
        container.innerHTML = ''; // Clear current
        
        items.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${playlist.tool}</div>
                <h2>${playlist.title}</h2>
                <p>${playlist.description}</p>
                <a href="${playlist.link}" target="_blank" class="watch-link">Watch on YouTube</a>
            `;
            container.appendChild(card);
        });
    }

    // Initial load
    renderPlaylists(playlists);
});