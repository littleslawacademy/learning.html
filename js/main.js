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
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

// Mapping for the Documentation Wiki Subfolders
const DOC_PATHS = {
    'jmeter': 'performance', 'neoload': 'performance', 'loadrunner': 'performance', 'k6': 'performance', 'locust': 'performance',
    'kubernetes': 'sre', 'aks': 'sre', 'azure': 'sre', 'grafana': 'sre', 'datadog': 'sre', 'dynatrace': 'sre',
    'github': 'devops', 'jenkins': 'devops', 'linux': 'devops', 'docker': 'devops'
};

// ==========================================
// 3. CORE ENGINES
// ==========================================

// Helper: Progress Stats Engine
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

// Sync current user progress to Firebase Cloud
const syncToCloud = async () => {
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).set({ completed: completed });
            console.log("☁️ Progress saved to cloud");
        } catch (e) { console.error("Cloud Sync Fail:", e); }
    } else {
        localStorage.setItem('ll-completed', JSON.stringify(completed));
    }
};

// ==========================================
// 4. MAIN UI CONTROLLER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');

    // Fetch JSON Course Data
    const loadAcademyData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            console.log("📂 Courses Loaded:", playlists.length);
            renderDashboard();
        } catch (e) { console.error("Could not find playlists.json:", e); }
    };

    // Render the Daily AI Technical Tip
    const loadHourlyAIFeed = async () => {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = `<h4>💡 Expert Masterclass: 30-Year Architect Insights</h4>
                                   <div class="ai-content">${doc.data().content}</div>`;
                }
            }
        } catch (e) { console.log("AI Feed refreshing..."); }
    };

    // Authentication Logic
// Enhanced Authentication Logic
    const handleLogin = () => {
        console.log("Attempting Login for domain:", window.location.hostname);
        
        // Always try Redirect for GitHub Pages to avoid popup blockers
        auth.signInWithRedirect(provider).catch(error => {
            console.error("Auth failed:", error.code, error.message);
            alert("Login Error: " + error.message);
        });
    };

    if (loginBtn) loginBtn.onclick = handleLogin;
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().then(() => window.location.reload());

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if(loginBtn) loginBtn.style.display = 'none';
            if(userProfile) userProfile.style.display = 'flex';
            if(userPic) userPic.src = user.photoURL;

            // Fetch User Progress from Firebase
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                completed = doc.data().completed || [];
            }
            loadHourlyAIFeed();
        } else {
            currentUser = null;
            if(loginBtn) loginBtn.style.display = 'block';
            if(userProfile) userProfile.style.display = 'none';
        }
        renderDashboard();
    });

    // Main Renderer for Course Cards
    function renderDashboard() {
        if (!currentUser) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:100px;">
                    <h1 style="font-size:3rem">🎓 Little's Law Academy</h1>
                    <p style="margin:20px; font-size:1.2rem">Please sign in to unlock your SRE, Performance, and DevOps training path.</p>
                    <button class="auth-btn" style="padding:15px 40px; font-size:1.1rem;" onclick="handleLogin()">Sign in with Google</button>
                </div>`;
            return;
        }

        // Reset with AI Insight space at top
        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; border-left:6px solid red; background:#fff; padding:30px; margin-bottom:40px; line-height:1.7; white-space:pre-line;"></div>`;

        // Filtering Logic
        const filtered = playlists.filter(p => {
            const pool = (p.title + p.tool + (p.category || '')).toLowerCase();
            const matchesSearch = pool.includes(searchTerm);
            const matchesCat = (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter);
            return matchesCat && matchesSearch;
        });

        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Expert'}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Mastery (${stats.done}/${stats.total} Lessons)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Bootcamp View</button>
            `;
            container.appendChild(card);
        });

        loadHourlyAIFeed();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // Interaction Listener
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // Mega Menu Category Selection
        if (target.closest('[data-filter]')) {
            e.preventDefault();
            if(!currentUser) return;
            currentFilter = target.closest('[data-filter]').dataset.filter;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const parent = target.closest('.dropdown')?.querySelector('.nav-item') || target;
            parent.classList.add('active');
            renderDashboard();
            return;
        }

        // Documentation Loading (MD Library)
        if (target.closest('[data-doc]')) {
            e.preventDefault();
            const toolName = target.closest('[data-doc]').dataset.doc.toLowerCase();
            const subFolder = DOC_PATHS[toolName] || 'performance';
            try {
                const response = await fetch(`docs/${subFolder}/${toolName}.md`);
                const md = await response.text();
                const lmsArea = document.querySelector('.lms-video-area');
                document.getElementById('current-lesson-title').textContent = `${toolName.toUpperCase()} Architecture Wiki`;
                lmsArea.innerHTML = `<div class="doc-viewer" style="background:#fff; padding:60px; height:100%; overflow-y:auto; color:#222; font-size:1.1rem; line-height:1.8;">${typeof marked !== 'undefined' ? marked.parse(md) : md}</div>`;
                document.getElementById('video-overlay').style.display = 'flex';
            } catch (e) { alert("Documentation being updated. Please try again soon!"); }
            return;
        }

        // Open specific Bootcamp view
        if (target.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === target.dataset.cid);
            if (!course) return;

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

            document.getElementById('course-title-label').textContent = "Learning Journey: " + course.title;
            updateUIProgress(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // Select a lesson inside Sidebar
        if (target.classList.contains('lesson-link')) {
            const vidId = target.dataset.vid;
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&origin=${window.location.origin}`;
            document.getElementById('current-lesson-title').textContent = target.textContent;
            document.querySelectorAll('.lesson-item').forEach(i => i.classList.remove('active'));
            target.parentElement.classList.add('active');
        }

        // Mark specific lesson completed (Checkbox)
        if (target.type === 'checkbox' && target.dataset.gid) {
            const gid = target.dataset.gid;
            const cid = gid.split('_')[0];
            if (target.checked) {
                if (!completed.includes(gid)) completed.push(gid);
            } else {
                completed = completed.filter(id => id !== gid);
            }
            await syncToCloud();
            updateUIProgress(cid);
            renderDashboard();
        }
    });

    // Helper: Progress update for LMS Modal
    function updateUIProgress(cid) {
        const stats = getCourseStats(playlists.find(p => p.courseId === cid));
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Processed`;

        // CERTIFICATE AWARDING
        if (stats.percent === 100) {
            handleCertAward(playlists.find(p => p.courseId === cid).title);
        } else {
            const existing = document.getElementById('dl-cert-btn');
            if (existing) existing.remove();
        }
    }

    // Modal Control: Cleanup stream on close
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    // Listeners for Search input
    if(searchInput) searchInput.oninput = (e) => { searchTerm = e.target.value.toLowerCase(); renderDashboard(); };

    loadAcademyData();
});

// ==========================================
// 5. CERTIFICATE OF ACHIEVEMENT LOGIC
// ==========================================
function handleCertAward(courseTitle) {
    if (document.getElementById('dl-cert-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'dl-cert-btn';
    btn.className = 'cert-download-btn visible';
    btn.innerHTML = '🥇 Unlock Official Certificate';
    btn.onclick = () => {
        // Hydrate the certificate template with live user data
        document.getElementById('cert-user-name').textContent = auth.currentUser.displayName;
        document.getElementById('cert-course-name').textContent = courseTitle;
        document.getElementById('cert-date').textContent = new Date().toLocaleDateString();
        
        const certView = document.getElementById('certificate-template');
        certView.style.display = 'block';

        const opt = { 
            margin: 0.5, 
            filename: `Certification_${courseTitle.replace(/\s+/g,'_')}.pdf`, 
            image: { type:'jpeg', quality:0.98 }, 
            html2canvas: { scale: 2 }, 
            jsPDF: { unit:'in', format:'letter', orientation:'landscape' } 
        };

        // Captures UI template to PDF via external lib
        html2pdf().set(opt).from(certView).save().then(() => {
            certView.style.display = 'none';
        });
    };
    document.querySelector('.sidebar-header').appendChild(btn);
}