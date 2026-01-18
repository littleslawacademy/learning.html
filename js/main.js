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
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// GLOBAL LOGIN FUNCTION (Required for UI-injected buttons)
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

const DOC_PATHS = {
    'jmeter': 'performance', 'neoload': 'performance', 'loadrunner': 'performance', 'k6': 'performance', 'locust': 'performance',
    'kubernetes': 'sre', 'aks': 'sre', 'azure': 'sre', 'grafana': 'sre', 'datadog': 'sre', 'dynatrace': 'sre',
    'github': 'devops', 'jenkins': 'devops', 'linux': 'devops', 'docker': 'devops',
    'testing-fundamentals': 'performance_mastery', 'distributed-architecture': 'performance_mastery',
    'ai-in-perf-testing': 'trends_ai', 'generative-ai-sre': 'trends_ai'
};

// Helper: Calculate progress percentage
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
        } catch (e) { console.error("Course Data missing."); }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (userProfile) userProfile.style.display = 'flex';
            if (userPic) userPic.src = user.photoURL;
            if (loginBtn) loginBtn.style.display = 'none';

            // Sync from Cloud
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) { 
                    completed = doc.data().completed || []; 
                    favorites = doc.data().favorites || [];
                }
            } catch(e) { console.warn("Firestore access error."); }
        } else {
            currentUser = null;
            if (userProfile) userProfile.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
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

    async function loadHourlyTeamBriefing() {
        if (currentFilter === 'All') return; // Skip loading if we are on Home page
        
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    const contentHtml = (typeof marked !== 'undefined') ? marked.parse(doc.data().content) : doc.data().content;
                    el.innerHTML = `<h4 style="color:#e52e2e; font-size:0.8rem; letter-spacing:1px; margin-bottom:15px;">LITTLE'S LAW TEAM | EXPERT FIELD MANUAL</h4>
                                   <div class="team-content-style">${contentHtml}</div>`;
                }
            }
        } catch(e) { console.warn("Team briefing not found."); }
    }

    // MAIN RENDER ENGINE
    function render() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px;">
                <h1 style="font-size:3rem;">🎓 Little's Law Academy</h1>
                <p style="margin:20px; color:#666; font-size:1.1rem;">Sign in to master Performance, SRE, and DevOps across 900+ professional modules.</p>
                <button class="auth-btn" style="padding:15px 35px; font-size:1.1rem; cursor:pointer;" onclick="handleLogin()">🔓 Unlock Academy Journey</button>
            </div>`;
            return;
        }

        let hubHeader = '';
        let bannerDiv = '';

        // Conditionally show banner space ONLY if not on "All" view
        if (currentFilter !== 'All') {
            hubHeader = `
                <div class="hub-header" style="grid-column: 1 / -1; background: #111; color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                    <div><small style="color:red; font-weight:bold;">TRACK HUB</small><h2 style="margin:0">${currentFilter}</h2></div>
                    <button class="back-btn" data-filter="All" style="background:transparent; border:1px solid #444; color:white; padding:10px 20px; cursor:pointer; border-radius:6px;">← Back to Home</button>
                </div>`;
            bannerDiv = `<div id="ai-tip-banner" style="grid-column:1/-1; display:none; border-left:10px solid #111; padding:40px; margin-bottom:40px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.05);"></div>`;
        }

        container.innerHTML = hubHeader + bannerDiv;
        
        const filtered = playlists.filter(p => {
            const fKey = currentFilter.toLowerCase().trim();
            const pool = (p.title + (p.tool || "") + (p.category || "")).toLowerCase();
            const isToolMatch = p.tool && p.tool.toLowerCase() === fKey;
            const isCatMatch = p.category && p.category.toLowerCase() === fKey;
            return (fKey === 'all' || isToolMatch || isCatMatch) && pool.includes(searchTerm);
        });

        if (filtered.length === 0 && currentFilter !== 'All') {
            container.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:50px;"><h3>Searching the team archive... try a different tool filter.</h3></div>`;
        }

        filtered.forEach(p => {
            const stats = getStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Processed (${stats.done}/${stats.total} modules)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">▶ Open Syllabus</button>
            `;
            container.appendChild(card);
        });

        loadHourlyTeamBriefing();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // ==========================================
    // 4. INTERACTION SYSTEM
    // ==========================================
    document.addEventListener('click', async (e) => {
        const t = e.target;

        // Navigation
        const filterBtn = t.closest('[data-filter]');
        if (filterBtn) {
            e.preventDefault();
            if(!currentUser) return;
            currentFilter = filterBtn.dataset.filter;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            (t.closest('.dropdown')?.querySelector('.nav-item') || filterBtn).classList.add('active');
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Docs Wiki Loader
        const docBtn = t.closest('[data-doc]');
        if (docBtn) {
            e.preventDefault();
            const tool = docBtn.dataset.doc.toLowerCase();
            const folder = DOC_PATHS[tool] || 'performance';
            try {
                const res = await fetch(`docs/${folder}/${tool.replace(/-/g,'_')}.md`);
                if(!res.ok) throw new Error();
                const mdText = await res.text();
                
                const mediaArea = document.querySelector('.lms-video-area');
                document.getElementById('current-lesson-title').textContent = tool.toUpperCase() + " Technical Document";
                mediaArea.innerHTML = `<div class="doc-viewer" style="background:#fff; padding:60px; overflow-y:auto; height:100%; color:#222; font-size:1.1rem; line-height:1.8;">
                                      ${typeof marked !== 'undefined' ? marked.parse(mdText) : mdText}</div>`;
                document.getElementById('video-overlay').style.display = 'flex';
            } catch (err) { alert("Our team is updating this module. Check back shortly!"); }
            return;
        }

        // LMS Bootcamp Open
        if (t.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === t.dataset.cid);
            if(!course) return;

            const listEl = document.getElementById('curriculum-list');
            listEl.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const checked = completed.includes(gid);
                const li = document.createElement('li');
                li.className = `lesson-item ${checked ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                listEl.appendChild(li);
            });
            document.getElementById('course-title-label').textContent = course.title;
            updateModalUI(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // Switch Video logic
        if (t.classList.contains('lesson-link')) {
            const vidId = t.dataset.vid;
            // CORRECTED: Fixed source builder syntax
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&origin=${window.location.origin}`;
            document.getElementById('current-lesson-title').textContent = t.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            t.closest('.lesson-item').classList.add('active');
        }

        // Checklist completion
        if (t.type === 'checkbox' && t.dataset.gid) {
            const gid = t.dataset.gid;
            completed = t.checked ? [...completed, gid] : completed.filter(id => id !== gid);
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
        if(text) text.textContent = `${stats.percent}% Mastery achieved`;

        // CERTIFICATE AWARDING
        if (stats.percent === 100) {
            handleCertDownload(playlists.find(p => p.courseId === cid).title);
        } else {
            const oldCert = document.getElementById('dl-cert-btn'); if(oldCert) oldCert.remove();
        }
    }

    function handleCertDownload(courseTitle) {
        if (document.getElementById('dl-cert-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'dl-cert-btn';
        btn.className = 'cert-download-btn visible';
        btn.style = "background:#28a745; color:white; border:none; padding:12px; width:100%; cursor:pointer; margin-top:20px; font-weight:bold; border-radius:5px;";
        btn.innerHTML = '🥇 Claim Team Certificate';
        btn.onclick = () => {
            document.getElementById('cert-user-name').textContent = currentUser.displayName;
            document.getElementById('cert-course-name').textContent = courseTitle;
            document.getElementById('cert-date').textContent = "Issued: " + new Date().toLocaleDateString();
            const certView = document.getElementById('certificate-template');
            certView.style.display = 'block';
            html2pdf().from(certView).set({ margin: 0.5, filename: `Certificate_${courseTitle}.pdf`, jsPDF: { orientation: 'landscape' } }).save().then(() => certView.style.display = 'none');
        };
        document.querySelector('.sidebar-header').appendChild(btn);
    }

    // Modal Close
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    if(searchInput) searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); render(); };

    loadData();
});