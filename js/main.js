// ==========================================
// 1. FIREBASE CONFIGURATION (Copy from Firebase Console)
// ==========================================
// Make sure this DOES NOT say 'import' anywhere
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAIM7NkLymWvPOFfGJlUI3ZyGKIgAhVFuI",
  authDomain: "littleslawacademy-f45e7.firebaseapp.com",
  projectId: "littleslawacademy-f45e7",
  storageBucket: "littleslawacademy-f45e7.firebasestorage.app",
  messagingSenderId: "393189119362",
  appId: "1:393189119362:web:659d157ab482c4a660ab9b",
  measurementId: "G-S40XF238WM"
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Variables using the firebase global object
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let playlists = [];
let favorites = JSON.parse(localStorage.getItem('ll-favorites')) || [];
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');

    // --- A. LOAD DATA ---
    const loadPlaylists = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            filterAndRender();
        } catch (err) {
            console.error("Error loading JSON:", err);
        }
    };
    loadPlaylists();

    // --- B. AUTHENTICATION ---
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            auth.signInWithPopup(provider).catch(err => {
        console.error("🔥 Error Code:", err.code); 
        console.error("🔥 Error Message:", err.message);
        alert("Firebase Auth says: " + err.message);
            });
        });
    }

    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL || '';

            // Pull user's specific favorites/completed from Cloud
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    favorites = doc.data().favorites || [];
                    completed = doc.data().completed || [];
                }
            } catch (err) { console.warn("Firestore Rules prevent cloud fetch:", err); }
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
        }
        filterAndRender();
    });

    // --- C. SYNC ---
    const sync = async () => {
        if (!currentUser) {
            localStorage.setItem('ll-favorites', JSON.stringify(favorites));
            localStorage.setItem('ll-completed', JSON.stringify(completed));
            return;
        }
        try {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        } catch (err) { console.error("Cloud Save Fail:", err); }
    };

    // --- D. RENDERING ---
    function filterAndRender() {
        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.playlistId) && matchesSearch;
            const matchesCat = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            return matchesCat && matchesSearch;
        });

        container.innerHTML = filtered.length ? '' : '<p id="no-results">No matches found.</p>';

        filtered.forEach(p => {
            const isFav = favorites.includes(p.playlistId);
            const isDone = completed.includes(p.playlistId);
            const card = document.createElement('div');
            card.className = `playlist-card ${isDone ? 'completed' : ''}`;
            card.innerHTML = `
                <button class="fav-btn ${isFav ? 'active' : ''}" data-action="fav" data-id="${p.playlistId}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span></div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <button class="open-video-btn" data-action="watch" data-id="${p.playlistId}" data-title="${p.title}" data-link="${p.link}">
                    ▶ Watch Lessons
                </button>
                <button class="done-btn ${isDone ? 'active' : ''}" data-action="done" data-id="${p.playlistId}">
                    ${isDone ? '✓ Completed' : 'Mark as Done'}
                </button>
            `;
            container.appendChild(card);
        });
        const stat = document.getElementById('progress-count');
        if (stat) stat.textContent = completed.length;
    }

    // --- E. EVENT DELEGATION ---
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === 'fav') {
            favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
            await sync();
            filterAndRender();
        } else if (action === 'done') {
            completed = completed.includes(id) ? completed.filter(c => c !== id) : [...completed, id];
            await sync();
            filterAndRender();
        } else if (action === 'watch') {
            const overlay = document.getElementById('video-overlay');
            const player = document.getElementById('video-player');
            player.src = `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1`;
            document.getElementById('modal-title').textContent = btn.dataset.title;
            document.getElementById('modal-link').href = btn.dataset.link;
            overlay.style.display = 'flex';
        }
    });

    // Close Modal Logic
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
    };

    // Nav and Search logic
    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); filterAndRender(); };
    navItems.forEach(n => {
        n.onclick = (e) => {
            e.preventDefault();
            currentFilter = n.dataset.filter;
            navItems.forEach(item => item.classList.remove('active'));
            n.classList.add('active');
            filterAndRender();
        }
    });
});