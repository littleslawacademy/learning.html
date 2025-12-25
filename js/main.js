// 1. FIREBASE CONFIGURATION
// Replace the values below with your specific config from the Firebase Console
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. GLOBAL APP STATE
let playlists = [];
let favorites = JSON.parse(localStorage.getItem('ll-favorites')) || [];
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', async () => {
    // 3. UI ELEMENTS
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');
    
    // A. FETCH PLAYLIST DATA
    try {
        const response = await fetch('data/playlists.json');
        playlists = await response.json();
    } catch (error) {
        console.error("Error loading JSON:", error);
    }

    // B. AUTHENTICATION HANDLERS
    loginBtn.onclick = () => auth.signInWithPopup(provider);
    logoutBtn.onclick = () => auth.signOut();

    // LISTEN FOR LOGIN CHANGES
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;
            
            // Sync progress from Cloud to App
            await fetchFromFirestore();
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
            // Use LocalStorage if guest
            favorites = JSON.parse(localStorage.getItem('ll-favorites')) || [];
            completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
        }
        filterAndRender();
    });

    // C. CLOUD SYNC FUNCTIONS
    async function saveToFirestore() {
        if (!currentUser) {
            // Save to local storage for guest users
            localStorage.setItem('ll-favorites', JSON.stringify(favorites));
            localStorage.setItem('ll-completed', JSON.stringify(completed));
            return;
        }
        // Save to Cloud for logged in users
        try {
            await db.collection('users').doc(currentUser.uid).set({
                favorites: favorites,
                completed: completed
            });
        } catch (e) { console.error("Cloud Save Failed:", e); }
    }

    async function fetchFromFirestore() {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            favorites = doc.data().favorites || [];
            completed = doc.data().completed || [];
        }
    }

    // D. SEARCH & NAVBAR LOGIC
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterAndRender();
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') === '#') e.preventDefault();
            currentFilter = item.getAttribute('data-filter');
            
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            const parent = item.closest('.dropdown')?.querySelector('.nav-item');
            if (parent) parent.classList.add('active'); else item.classList.add('active');

            filterAndRender();
        });
    });

    // E. FILTERING & RENDERING
    function filterAndRender() {
        const filtered = playlists.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                                  p.tool.toLowerCase().includes(searchTerm);
            
            if (currentFilter === 'Favorites') return favorites.includes(p.playlistId) && matchesSearch;
            
            const matchesFilter = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            return matchesFilter && matchesSearch;
        });
        renderCards(filtered);
    }

    function renderCards(items) {
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = `<div id="no-results"><h3>No training sessions found for this selection.</h3></div>`;
            return;
        }

        items.forEach((p) => {
            const isFav = favorites.includes(p.playlistId);
            const isDone = completed.includes(p.playlistId);
            
            const card = document.createElement('div');
            card.className = `playlist-card ${isDone ? 'completed' : ''}`;
            
            // Clean logic for the badge level (defaults to Beginner)
            const level = p.level ? p.level : 'Beginner';

            card.innerHTML = `
                <button class="fav-btn ${isFav ? 'active' : ''}" data-type="favorite" data-id="${p.playlistId}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-tag">
                    ${p.tool} <span class="badge ${level.toLowerCase()}">${level}</span>
                </div>
                <h2>${p.title}</h2>
                <p>${p.description}</p>
                <button class="open-video-btn" data-pid="${p.playlistId}" data-title="${p.title}" data-link="${p.link}">
                    ▶ Watch Lessons
                </button>
                <button class="done-btn ${isDone ? 'active' : ''}" data-type="done" data-id="${p.playlistId}">
                    ${isDone ? '✓ Completed' : 'Mark as Finished'}
                </button>
            `;
            container.appendChild(card);
        });
        document.getElementById('progress-count').textContent = completed.length;
    }

    // F. MAIN INTERACTION HANDLER (Using delegation for high efficiency)
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-player');
    const modalTitle = document.getElementById('modal-title');
    const modalLink = document.getElementById('modal-link');
    const closeBtn = document.querySelector('.close-modal');

    container.addEventListener('click', async (e) => {
        // Toggle Favorite
        const favBtn = e.target.closest('[data-type="favorite"]');
        if (favBtn) {
            const id = favBtn.dataset.id;
            favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
            await saveToFirestore();
            filterAndRender();
            return;
        }

        // Toggle Mark Done
        const doneBtn = e.target.closest('[data-type="done"]');
        if (doneBtn) {
            const id = doneBtn.dataset.id;
            completed = completed.includes(id) ? completed.filter(c => c !== id) : [...completed, id];
            await saveToFirestore();
            filterAndRender();
            return;
        }

        // Open Modal
        const watchBtn = e.target.closest('.open-video-btn');
        if (watchBtn) {
            const id = watchBtn.dataset.pid;
            const title = watchBtn.dataset.title;
            const link = watchBtn.dataset.link;
            
            // Check JSON 'type' to see if it is a single video or playlist series
            const item = playlists.find(p => p.playlistId === id);
            if (item && item.type === 'video') {
                player.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
            } else {
                player.src = `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1`;
            }

            modalTitle.textContent = title;
            modalLink.href = link;
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    });

    // Close Modal Logic
    const closeModal = () => {
        overlay.style.display = 'none';
        player.src = '';
        document.body.style.overflow = 'auto';
    };

    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });

    // Initial Render
    filterAndRender();
});