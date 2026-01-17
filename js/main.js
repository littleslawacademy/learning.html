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

// Global App Initialization
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

const DOC_PATHS = {
    'jmeter': 'performance', 'neoload': 'performance', 'loadrunner': 'performance', 'k6': 'performance', 'locust': 'performance',
    'kubernetes': 'sre', 'aks': 'sre', 'azure': 'sre', 'grafana': 'sre', 'datadog': 'sre', 'dynatrace': 'sre',
    'github': 'devops', 'jenkins': 'devops', 'linux': 'devops', 'docker': 'devops'
};

function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    return { done, total, percent: Math.round((done / total) * 100) };
}

// ==========================================
// 2. MAIN LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');

    const loadData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            renderDashboard();
        } catch (e) { console.error("Loading error:", e); }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userPic) userPic.src = user.photoURL;
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) { completed = doc.data().completed || []; favorites = doc.data().favorites || []; }
        } else {
            currentUser = null;
            if (loginBtn) loginBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
        renderDashboard();
    });

    const syncProgress = async () => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    async function loadAITip() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = `<h4>💡 Expert Perspective</h4><div style="white-space: pre-wrap; font-style: italic; opacity: 0.9;">${doc.data().content}</div>`;
                }
            }
        } catch (e) { console.log("AI Feed refreshing..."); }
    }

    function renderDashboard() {
        if (!currentUser) {
            container.innerHTML = `<div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px;"><h1>🔐 Welcome</h1><p>Please log in to start learning.</p><button class="auth-btn" style="margin-top:20px" onclick="auth.signInWithPopup(provider)">Google Login</button></div>`;
            return;
        }

        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; background:#fff; border-left:8px solid #e52e2e; padding:30px; margin-bottom:30px;"></div>`;
        
        const filtered = playlists.filter(p => {
            const pool = (p.title + p.tool).toLowerCase();
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && pool.includes(searchTerm);
        });

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Journey Complete</small>
                <button class="lms-btn" data-cid="${p.courseId}" style="margin-top:20px; width:100%">Open Dashboard</button>
            `;
            container.appendChild(card);
        });
        loadAITip();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // INTERACTION
    document.addEventListener('click', async (e) => {
        const target = e.target;
        const cid = target.dataset.cid;

        // Mega Menu & Category Filter
        if (target.closest('[data-filter]')) {
            e.preventDefault();
            currentFilter = target.closest('[data-filter]').dataset.filter;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const parent = target.closest('.dropdown')?.querySelector('.nav-item') || target;
            parent.classList.add('active');
            renderDashboard();
            return;
        }

        // Open Academy Viewer
        if (target.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === cid);
            const list = document.getElementById('curriculum-list');
            list.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const li = document.createElement('li');
                li.className = `lesson-item ${completed.includes(gid) ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${completed.includes(gid) ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                list.appendChild(li);
            });
            document.getElementById('course-title-label').textContent = course.title;
            document.getElementById('video-overlay').style.display = 'flex';
        }

        // Change Video Lesson
        if (target.classList.contains('lesson-link')) {
            const vidId = target.dataset.vid;
            // CORRECTED TEMPLATE LITERAL
            document.getElementById('video-player').src = "https://www.youtube.com/embed/" + vidId + "?autoplay=1&origin=" + window.location.origin;
            document.getElementById('current-lesson-title').textContent = target.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            target.closest('.lesson-item').classList.add('active');
        }

        // Progress Checkbox
        if (target.type === 'checkbox' && target.dataset.gid) {
            const gid = target.dataset.gid;
            completed = target.checked ? [...completed, gid] : completed.filter(id => id !== gid);
            await syncProgress();
            renderDashboard();
        }
    });

    if (searchInput) searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); renderDashboard(); };
    if (loginBtn) loginBtn.onclick = () => auth.signInWithPopup(provider);
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();
    
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    loadData();
});