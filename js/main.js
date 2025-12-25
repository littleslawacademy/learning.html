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
            const matchesFilter = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                                  p.description.toLowerCase().includes(searchTerm) ||
                                  p.tool.toLowerCase().includes(searchTerm);
            
            return matchesFilter && matchesSearch;
        });

        renderPlaylists(filtered);
    }

    // 5. RENDERING THE CARDS
    function renderPlaylists(items) {
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = `<div id="no-results"><h3>No matches found for "${searchTerm}" in ${currentFilter}.</h3></div>`;
            return;
        }

        items.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.style.animationDelay = `${index * 0.05}s`; // Staggered appearance
            
            card.innerHTML = `
                <div class="card-tag">${p.tool}</div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <button class="open-video-btn" 
                        data-id="${p.playlistId}" 
                        data-title="${p.title}" 
                        data-link="${p.link}">
                    ▶ Watch Lessons
                </button>
            `;
            container.appendChild(card);
        });
    }

    // 6. VIDEO MODAL (POPUP) INTERACTION
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-player');
    const modalTitle = document.getElementById('modal-title');
    const modalLink = document.getElementById('modal-link');
    const closeBtn = document.querySelector('.close-modal');

    // Use event delegation for buttons inside cards
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.open-video-btn');
        if (btn) {
            const pId = btn.getAttribute('data-id');
            const pTitle = btn.getAttribute('data-title');
            const pLink = btn.getAttribute('data-link');

            // Setup Iframe (Youtube Playlist Mode)
            player.src = `https://www.youtube.com/embed/videoseries?list=${pId}&autoplay=1`;
            modalTitle.textContent = pTitle;
            modalLink.href = pLink;
            
            // Show Overlay
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Stop page scrolling
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