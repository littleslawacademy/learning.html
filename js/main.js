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

// Initialize Firebase Instance
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// GLOBAL LOGIN FUNCTION (Required for center-page buttons to work)
const handleLogin = () => {
    console.log("🔐 Starting Login...");
    auth.signInWithPopup(provider).catch(() => {
        console.log("Fallback to Redirect login");
        auth.signInWithRedirect(provider);
    });
};

// ==========================================
// 2. GLOBAL APP STATE
// ==========================================
let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Helper: Progress Stats Engine
function getStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    return { done, total, percent: Math.round((done / total) * 100) };
}

// ==========================================
// 3. MAIN CONTROLLER
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
            render();
        } catch (e) { console.error("Could not load playlist data:", e); }
    };

    // Firebase Auth Listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if(userProfile) userProfile.style.display = 'flex';
            if(userPic) userPic.src = user.photoURL;
            if(loginBtn) loginBtn.style.display = 'none';

            // Sync with Cloud
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) { 
                    completed = doc.data().completed || []; 
                    favorites = doc.data().favorites || [];
                }
            } catch(e) { console.warn("Firestore access restricted."); }
            loadHourlyAITip();
        } else {
            currentUser = null;
            if(userProfile) userProfile.style.display = 'none';
            if(loginBtn) loginBtn.style.display = 'block';
        }
        render();
    });

    const syncCloud = async () => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).set({ completed, favorites });
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    async function loadHourlyAITip() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = `<h4>💡 Expert Perspective (Hourly Feed)</h4>
                                   <div style="font-family:serif; line-height:1.7;">${doc.data().content}</div>`;
                }
            }
        } catch(e) {}
    }

    // MAIN RENDER ENGINE
    function render() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px;">
                <h1>🎓 Welcome Performance Engineer</h1>
                <p style="margin:20px; color:#666;">Login to track your journey through 900+ professional lessons.</p>
                <button class="auth-btn" style="padding:15px 35px; font-size:1.1rem; cursor:pointer;" onclick="handleLogin()">🔓 Unlock Journey Now</button>
            </div>`;
            return;
        }

        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; border-left:8px solid #e52e2e; background:#fff; padding:30px; margin-bottom:40px; white-space:pre-wrap; box-shadow:0 4px 15px rgba(0,0,0,0.05);"></div>`;
        
        const filtered = playlists.filter(p => {
            const pool = (p.title + p.tool).toLowerCase();
            const matchesSearch = pool.includes(searchTerm);
            const matchesCat = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            return matchesCat && matchesSearch;
        });

        filtered.forEach(p => {
            const stats = getStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Completed (${stats.done}/${stats.total} topics)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Training Dashboard</button>
            `;
            container.appendChild(card);
        });

        loadHourlyAITip();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // GLOBAL INTERACTION LISTENER
    document.addEventListener('click', async (e) => {
        const t = e.target;
        
        // 1. Navigation & Filters
        if (t.closest('[data-filter]')) {
            e.preventDefault();
            currentFilter = t.closest('[data-filter]').dataset.filter;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            (t.closest('.dropdown')?.querySelector('.nav-item') || t).classList.add('active');
            render();
        }

        // 2. Open Academy LMS View
        if (t.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === t.dataset.cid);
            const list = document.getElementById('curriculum-list');
            list.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const checked = completed.includes(gid);
                const li = document.createElement('li');
                li.className = `lesson-item ${checked ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                list.appendChild(li);
            });
            document.getElementById('course-title-label').textContent = "Learning Journey: " + course.title;
            updateModalProgress(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // 3. Play Video from Sidebar
        if (t.classList.contains('lesson-link')) {
            const vidId = t.dataset.vid;
            // Secure link creation
            document.getElementById('video-player').src = "https://www.youtube.com/embed/" + vidId + "?autoplay=1&origin=" + window.location.origin;
            document.getElementById('current-lesson-title').textContent = t.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            t.closest('.lesson-item').classList.add('active');
        }

        // 4. Mark Lesson Progress (Checkbox)
        if (t.type === 'checkbox' && t.dataset.gid) {
            const gid = t.dataset.gid;
            completed = t.checked ? [...completed, gid] : completed.filter(i => i !== gid);
            await syncCloud();
            updateModalProgress(gid.split('_')[0]);
            render();
        }
    });

    function updateModalProgress(cid) {
        const stats = getStats(playlists.find(p => p.courseId === cid));
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Ready to Certificate`;

        const sidebarHeader = document.querySelector('.sidebar-header');
        const oldBtn = document.getElementById('dl-cert-btn'); if(oldBtn) oldBtn.remove();
        
        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.style = "background:#28a745; color:white; border:none; padding:12px; width:100%; cursor:pointer; margin-top:15px; border-radius:6px; font-weight:bold;";
            btn.innerHTML = '🎓 Download Course Certificate';
            btn.onclick = () => {
                document.getElementById('cert-user-name').textContent = currentUser.displayName;
                document.getElementById('cert-course-name').textContent = playlists.find(p => p.courseId === cid).title;
                document.getElementById('cert-date').textContent = "Awarded on " + new Date().toLocaleDateString();
                const certEl = document.getElementById('certificate-template');
                certEl.style.display = 'block';
                html2pdf().from(certEl).set({ margin:0.5, filename:'LWA_Certificate.pdf', jsPDF:{orientation:'landscape'} }).save().then(() => certEl.style.display = 'none');
            };
            sidebarHeader.appendChild(btn);
        }
    }

    if (loginBtn) loginBtn.onclick = handleLogin;
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().then(() => window.location.reload());

    if (searchInput) {
        searchInput.oninput = (e) => { 
            searchTerm = e.target.value.toLowerCase(); 
            render(); 
        };
    }

    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    loadData();
});