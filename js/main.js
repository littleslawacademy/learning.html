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
let playlists = []; 
let favorites = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Mapping for the Categorized Documentation Hub folders
const DOC_PATHS = {
    // Performance Tools Items
    'JMeter': 'performance', 'Loadrunner': 'performance', 'Neoload': 'performance', 'k6': 'performance', 'Locust': 'performance',
    // SRE & Cloud
    'Kubernetes': 'sre', 'Azure': 'sre', 'AWS': 'sre', 'Grafana': 'sre', 'Datadog': 'sre', 'Dynatrace': 'sre',
    // DevOps & CICD
    'GitHub': 'devops', 'Jenkins': 'devops', 'Linux': 'devops', 'Docker': 'devops'
};

// Helper: Calculate 0-100% stats for a journey bootcamp
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    // Tracks ID format: "courseId_videoId"
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

// ==========================================
// 3. CORE LOGIC & AUTH
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
        } catch (e) { console.error("JSON Error:", e); }
    };

    // Load Hourly AI Insight from Firebase
    async function loadHourlyAITip() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const data = doc.data();
                const tipEl = document.getElementById('ai-tip-banner');
                if (tipEl) {
                    tipEl.style.display = 'block';
                    // Content is rendered with white-space support for Markdown-like spacing
                    tipEl.innerHTML = `<h4 style="margin-bottom:10px">📝 Principal Architect Insight</h4>${data.content}`;
                }
            }
        } catch (e) { console.log("AI Feed refreshing..."); }
    }

    if (loginBtn) {
        loginBtn.onclick = () => {
            auth.signInWithPopup(provider).catch(() => auth.signInWithRedirect(provider));
        };
    }

    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if(loginBtn) loginBtn.style.display = 'none';
            if(userProfile) userProfile.style.display = 'flex';
            if(userPic) userPic.src = user.photoURL;
            
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
        }
        renderDashboard();
    });

    const syncCloud = async () => {
        if (currentUser) {
            try { await db.collection('users').doc(currentUser.uid).set({ favorites, completed }); }
            catch (e) { console.error("Sync error:", e); }
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    // ==========================================
    // 4. RENDERING FUNCTIONS
    // ==========================================
    function renderDashboard() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px 20px;">
                <h1 style="font-size:3rem">🔐 Academy Locked</h1>
                <p style="font-size:1.2rem; max-width:600px; margin:20px auto;">
                    Please login with your Google account to access 900+ specialized videos, technical documentation, and your personalized training progress.
                </p>
                <button class="auth-btn" style="padding:15px 40px; font-size:1.1rem;" onclick="auth.signInWithPopup(provider)">Start Learning Now</button>
            </div>`;
            return;
        }

        // Setup AI Insight Banner area
        container.innerHTML = `<div id="ai-tip-banner" class="ai-magazine-layout" style="grid-column:1/-1; display:none;"></div>`;

        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool + p.description).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.courseId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% (${stats.done}/${stats.total} videos completed)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">▶ Resume Journey</button>
            `;
            container.appendChild(card);
        });

        loadHourlyAITip();
        const statsEl = document.getElementById('progress-count');
        if (statsEl) statsEl.textContent = completed.length;
    }

    // ==========================================
    // 5. INTERACTION & MEGA MENU
    // ==========================================

    document.addEventListener('click', async (e) => {
        const target = e.target;

        // A. Mega Menu & Navigation Filter
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

        // B. Documentation Viewer (MD Loader)
        const docBtn = target.closest('[data-doc]');
        if (docBtn) {
            e.preventDefault();
            const tool = docBtn.dataset.doc;
            const folder = DOC_PATHS[tool] || 'general';
            try {
                const response = await fetch(`docs/${folder}/${tool.toLowerCase()}.md`);
                const markdownText = await response.text();
                
                // Show Documentation in the Video Player Area
                document.getElementById('current-lesson-title').textContent = `${tool} Architecture Guide`;
                document.getElementById('course-title-label').textContent = "Documentation Wiki";
                const playerArea = document.querySelector('.lms-video-area');
                playerArea.innerHTML = `
                    <div class="doc-viewer" style="background:#fff; padding:50px; overflow-y:auto; height:100%; color:#333;">
                        <button id="back-to-video" style="background:#eee; border:none; padding:10px; cursor:pointer; margin-bottom:20px;">⬅ Close Docs / Back to Lesson</button>
                        ${markdownText.replace(/\n/g, '<br>')} 
                    </div>`; // Note: Marked.js library recommended for proper parsing
                
                document.getElementById('video-overlay').style.display = 'flex';
            } catch (err) { alert("This documentation chapter is currently being written by our AI. Check back next hour!"); }
            return;
        }

        // C. LMS Controls (Dashboard button & Lesson list)
        if (target.classList.contains('lms-btn')) {
            openLMS(target.dataset.cid);
        }

        if (target.classList.contains('lesson-link')) {
            const vidId = target.dataset.vid;
            // Build full-quality secure YouTube Link
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&origin=${window.location.origin}`;
            document.getElementById('current-lesson-title').textContent = target.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            target.closest('.lesson-item').classList.add('active');
        }

        if (target.type === 'checkbox' && target.dataset.gid) {
            const gid = target.dataset.gid;
            completed = target.checked ? [...completed, gid] : completed.filter(id => id !== gid);
            await syncCloud();
            updateLMSProgressUI(gid.split('_')[0]);
            renderDashboard();
        }
    });

    // --- Modal View Logic ---
    function openLMS(cid) {
        const course = playlists.find(p => p.courseId === cid);
        const list = document.getElementById('curriculum-list');
        list.innerHTML = '';
        course.videos.forEach(v => {
            const gid = `${cid}_${v.id}`;
            const li = document.createElement('li');
            li.className = `lesson-item ${completed.includes(gid) ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${completed.includes(gid) ? 'checked' : ''} data-gid="${gid}">
                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>
            `;
            list.appendChild(li);
        });
        document.getElementById('course-title-label').textContent = course.title;
        updateLMSProgressUI(cid);
        document.getElementById('video-overlay').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function updateLMSProgressUI(cid) {
        const stats = getCourseStats(playlists.find(p => p.courseId === cid));
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Journey Complete`;

        // Handle Certificate Trigger at 100%
        if (stats.percent === 100) {
            showCertificateButton(playlists.find(p => p.courseId === cid).title);
        }
    }

    // --- Utilities ---
    if (searchInput) searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); renderDashboard(); };

    const closeModal = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    document.querySelector('.close-modal').onclick = closeModal;
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

    loadData();
});

// ==========================================
// 6. CERTIFICATE DOWNLOAD SYSTEM
// ==========================================
function showCertificateButton(courseTitle) {
    const existing = document.getElementById('dl-cert-btn');
    if (existing) existing.remove();

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
        
        const opt = { margin:0.5, filename:`Academy_Cert_${courseTitle.replace(/\s+/g,'_')}.pdf`, 
                      image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{orientation:'landscape'} };
        
        html2pdf().set(opt).from(element).save().then(() => element.style.display = 'none');
    };
    document.querySelector('.sidebar-header').appendChild(btn);
}