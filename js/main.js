let favorites = JSON.parse(localStorage.getItem('ll-favorites')) || [];
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];

function updateStats() {
    document.getElementById('progress-count').textContent = completed.length;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. DATA INITIALIZATION
    let playlists = [];
    try {
        const response = await fetch('data/playlists.json');
        playlists = await response.json();
    } catch (error) {
        console.error("Error loading playlists:", error);
    }

    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const navItems = document.querySelectorAll('[data-filter]');
    
    // Global state
    let currentFilter = 'All';
    let searchTerm = '';

    // 2. SEARCH LOGIC
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterAndRender();
    });

    // 3. DROPDOWN / NAVBAR FILTERING LOGIC
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Only prevent default if it's a filter link (href="#")
            if (item.getAttribute('href') === '#') {
                e.preventDefault();
            }

            currentFilter = item.getAttribute('data-filter');

            // Update Active UI state
            document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
            // If it's a dropdown item, highlight the parent "Performance Testing" or "DevOps" link
            const parentNavLink = item.closest('.dropdown')?.querySelector('.nav-item');
            if (parentNavLink) {
                parentNavLink.classList.add('active');
            } else {
                item.classList.add('active');
            }

            filterAndRender();

            // Smooth scroll to top of content when filtering
            window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
        });
    });

    // 4. THE FILTER ENGINE (Combines Search + Category)
function filterAndRender() {
    const filtered = playlists.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                              p.tool.toLowerCase().includes(searchTerm);
        
        // New logic for favorites filter
        if (currentFilter === 'Favorites') {
            return favorites.includes(p.playlistId) && matchesSearch;
        }

        const matchesFilter = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
        return matchesFilter && matchesSearch;
    });

    renderPlaylists(filtered);
}

    // 5. RENDERING THE CARDS
function renderPlaylists(items) {
    container.innerHTML = '';
    
    items.forEach((p) => {
        const isFav = favorites.includes(p.playlistId);
        const isDone = completed.includes(p.playlistId); // NEW check

        const card = document.createElement('div');
        card.className = `playlist-card ${isDone ? 'completed' : ''}`;
        
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" data-fav-id="${p.playlistId}">
                ${isFav ? '❤️' : '🤍'}
            </button>
            <div class="card-tag">
                ${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span>
            </div>
            <h2>${p.title}</h2>
            <p>${p.description}</p>
            <button class="open-video-btn" data-id="${p.playlistId}" data-title="${p.title}">
                ▶ Watch Lessons
            </button>
            <button class="done-btn ${isDone ? 'active' : ''}" data-done-id="${p.playlistId}">
                ${isDone ? '✓ Completed' : 'Mark as Done'}
            </button>
        `;
        container.appendChild(card);
    });
    updateStats(); // Refresh count on top bar
}

    // 6. VIDEO MODAL (POPUP) INTERACTION
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-player');
    const modalTitle = document.getElementById('modal-title');
    const modalLink = document.getElementById('modal-link');
    const closeBtn = document.querySelector('.close-modal');

    // Use event delegation for buttons inside cards
container.addEventListener('click', (e) => {
    // 1. Logic for Favorite (existing) ...

    // 2. Logic for Completed (NEW)
    const doneBtn = e.target.closest('.done-btn');
    if (doneBtn) {
        const id = doneBtn.getAttribute('data-done-id');
        if (completed.includes(id)) {
            completed = completed.filter(c => c !== id);
        } else {
            completed.push(id);
        }
        localStorage.setItem('ll-completed', JSON.stringify(completed));
        renderPlaylists(playlists.filter(p => /* handle your current active filter */ true));
        // Simple trick: Just re-trigger current filter
        filterAndRender(); 
    }
});

    // Close Modal Function
    const closeModal = () => {
        overlay.style.display = 'none';
        player.src = ''; // Clear video source to stop playback
        document.body.style.overflow = 'auto'; // Re-enable scroll
    };

    closeBtn.onclick = closeModal;
    
    // Close on background click
    window.onclick = (e) => {
        if (e.target == overlay) closeModal();
    };

    // ESC Key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeModal();
    });

    // Initial Launch
    filterAndRender();
});