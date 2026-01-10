// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIza...", // REPLACE THESE
    authDomain: "your-id.firebaseapp.com",
    projectId: "your-id",
    storageBucket: "your-id.appspot.com",
    messagingSenderId: "123...",
    appId: "1:123..."
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Initialized");
}

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 2. GLOBAL APP STATE
// ==========================================
let playlists = [];
let favorites = JSON.parse(localStorage.getItem('ll-favorites')) || [];
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM Loaded");
    
    // UI Elements
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');

    // --- A. DATA FETCHING ---
    const fetchPlaylists = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            console.log("✅ Playlists loaded:", playlists.length);
            filterAndRender();
        } catch (err) {
            console.error("❌ Failed to load playlists.json:", err);
        }
    };
    fetchPlaylists();

    // --- B. AUTHENTICATION LOGIC ---
    // Using explicit event listener to ensure it works
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log("🔘 Login button clicked...");
            auth.signInWithPopup(provider)
                .then((result) => console.log("✅ User signed in:", result.user.displayName))
                .catch((error) => {
                    console.error("❌ Sign-in error:", error.code, error.message);
                    alert("Authentication Error: " + error.message);
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => auth.signOut();
    }

    // Auth State Monitor
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("👤 User authenticated:", user.email);
            currentUser = user;
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL || '';

            // Sync from Cloud Firestore
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    favorites = doc.data().favorites || [];
                    completed = doc.data().completed || [];
                    console.log("✅ Progress synced from cloud");
                }
            } catch (err) {
                console.warn("⚠️ Firestore access denied. Check your Rules tab!");
            }
        } else {
            console.log("👤 User is signed out.");
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
        }
        filterAndRender();
    });

    // --- C. SYNC PROGRESS ---
    const syncData = async () => {
        if (!currentUser) {
            localStorage.setItem('ll-favorites', JSON.stringify(favorites));
            localStorage.setItem('ll-completed', JSON.stringify(completed));
            return;
        }
        try {
            await db.collection('users').doc(currentUser.uid).set({
                favorites: favorites,
                completed: completed
            });
            console.log("☁️ Data synced to Firestore");
        } catch (err) {
            console.error("❌ Sync failed:", err);
        }
    };

    // --- D. RENDERING ---
    function filterAndRender() {
        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool + p.description).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.playlistId) && matchesSearch;
            const matchesCat = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            return matchesCat && matchesSearch;
        });

        container.innerHTML = filtered.length > 0 ? '' : '<p id="no-results">No playlists found.</p>';

        filtered.forEach(p => {
            const isFav = favorites.includes(p.playlistId);
            const isDone = completed.includes(p.playlistId);
            const level = p.level || "Beginner";

            const card = document.createElement('div');
            card.className = `playlist-card ${isDone ? 'completed' : ''}`;
            card.innerHTML = `
                <button class="fav-btn ${isFav ? 'active' : ''}" data-action="favorite" data-pid="${p.playlistId}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-tag">${p.tool} <span class="badge ${level.toLowerCase()}">${level}</span></div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <button class="open-video-btn" data-action="play" data-pid="${p.playlistId}" data-title="${p.title}" data-link="${p.link}">
                    ▶ Watch Training
                </button>
                <button class="done-btn ${isDone ? 'active' : ''}" data-action="complete" data-pid="${p.playlistId}">
                    ${isDone ? '✓ Completed' : 'Mark as Done'}
                </button>
            `;
            container.appendChild(card);
        });

        const progCount = document.getElementById('progress-count');
        if (progCount) progCount.textContent = completed.length;
    }

    // --- E. GLOBAL CLICKS ---
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-pid]');
        if (!target) return;

        const id = target.dataset.pid;
        const action = target.dataset.action;

        if (action === 'favorite') {
            favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
            await syncData();
            filterAndRender();
        }

        if (action === 'complete') {
            completed = completed.includes(id) ? completed.filter(c => c !== id) : [...completed, id];
            await syncData();
            filterAndRender();
        }

        if (action === 'play') {
            const modal = document.getElementById('video-overlay');
            const player = document.getElementById('video-player');
            player.src = `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1`;
            document.getElementById('modal-title').textContent = target.dataset.title;
            document.getElementById('modal-link').href = target.dataset.link;
            modal.style.display = 'flex';
        }
    });

    // Close Modal
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            document.getElementById('video-overlay').style.display = 'none';
            document.getElementById('video-player').src = '';
        };
    }

    // Filters and Search
    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); filterAndRender(); };
    navItems.forEach(nav => {
        nav.onclick = (e) => {
            e.preventDefault();
            currentFilter = nav.dataset.filter;
            navItems.forEach(i => i.classList.remove('active'));
            nav.classList.add('active');
            filterAndRender();
        };
    });
});