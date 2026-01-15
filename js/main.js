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


// const firebaseConfig = {
//   apiKey: "AIzaSyAIM7NkLymWvPOFfGJlUI3ZyGKIgAhVFuI",
//   authDomain: "littleslawacademy-f45e7.firebaseapp.com",
//   projectId: "littleslawacademy-f45e7",
//   storageBucket: "littleslawacademy-f45e7.firebasestorage.app",
//   messagingSenderId: "393189119362",
//   appId: "1:393189119362:web:659d157ab482c4a660ab9b",
//   measurementId: "G-S40XF238WM"
// };

// Global Firebase Instance Check
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// App Global State
let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || []; // Default to local
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Progress Calculation Helper
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Selectors
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');

    // ==========================================
    // 2. DATA LOADING
    // ==========================================
    const loadPlaylists = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            console.log("Playlists Loaded");
            renderDashboard();
        } catch (e) { console.error("Could not load data:", e); }
    };
    loadPlaylists();

    // ==========================================
    // 3. LOGIN / AUTHENTICATION
    // ==========================================
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log("Opening Sign-In Popup...");
            auth.signInWithPopup(provider).catch(error => {
                console.error("Auth Error:", error.message);
                alert("Sign-In failed. Make sure your GitHub URL or localhost is added to 'Authorized Domains' in the Firebase Console Settings.");
            });
        });
    }

    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("Logged in as:", user.displayName);
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;

            // SAFE SYNC: Pull cloud data, but don't crash if it fails
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    favorites = doc.data().favorites || [];
                    completed = doc.data().completed || [];
                    console.log("Sync Complete");
                }
            } catch (err) { console.warn("Cloud Fetch Failed (using local backup)"); }
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
        }
        renderDashboard();
    });

    const syncToCloud = async () => {
        if (!currentUser) {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
            return;
        }
        try {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        } catch (e) { console.error("Save error:", e); }
    };

    // ==========================================
    // 4. RENDERING & UI LOGIC
    // ==========================================
    function renderDashboard() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <h1>🔐 Welcome Performance Engineer</h1>
                <p>Login with your account to access 900+ lessons and track your bootcamp progress.</p>
                <button class="auth-btn" id="guest-login-btn">Sign in to Academy</button>
            </div>`;
            document.getElementById('guest-login-btn')?.addEventListener('click', () => auth.signInWithPopup(provider));
            return;
        }

        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.courseId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        container.innerHTML = filtered.length ? '' : '<p>No bootcamps match your search.</p>';

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Completed (${stats.done}/${stats.total} videos)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Course Dashboard</button>
            `;
            container.appendChild(card);
        });
        document.getElementById('progress-count').textContent = completed.length;
    }

    // ==========================================
    // 5. LMS / MODAL ACTIONS
    // ==========================================
    const openLMS = (cid) => {
        const course = playlists.find(p => p.courseId === cid);
        const list = document.getElementById('curriculum-list');
        list.innerHTML = '';
        
        course.videos.forEach(v => {
            const gid = `${cid}_${v.id}`;
            const li = document.createElement('li');
            li.className = 'lesson-item';
            li.innerHTML = `
                <input type="checkbox" ${completed.includes(gid) ? 'checked' : ''} data-gid="${gid}">
                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>
            `;
            list.appendChild(li);
        });

        updateLMSUI(cid);
        document.getElementById('video-overlay').style.display = 'flex';
    };

    const updateLMSUI = (cid) => {
        const course = playlists.find(p => p.courseId === cid);
        const stats = getCourseStats(course);
        document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
        document.getElementById('modal-progress-text').textContent = stats.percent + '% Done';
    };

    // Global Interaction Handler
    document.addEventListener('click', async (e) => {
        // Dashboard Open
        if (e.target.classList.contains('lms-btn')) openLMS(e.target.dataset.cid);

        // Sidebar Lesson Click
        if (e.target.classList.contains('lesson-link')) {
            const id = e.target.dataset.vid;
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
            document.getElementById('current-lesson-title').textContent = e.target.textContent;
            document.querySelectorAll('.lesson-item').forEach(i => i.classList.remove('active'));
            e.target.parentElement.classList.add('active');
        }

        // Checkbox Click
        if (e.target.type === 'checkbox' && e.target.dataset.gid) {
            const gid = e.target.dataset.gid;
            const cid = gid.split('_')[0];
            completed = e.target.checked ? [...completed, gid] : completed.filter(i => i !== gid);
            await syncToCloud();
            updateLMSUI(cid);
            renderDashboard();
        }
    });

    // Simple search & Nav
    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); renderDashboard(); };
    
    navItems.forEach(n => {
        n.onclick = (e) => {
            e.preventDefault();
            if (!currentUser) return;
            currentFilter = n.dataset.filter;
            navItems.forEach(i => i.classList.remove('active'));
            n.classList.add('active');
            renderDashboard();
        };
    });

    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
    };
});