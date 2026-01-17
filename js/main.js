// ==========================================
// 1. FIREBASE CONFIG (Hardcoded for immediate workability)
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

// Initialize
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// App State
let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Helper: Calculate Bootcamp Progress
function getStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    return { done, total, percent: Math.round((done/total)*100) };
}

// ==========================================
// 2. INTERACTION CONTROLLER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');

    const loadData = async () => {
        const res = await fetch('data/playlists.json');
        playlists = await res.json();
        render();
    };

    const handleLogin = () => auth.signInWithPopup(provider).catch(() => auth.signInWithRedirect(provider));

    if (loginBtn) loginBtn.onclick = handleLogin;
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().then(() => window.location.reload());

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;
            loginBtn.style.display = 'none';
            // Cloud Fetch
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) { completed = doc.data().completed || []; favorites = doc.data().favorites || []; }
            loadHourlyAITip();
        } else {
            currentUser = null;
            userProfile.style.display = 'none';
            loginBtn.style.display = 'block';
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
                    el.innerHTML = `<h4>💡 Performance Masterclass</h4><div style="font-style:italic;">${doc.data().content}</div>`;
                }
            }
        } catch(e) {}
    }

    function render() {
        if (!currentUser) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:100px;"><h1>🎓 Welcome</h1><p>Sign in with Google to access your performance journey and 900+ lessons.</p><button class="auth-btn" style="padding:15px 30px" onclick="handleLogin()">Unlock Now</button></div>`;
            return;
        }

        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; background:#fff; border-left:10px solid #e52e2e; padding:30px; margin-bottom:30px; white-space:pre-line;"></div>`;
        
        const filtered = playlists.filter(p => {
            const pool = (p.title + p.tool).toLowerCase();
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && pool.includes(searchTerm);
        });

        filtered.forEach(p => {
            const stats = getStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Complete</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Academy</button>
            `;
            container.appendChild(card);
        });
        loadHourlyAITip();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    document.addEventListener('click', async (e) => {
        const t = e.target;
        
        if (t.closest('[data-filter]')) {
            e.preventDefault();
            currentFilter = t.closest('[data-filter]').dataset.filter;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            (t.closest('.dropdown')?.querySelector('.nav-item') || t).classList.add('active');
            render();
        }

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
            document.getElementById('course-title-label').textContent = course.title;
            updateModalUI(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
        }

        if (t.classList.contains('lesson-link')) {
            document.getElementById('video-player').src = "https://www.youtube.com/embed/" + t.dataset.vid + "?autoplay=1&origin=" + window.location.origin;
            document.getElementById('current-lesson-title').textContent = t.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            t.closest('.lesson-item').classList.add('active');
        }

        if (t.type === 'checkbox' && t.dataset.gid) {
            const gid = t.dataset.gid;
            completed = t.checked ? [...completed, gid] : completed.filter(i => i !== gid);
            await syncCloud();
            updateModalUI(gid.split('_')[0]);
            render();
        }
    });

    function updateModalUI(cid) {
        const stats = getStats(playlists.find(p => p.courseId === cid));
        document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
        document.getElementById('modal-progress-text').textContent = stats.percent + '% Mastery';

        const sidebarHeader = document.querySelector('.sidebar-header');
        const old = document.getElementById('dl-cert-btn'); if(old) old.remove();
        
        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.style = "background:#28a745; color:white; border:none; padding:10px; width:100%; cursor:pointer; margin-top:15px;";
            btn.innerHTML = '🎓 Download Certificate';
            btn.onclick = () => {
                document.getElementById('cert-user-name').textContent = currentUser.displayName;
                document.getElementById('cert-course-name').textContent = playlists.find(p => p.courseId === cid).title;
                document.getElementById('cert-date').textContent = "Issued: " + new Date().toLocaleDateString();
                const cert = document.getElementById('certificate-template');
                cert.style.display = 'block';
                html2pdf().from(cert).set({ margin:0.5, filename:'AcademyCert.pdf', jsPDF:{orientation:'landscape'} }).save().then(() => cert.style.display = 'none');
            };
            sidebarHeader.appendChild(btn);
        }
    }

    const searchAction = () => { searchTerm = searchInput.value.toLowerCase(); render(); };
    if (searchInput) searchInput.oninput = searchAction;

    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    loadData();
});