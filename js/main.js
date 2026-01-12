
// --- CALCULATE PROGRESS ---
function getCourseStats(course) {
    const total = course.videos.length;
    // We store progress in completed array as "courseId_videoId"
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
}

// --- RENDER BOOTCAMP CARDS ---
function renderCards(items) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    
    if (!currentUser) { /* Show login lock screen */ return; }

    items.forEach(p => {
        const stats = getCourseStats(p);
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <div class="card-tag">${p.tool}</div>
            <h2>${p.title}</h2>
            <div class="card-progress">
                <div class="progress-fill" style="width: ${stats.percent}%"></div>
            </div>
            <small>${stats.percent}% (${stats.done}/${stats.total} lessons)</small>
            <p>${p.description}</p>
            <button class="open-lms-btn" data-id="${p.courseId}">▶ Open Academy Dashboard</button>
        `;
        container.appendChild(card);
    });
}

// --- OPEN THE LMS DASHBOARD ---
function openLMS(courseId) {
    const course = playlists.find(p => p.courseId === courseId);
    const curriculumList = document.getElementById('curriculum-list');
    curriculumList.innerHTML = '';

    course.videos.forEach(vid => {
        const globalId = `${courseId}_${vid.id}`;
        const isWatched = completed.includes(globalId);
        
        const li = document.createElement('li');
        li.className = 'lesson-item';
        li.innerHTML = `
            <input type="checkbox" ${isWatched ? 'checked' : ''} data-gid="${globalId}">
            <span class="lesson-title" data-vid="${vid.id}">${vid.title}</span>
        `;
        
        // Switch Video logic
        li.querySelector('.lesson-title').onclick = () => {
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vid.id}?autoplay=1`;
            document.getElementById('current-lesson-title').textContent = vid.title;
            document.querySelectorAll('.lesson-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
        };
        
        curriculumList.appendChild(li);
    });

    const stats = getCourseStats(course);
    document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
    document.getElementById('modal-progress-text').textContent = stats.percent + '% Complete';
    document.getElementById('video-overlay').style.display = 'flex';
}

// --- CLICK HANDLER FOR CHECKBOXES & BUTTONS ---
document.addEventListener('click', async (e) => {
    // 1. Open Dashboard
    if (e.target.classList.contains('open-lms-btn')) {
        openLMS(e.target.dataset.id);
    }

    // 2. Mark specific lesson as done
    if (e.target.type === 'checkbox' && e.target.dataset.gid) {
        const gid = e.target.dataset.gid;
        if (e.target.checked) {
            completed.push(gid);
        } else {
            completed = completed.filter(id => id !== gid);
        }
        
        // Sync to Firebase
        await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        
        // Update Modal Progress
        const courseId = gid.split('_')[0];
        const course = playlists.find(p => p.courseId === courseId);
        const stats = getCourseStats(course);
        document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
        document.getElementById('modal-progress-text').textContent = stats.percent + '% Complete';
        
        // Update Home Screen Cards
        renderCards(playlists);
    }

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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// Global App State
let playlists = [];
let favorites = [];
let completed = [];
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
    const statsBar = document.querySelector('.stats-bar');

    // --- A. LOAD DATA (But don't display yet) ---
    const loadData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            // We call filterAndRender here just to be safe, 
            // but the logic inside will prevent guest viewing.
            filterAndRender();
        } catch (err) { console.error("JSON Data failed:", err); }
    };
    loadData();

    // --- B. AUTHENTICATION & LOCKING LOGIC ---
    loginBtn.addEventListener('click', () => auth.signInWithPopup(provider));
    logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("🔓 User logged in:", user.displayName);
            currentUser = user;
            
            // UI Setup for Logged In
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;
            if (statsBar) statsBar.style.display = 'block';

            // Sync User Data from Cloud
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                favorites = doc.data().favorites || [];
                completed = doc.data().completed || [];
            }
        } else {
            console.log("🔒 Access Restricted: User logged out");
            currentUser = null;
            
            // UI Setup for Logged Out
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
            if (statsBar) statsBar.style.display = 'none';
            
            // Clear lists for privacy
            favorites = [];
            completed = [];
        }
        // Every time Auth status changes, re-evaluate what they see
        filterAndRender();
    });

    // --- C. SYNC ENGINE ---
    const sync = async () => {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        } catch (err) { console.error("Save failed:", err); }
    };

    // --- D. RENDER ENGINE (The Locking Mechanism) ---
    function filterAndRender() {
        // If NO USER is logged in, show a "Welcome/Locked" screen
        if (!currentUser) {
            container.innerHTML = `
                <div id="locked-content" style="grid-column: 1/-1; text-align: center; padding: 100px 20px;">
                    <div style="font-size: 4rem;">🔒</div>
                    <h2>Exclusive Access Only</h2>
                    <p>Please sign in with your Google account to access the JMeter, SRE, and DevOps training videos.</p>
                    <button class="auth-btn" style="padding: 15px 30px; margin-top: 20px;" onclick="auth.signInWithPopup(provider)">Sign in to Start Learning</button>
                </div>
            `;
            return;
        }

        // IF USER IS LOGGED IN, proceed to show data
        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.playlistId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        container.innerHTML = filtered.length ? '' : '<p id="no-results">No playlists match your search.</p>';

        filtered.forEach(p => {
            const isFav = favorites.includes(p.playlistId);
            const isDone = completed.includes(p.playlistId);
            const card = document.createElement('div');
            card.className = `playlist-card ${isDone ? 'completed' : ''}`;
            card.innerHTML = `
                <button class="fav-btn ${isFav ? 'active' : ''}" data-action="fav" data-id="${p.playlistId}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-tag">${p.tool} <span class="badge ${(p.level || 'Beginner').toLowerCase()}">${p.level || 'Beginner'}</span></div>
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

        const progress = document.getElementById('progress-count');
        if (progress) progress.textContent = completed.length;
    }

    // --- E. GLOBAL CLICKS & INTERACTIVITY ---
    container.addEventListener('click', async (e) => {
        if (!currentUser) return; // Prevent any interaction if logged out

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

    // Basic UI Setup (Modal/Search/Nav)
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
    };

    searchInput.oninput = (e) => { 
        searchTerm = e.target.value.toLowerCase(); 
        if (currentUser) filterAndRender(); 
    };

    navItems.forEach(nav => {
        nav.onclick = (e) => {
            e.preventDefault();
            if (!currentUser) return;
            currentFilter = nav.dataset.filter;
            navItems.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            filterAndRender();
        };
    });

});