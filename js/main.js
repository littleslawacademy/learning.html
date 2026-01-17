This is the complete, ready-to-paste js/main.js file.

It is fully optimized to handle your 900+ videos, the Mega Menu, the Categorized Doc Wiki (fetching from /docs/performance/, etc.), Cloud Syncing with Firestore, the AI Insight Feed, and the Professional Certificate System.

code
JavaScript
download
content_copy
expand_less
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
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 2. GLOBAL APP STATE
// ==========================================
let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Mapping for Document Hub Folders (lowercase for logic)
const DOC_PATHS = {
    'jmeter': 'performance', 'neoload': 'performance', 'loadrunner': 'performance', 'k6': 'performance', 'locust': 'performance',
    'kubernetes': 'sre', 'aks': 'sre', 'azure': 'sre', 'grafana': 'sre', 'datadog': 'sre', 'dynatrace': 'sre',
    'github': 'devops', 'jenkins': 'devops', 'linux': 'devops', 'docker': 'devops'
};

// Helper: Progress Stats Engine
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    // Done matches: "courseId_videoId"
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

// ==========================================
// 3. AUTHENTICATION & CLOUD SYNC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');

    // Data Loader
    const loadData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            renderDashboard();
        } catch (e) { console.error("Course Data unreachable:", e); }
    };

    // Sign In/Out Event listeners
    if (loginBtn) {
        loginBtn.onclick = () => {
            auth.signInWithPopup(provider).catch(() => auth.signInWithRedirect(provider));
        };
    }
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    // Firebase Auth State Listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if(loginBtn) loginBtn.style.display = 'none';
            if(userProfile) userProfile.style.display = 'flex';
            if(userPic) userPic.src = user.photoURL;
            
            // Sync cloud database record
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                favorites = doc.data().favorites || [];
                completed = doc.data().completed || [];
            }
            loadHourlyAITip();
        } else {
            currentUser = null;
            if(loginBtn) loginBtn.style.display = 'block';
            if(userProfile) userProfile.style.display = 'none';
            favorites = []; 
        }
        renderDashboard();
    });

    const syncCloud = async () => {
        if (currentUser) {
            try { await db.collection('users').doc(currentUser.uid).set({ favorites, completed }); }
            catch (e) { console.error("Cloud update fail:", e); }
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    // ==========================================
    // 4. RENDERING & UI FUNCTIONS
    // ==========================================

    async function loadHourlyAITip() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const data = doc.data();
                const tipEl = document.getElementById('ai-tip-banner');
                if (tipEl) {
                    tipEl.style.display = 'block';
                    tipEl.innerHTML = `<h4 style="color:#e52e2e; font-size:0.8rem;">VETERAN SRE INSIGHT (AI Generated)</h4>
                                       <div style="font-family:serif; line-height:1.6; font-style:italic;">${data.content}</div>`;
                }
            }
        } catch (e) { console.log("Refreshing..."); }
    }

    function renderDashboard() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                <h1>🔐 Littles Law Academy Restricted</h1>
                <p>Register using your corporate or personal Google account to track your Performance journey.</p>
                <button class="auth-btn" style="padding:15px 40px; margin-top:20px" onclick="auth.signInWithPopup(provider)">Unlock Academy</button>
            </div>`;
            return;
        }

        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; border-left:8px solid #111; padding:30px; margin-bottom:30px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.05); white-space:pre-wrap;"></div>`;

        const filtered = playlists.filter(p => {
            const searchPool = (p.title + p.tool + p.description).toLowerCase();
            const matchesSearch = searchPool.includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.courseId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% complete (${stats.done}/${stats.total} topics)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Course Dashboard</button>
            `;
            container.appendChild(card);
        });

        loadHourlyAITip();
        document.getElementById('progress-count').textContent = completed.length;
    }

    // ==========================================
    // 5. THE GLOBAL EVENT SYSTEM
    // ==========================================
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // --- A. Mega Menu & Filtering ---
        const filterBtn = target.closest('[data-filter]');
        if (filterBtn) {
            e.preventDefault();
            if (!currentUser) return;
            currentFilter = filterBtn.dataset.filter;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const parentDropdown = filterBtn.closest('.dropdown')?.querySelector('.nav-item');
            if (parentDropdown) parentDropdown.classList.add('active'); else filterBtn.classList.add('active');
            renderDashboard();
            return;
        }

        // --- B. Doc Wiki / Categorized Docs Loader ---
        const docBtn = target.closest('[data-doc]');
        if (docBtn) {
            e.preventDefault();
            const tool = docBtn.dataset.doc;
            const folder = DOC_PATHS[tool.toLowerCase()] || 'performance';
            try {
                const res = await fetch(`docs/${folder}/${tool.toLowerCase()}.md`);
                const mdText = await res.text();
                
                // Overlay/Player Display override for documentation
                document.getElementById('current-lesson-title').textContent = `${tool} System Reference`;
                document.getElementById('course-title-label').textContent = "Learning Wiki / AI Gen Docs";
                const mediaArea = document.querySelector('.lms-video-area');
                
                // Assuming marked library is loaded
                mediaArea.innerHTML = `
                    <div class="doc-viewer" style="background:#fff; padding:60px; overflow-y:auto; height:100%; color:#222; font-size:1.1rem; line-height:1.7;">
                        ${typeof marked !== 'undefined' ? marked.parse(mdText) : mdText.replace(/\n/g, '<br>')} 
                    </div>`;
                document.getElementById('video-overlay').style.display = 'flex';
            } catch (err) { alert("Chapter coming soon! Currently in curation."); }
            return;
        }

        // --- C. LMS Dash / Sidebar Selection ---
        if (target.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === target.dataset.cid);
            if (!course) return;

            const list = document.getElementById('curriculum-list');
            list.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const isChecked = completed.includes(gid);
                const li = document.createElement('li');
                li.className = `lesson-item ${isChecked ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                list.appendChild(li);
            });
            document.getElementById('course-title-label').textContent = course.title;
            updateUI_Progress(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // Sidebar video switching
        if (target.classList.contains('lesson-link')) {
            const vidId = target.dataset.vid;
            const embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&origin=${window.location.origin}`;
            document.getElementById('video-player').src = embedUrl;
            document.getElementById('current-lesson-title').textContent = target.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            target.closest('.lesson-item').classList.add('active');
        }

        // Video checklist toggle
        if (target.type === 'checkbox' && target.dataset.gid) {
            const gid = target.dataset.gid;
            const cid = gid.split('_')[0];
            completed = target.checked ? [...completed, gid] : completed.filter(id => id !== gid);
            
            await syncCloud();
            updateUI_Progress(cid);
            renderDashboard();
        }
    });

    // Sub-function to refresh Sidebar Progress
    function updateUI_Progress(cid) {
        const stats = getCourseStats(playlists.find(p => p.courseId === cid));
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Ready to Certificate`;

        // Milestone Achievement: 100% Certificate download
        if (stats.percent === 100) {
            injectCertificateBtn(playlists.find(p => p.courseId === cid).title);
        } else {
            const oldBtn = document.getElementById('dl-cert-btn');
            if (oldBtn) oldBtn.remove();
        }
    }

    // Modal Control logic
    const closeModal = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };
    document.querySelector('.close-modal').onclick = closeModal;

    searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); renderDashboard(); };
    loadData();
});

// ==========================================
// 6. CERTIFICATE OF COMPLETION SYSTEM
// ==========================================
function injectCertificateBtn(courseTitle) {
    if (document.getElementById('dl-cert-btn')) return; // Already exists

    const btn = document.createElement('button');
    btn.id = 'dl-cert-btn';
    btn.className = 'cert-download-btn visible';
    btn.innerHTML = '🥇 Get Course Certificate';
    btn.onclick = () => {
        document.getElementById('cert-user-name').textContent = auth.currentUser.displayName;
        document.getElementById('cert-course-name').textContent = courseTitle;
        document.getElementById('cert-date').textContent = new Date().toLocaleDateString();
        
        const element = document.getElementById('certificate-template');
        element.style.display = 'block';

        const config = { 
            margin: 0.5, 
            filename: `Littles_Academy_${courseTitle.replace(/\s+/g,'_')}.pdf`, 
            image: {type:'jpeg', quality:0.98}, 
            html2canvas: {scale: 2}, 
            jsPDF: {orientation:'landscape'} 
        };

        // Capture template and hide it
        html2pdf().set(config).from(element).save().then(() => element.style.display = 'none');
    };
    document.querySelector('.sidebar-header').appendChild(btn);
}