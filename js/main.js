document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('data/playlists.json');
    const playlists = await response.json();
    
    const container = document.getElementById('playlist-container');
    const menuContainer = document.getElementById('category-menu');
    const searchInput = document.getElementById('search-input');

    let currentCategory = 'All';
    let searchTerm = '';

    // 1. Setup Menu
    const categories = ['All', ...new Set(playlists.map(item => item.category))];
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = cat === 'All' ? 'menu-btn active' : 'menu-btn';
        btn.textContent = cat;
        btn.onclick = () => {
            currentCategory = cat;
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAndRender();
        };
        menuContainer.appendChild(btn);
    });

    // 2. Search Logic
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterAndRender();
    });

    // 3. Combined Filter Engine
    function filterAndRender() {
        const filtered = playlists.filter(p => {
            const matchesCategory = (currentCategory === 'All' || p.category === currentCategory);
            const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                                  p.description.toLowerCase().includes(searchTerm) ||
                                  p.tool.toLowerCase().includes(searchTerm);
            
            return matchesCategory && matchesSearch;
        });

        renderPlaylists(filtered);
    }

    // 4. Visual Render
    function renderPlaylists(items) {
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = `<div id="no-results"><h3>No matching playlists found. Try a different search!</h3></div>`;
            return;
        }

        items.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            // Staggered animation delay
            card.style.animationDelay = `${index * 0.05}s`; 
            
            card.innerHTML = `
                <div class="card-tag">${p.tool}</div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <a href="${p.link}" target="_blank" class="watch-link">▶ Watch Playlist</a>
            `;
            container.appendChild(card);
        });
    }

    // Modal Elements
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-player');
    const modalTitle = document.getElementById('modal-title');
    const modalLink = document.getElementById('modal-link');
    const closeBtn = document.querySelector('.close-modal');

    // 1. Updated Render Function (Changed the button behavior)
    function renderPlaylists(items) {
        container.innerHTML = '';
        
        items.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            card.innerHTML = `
                <div class="card-tag">${p.tool}</div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <button class="open-video-btn" data-id="${p.playlistId}" data-title="${p.title}" data-link="${p.link}">
                    ▶ Watch Lessons
                </button>
            `;
            container.appendChild(card);
        });
    }

    // 2. Click Event for Opening Modal
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('open-video-btn')) {
            const pId = e.target.getAttribute('data-id');
            const pTitle = e.target.getAttribute('data-title');
            const pLink = e.target.getAttribute('data-link');

            // Set the iframe source to YouTube embed URL
            player.src = `https://www.youtube.com/embed/videoseries?list=${pId}&autoplay=1`;
            modalTitle.textContent = pTitle;
            modalLink.href = pLink;
            
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Stop scrolling behind modal
        }
    });

    // 3. Close Modal Logic
    closeBtn.onclick = () => {
        overlay.style.display = 'none';
        player.src = ''; // Stop video when closing
        document.body.style.overflow = 'auto'; // Re-enable scroll
    };

    // Close on clicking outside the content box
    window.onclick = (e) => {
        if (e.target == overlay) {
            closeBtn.onclick();
        }
    };

    filterAndRender(); // Initial load
});