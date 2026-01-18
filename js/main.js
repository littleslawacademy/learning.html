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

// Initialize Instance
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// GLOBAL LOGIN FUNCTION (Accessible to buttons injected via innerHTML)
const handleLogin = () => {
    auth.signInWithPopup(provider).catch(() => auth.signInWithRedirect(provider));
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

// Path routing for the Documentation Hub folders
const DOC_PATHS = {
    'jmeter': 'performance', 'neoload': 'performance', 'loadrunner': 'performance', 'k6': 'performance', 'locust': 'performance',
    'kubernetes': 'sre', 'aks': 'sre', 'azure': 'sre', 'grafana': 'sre', 'datadog': 'sre', 'dynatrace': 'sre',
    'github': 'devops', 'jenkins': 'devops', 'linux': 'devops', 'docker': 'devops',
    'testing-fundamentals': 'performance_mastery', 'distributed-architecture': 'performance_mastery',
    'ai-in-perf-testing': 'trends_ai', 'generative-ai-sre': 'trends_ai'
};

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
        } catch (e) { console.error("Error loading JSON:", e); }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (userProfile) userProfile.style.display = 'flex';
            if (userPic) userPic.src = user.photoURL;
            if (loginBtn) loginBtn.style.display = 'none';

            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) { 
                completed = doc.data().completed || []; 
                favorites = doc.data().favorites || [];
            }
            loadHourlyTeamBriefing();
        } else {
            currentUser = null;
            if (userProfile) userProfile.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
        }
        render();
    });

    async function loadHourlyTeamBriefing() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = `<h4>💡 Little's Law Team | Expert Field Manual</h4>
                                   <div style="font-family:serif; line-height:1.7;">${doc.data().content}</div>`;
                }
            }
        } catch(e) {}
    }

    const syncCloud = async () => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).set({ completed, favorites });
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    // RENDERING DASHBOARD
    function render() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px;">
                <h1>🎓 Welcome to Little's Law Academy</h1>
                <p style="margin:20px; color:#666;">Sign in with Google to unlock your SRE & Performance training track.</p>
                <button class="auth-btn" style="padding:15px 40px; font-size:1.1rem; cursor:pointer;" onclick="handleLogin()">Unlock My Journey</button>
            </div>`;
            return;
        }

        let hubHeader = '';
        if (currentFilter !== 'All') {
            hubHeader = `
                <div class="hub-header" style="grid-column: 1 / -1; background: #111; color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                    <div><small style="color:red">TEAM HUB</small><h2 style="margin:0">${currentFilter}</h2></div>
                    <button class="back-btn" data-filter="All" style="background:transparent; border:1px solid white; color:white; padding:8px 15px; cursor:pointer; border-radius:5px;">← All Paths</button>
                </div>`;
        }

        container.innerHTML = hubHeader + `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; border-left:10px solid #e52e2e; padding:30px; margin-bottom:40px; background:#fff; white-space:pre-wrap;"></div>`;
        
        const filtered = playlists.filter(p => {
            const filterKey = currentFilter.toLowerCase().trim();
            const pool = (p.title + p.tool + (p.category || '')).toLowerCase();
            const matchesSearch = pool.includes(searchTerm);
            
            const isToolMatch = p.tool && p.tool.toLowerCase() === filterKey;
            const isCatMatch = p.category && p.category.toLowerCase() === filterKey;
            
            return (filterKey === 'all' || isToolMatch || isCatMatch) && matchesSearch;
        });

        if (filtered.length === 0 && currentFilter !== 'All') {
            container.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:50px;"><h3>No modules found in the ${currentFilter} track.</h3></div>`;
        }

        filtered.forEach(p => {
            const stats = getStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Journey Complete (${stats.done}/${stats.total} videos)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">▶ Enter Journey</button>
            `;
            container.appendChild(card);
        });

        loadHourlyTeamBriefing();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // INTERACTION HANDLER
    document.addEventListener('click', async (e) => {
        const t = e.target;

        // A. Handle Filters
        const filterBtn = t.closest('[data-filter]');
        if (filterBtn) {
            e.preventDefault();
            currentFilter = filterBtn.dataset.filter;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            (t.closest('.dropdown')?.querySelector('.nav-item') || filterBtn).classList.add('active');
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // B. Handle Team Wiki (Docs)
        const docBtn = t.closest('[data-doc]');
        if (docBtn) {
            e.preventDefault();
            const tool = docBtn.dataset.doc.toLowerCase();
            const folder = DOC_PATHS[tool] || 'performance';
            try {
                const res = await fetch(`docs/${folder}/${tool}.md`);
                if(!res.ok) throw new Error();
                const mdText = await res.text();
                
                document.getElementById('current-lesson-title').textContent = tool.toUpperCase() + " Technical Wiki";
                const mediaArea = document.querySelector('.lms-video-area');
                mediaArea.innerHTML = `<div class="doc-viewer" style="background:#fff; padding:60px; overflow-y:auto; height:100%; color:#222; font-size:1.1rem; line-height:1.8;">${marked.parse(mdText)}</div>`;
                document.getElementById('video-overlay').style.display = 'flex';
            } catch (err) { alert("Documentation being curated by the Team. Check back next hour!"); }
            return;
        }

        // C. LMS Sidebar & Progress
        if (t.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === t.dataset.cid);
            if(!course) return;

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
            document.body.style.overflow = 'hidden';
        }

        // Lesson switch
        if (t.classList.contains('lesson-link')) {
            const vidId = t.dataset.vid;
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&origin=${window.location.origin}`;
            document.getElementById('current-lesson-title').textContent = t.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            t.closest('.lesson-item').classList.add('active');
        }

        // Checkbox click
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
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Ready to Certificate`;

        const header = document.querySelector('.sidebar-header');
        const oldCert = document.getElementById('dl-cert-btn'); if(oldCert) oldCert.remove();

        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.style = "background:#28a745; color:white; border:none; padding:12px; width:100%; cursor:pointer; margin-top:20px; font-weight:bold; border-radius:5px;";
            btn.innerHTML = '🥇 Download My Team Certificate';
            btn.onclick = () => {
                document.getElementById('cert-user-name').textContent = currentUser.displayName;
                document.getElementById('cert-course-name').textContent = playlists.find(p => p.courseId === cid).title;
                document.getElementById('cert-date').textContent = "Validated: " + new Date().toLocaleDateString();
                const element = document.getElementById('certificate-template');
                element.style.display = 'block';
                html2pdf().from(element).set({ margin:0.5, filename:'TeamCertificate.pdf', jsPDF:{orientation:'landscape'} }).save().then(() => element.style.display = 'none');
            };
            header.appendChild(btn);
        }
    }

    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); render(); };
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    loadData();
});