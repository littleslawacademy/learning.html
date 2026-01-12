// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
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

// ==========================================
// 2. GLOBAL APP STATE
// ==========================================
let playlists = []; // The list of Bootcamps/Journeys
let favorites = []; // Array of playlistId strings
let completed = []; // Array of "courseId_videoId" strings
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// --- HELPER: CALCULATE % PROGRESS ---
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

// ==========================================
// 3. CORE LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');

    // --- A. LOAD DATA ---
    const loadData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            filterAndRender();
        } catch (err) { console.error("JSON Data failed:", err); }
    };
    loadData();

    // --- B. AUTHENTICATION ---
    loginBtn.addEventListener('click', () => auth.signInWithPopup(provider));
    logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;

            // Sync User Data from Cloud Firestore
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                favorites = doc.data().favorites || [];
                completed = doc.data().completed || [];
            }
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
            favorites = [];
            completed = [];
        }
        filterAndRender();
    });

    // --- C. SYNC TO CLOUD ---
    const sync = async () => {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        } catch (err) { console.error("Firestore Save failed:", err); }
    };

    // --- D. RENDER ENGINE ---
    function filterAndRender() {
        if (!currentUser) {
            container.innerHTML = `
                <div id="locked-content" style="grid-column: 1/-1; text-align: center; padding: 100px 20px;">
                    <div style="font-size: 4rem;">🔒</div>
                    <h2>Members-Only Access</h2>
                    <p>Log in with Google to start your performance engineer journey and track progress.</p>
                    <button class="auth-btn" style="padding: 15px 30px; margin-top: 20px;" onclick="auth.signInWithPopup(provider)">Sign in to Academy</button>
                </div>`;
            return;
        }

        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.courseId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        container.innerHTML = filtered.length ? '' : '<p id="no-results">No content matches your search.</p>';

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const isFav = favorites.includes(p.courseId);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <button class="fav-btn ${isFav ? 'active' : ''}" data-action="fav" data-id="${p.courseId}">${isFav ? '❤️' : '🤍'}</button>
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span></div>
                <h2>${p.title}</h2>
                
                <div class="card-progress">
                    <div class="progress-fill" style="width: ${stats.percent}%"></div>
                </div>
                <small>${stats.percent}% (${stats.done}/${stats.total} videos watched)</small>
                
                <p>${p.description}</p>
                <button class="open-lms-btn" data-id="${p.courseId}">▶ Open Bootcamp Dashboard</button>
            `;
            container.appendChild(card);
        });
        
        const countDisplay = document.getElementById('progress-count');
        if (countDisplay) countDisplay.textContent = completed.length;
    }

    // --- E. OPEN COURSE DASHBOARD (LMS) ---
    function openLMS(courseId) {
        const course = playlists.find(p => p.courseId === courseId);
        if (!course) return;

        const curriculumList = document.getElementById('curriculum-list');
        const modalTitleLabel = document.getElementById('course-title-label');
        curriculumList.innerHTML = '';
        modalTitleLabel.textContent = "Bootcamp: " + course.title;

        course.videos.forEach(vid => {
            const globalId = `${courseId}_${vid.id}`;
            const isDone = completed.includes(globalId);
            const li = document.createElement('li');
            li.className = 'lesson-item';
            li.innerHTML = `
                <input type="checkbox" ${isDone ? 'checked' : ''} data-gid="${globalId}">
                <span class="lesson-link" data-vid="${vid.id}">${vid.title}</span>
            `;
            curriculumList.appendChild(li);
        });

        updateModalStats(courseId);
        document.getElementById('video-overlay').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function updateModalStats(courseId) {
        const course = playlists.find(p => p.courseId === courseId);
        const stats = getCourseStats(course);
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if (bar) bar.style.width = stats.percent + '%';
        if (text) text.textContent = `${stats.percent}% Complete (${stats.done}/${stats.total})`;
    }

    // --- F. CLICK HANDLING ---
    document.addEventListener('click', async (e) => {
        // Open LMS
        if (e.target.classList.contains('open-lms-btn')) {
            openLMS(e.target.dataset.id);
        }

        // Toggle Favorites
        if (e.target.closest('[data-action="fav"]')) {
            const btn = e.target.closest('[data-action="fav"]');
            const id = btn.dataset.id;
            favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
            await sync();
            filterAndRender();
        }

        // Play Lesson
        if (e.target.classList.contains('lesson-link')) {
            const vidId = e.target.dataset.vid;
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1`;
            document.getElementById('current-lesson-title').textContent = e.target.textContent;
            document.querySelectorAll('.lesson-item').forEach(i => i.classList.remove('active'));
            e.target.parentElement.classList.add('active');
        }

        // Lesson Checkbox (Mark Video Done)
        if (e.target.type === 'checkbox' && e.target.dataset.gid) {
            const gid = e.target.dataset.gid;
            const cid = gid.split('_')[0];
            if (e.target.checked) {
                completed.push(gid);
            } else {
                completed = completed.filter(i => i !== gid);
            }
            await sync();
            updateModalStats(cid);
            filterAndRender(); // Updates home cards in background
        }
    });

    // Close Modal Logic
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    // Filters
    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); filterAndRender(); };
    navItems.forEach(n => {
        n.onclick = (e) => {
            e.preventDefault();
            if (!currentUser) return;
            currentFilter = n.dataset.filter;
            navItems.forEach(x => x.classList.remove('active'));
            n.classList.add('active');
            filterAndRender();
        };
    });
});