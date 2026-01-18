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

// GLOBAL LOGIN FUNCTION (Accessible to buttons injected via innerHTML)
const handleLogin = () => {
    console.log("🔐 Starting Login Sequence...");
    auth.signInWithPopup(provider).catch(() => {
        console.log("Popup blocked or failed, attempting redirect...");
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

// Helper: Calculate Course Completion Progress
function getStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    return { done, total, percent: Math.round((done / total) * 100) };
}

// Sync progress to Firebase Cloud
const syncCloud = async () => {
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).set({ completed, favorites });
            console.log("☁️ Progress synced to cloud");
        } catch (e) { console.error("Cloud Sync error:", e); }
    } else {
        localStorage.setItem('ll-completed', JSON.stringify(completed));
    }
};

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
        } catch (e) { console.error("JSON Loading failed:", e); }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if(userProfile) userProfile.style.display = 'flex';
            if(userPic) userPic.src = user.photoURL;
            if(loginBtn) loginBtn.style.display = 'none';

            // Sync with Firestore
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) { 
                    completed = doc.data().completed || []; 
                    favorites = doc.data().favorites || [];
                }
            } catch(e) { console.warn("Firestore Rules Restriction."); }
            loadHourlyAITip();
        } else {
            currentUser = null;
            if(userProfile) userProfile.style.display = 'none';
            if(loginBtn) loginBtn.style.display = 'block';
        }
        render();
    });

    async function loadHourlyAITip() {
        try {
            const doc = await db.collection('admin_data').doc('hourly_tip').get();
            if (doc.exists) {
                const el = document.getElementById('ai-tip-banner');
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = `<h4>💡 Expert Architect Perspective</h4>
                                   <div style="font-family:serif; line-height:1.7;">${doc.data().content}</div>`;
                }
            }
        } catch(e) { console.log("AI feed not found."); }
    }

    // MAIN RENDERING FUNCTION
    function render() {
        if (!currentUser) {
            container.innerHTML = `
            <div id="locked-view" style="grid-column:1/-1; text-align:center; padding:100px;">
                <h1 style="font-size:3rem">🎓 Little's Law Academy</h1>
                <p style="margin:20px; color:#666;">Please sign in with your Google account to unlock your journey through 900+ lessons.</p>
                <button class="auth-btn" style="padding:15px 40px; font-size:1.1rem; cursor:pointer;" onclick="handleLogin()">🔓 Unlock Dashboard Now</button>
            </div>`;
            return;
        }

        // Generate Header if inside a specific Tool/Category Hub
        let hubHtml = '';
        if (currentFilter !== 'All' && currentFilter !== 'Favorites') {
            hubHtml = `
                <div class="hub-header" style="grid-column: 1 / -1; background: #111; color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <small style="color:var(--primary-red); text-transform:uppercase; font-weight:bold;">Masterclass Series</small>
                        <h2 style="margin:0">${currentFilter} Library</h2>
                    </div>
                    <button class="back-btn" data-filter="All" style="background:transparent; border:1px solid white; color:white; padding:8px 15px; border-radius:5px; cursor:pointer;">← All Journeys</button>
                </div>`;
        }

        container.innerHTML = hubHtml + `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; border-left:10px solid #e52e2e; padding:30px; margin-bottom:40px; white-space:pre-wrap; background:#fff; box-shadow:0 4px 15px rgba(0,0,0,0.05);"></div>`;

        const filtered = playlists.filter(p => {
            const f = currentFilter.toLowerCase().trim();
            const searchTermLower = searchTerm.toLowerCase();
            const pool = (p.title + (p.tool || "") + (p.category || "")).toLowerCase();
            
            const isAll = (f === 'all');
            const isFav = (f === 'favorites' && favorites.includes(p.courseId));
            const isToolMatch = (p.tool && p.tool.toLowerCase() === f);
            const isCatMatch = (p.category && p.category.toLowerCase() === f);

            return (isAll || isFav || isToolMatch || isCatMatch) && pool.includes(searchTermLower);
        });

        if (filtered.length === 0) {
            container.innerHTML += `<div style="grid-column:1/-1; text-align:center; padding:100px; color:#999;"><h3>No courses found in "${currentFilter}".</h3></div>`;
        }

        filtered.forEach(p => {
            const stats = getStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level.toLowerCase()}">${p.level}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% Journey Mastered (${stats.done}/${stats.total} topics)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Course Curriculum</button>
            `;
            container.appendChild(card);
        });

        loadHourlyAITip();
        if(document.getElementById('progress-count')) document.getElementById('progress-count').textContent = completed.length;
    }

    // ==========================================
    // 4. UNIFIED CLICK HANDLER (Event Delegation)
    // ==========================================
    document.addEventListener('click', async (e) => {
        const t = e.target;

        // 1. Navigation, Filters & Mega Menu Links
        const filterEl = t.closest('[data-filter]');
        if (filterEl) {
            e.preventDefault();
            if (!currentUser) return;
            currentFilter = filterEl.dataset.filter;
            
            document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
            const parentDropdown = filterEl.closest('.dropdown')?.querySelector('.nav-item');
            if (parentDropdown) parentDropdown.classList.add('active'); else filterEl.classList.add('active');
            
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // 2. Open Academy LMS Modal
        if (t.classList.contains('lms-btn')) {
            const cid = t.dataset.cid;
            const course = playlists.find(p => p.courseId === cid);
            if (!course) return;

            const listEl = document.getElementById('curriculum-list');
            listEl.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const li = document.createElement('li');
                const isChecked = completed.includes(gid);
                li.className = `lesson-item ${isChecked ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                listEl.appendChild(li);
            });
            document.getElementById('course-title-label').textContent = "Course Content: " + course.title;
            updateModalUI(course.courseId);
            document.getElementById('video-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            return;
        }

        // 3. Lesson Click (Change current video)
        if (t.classList.contains('lesson-link')) {
            const vidId = t.dataset.vid;
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vidId}?autoplay=1&origin=${window.location.origin}`;
            document.getElementById('current-lesson-title').textContent = t.textContent;
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            t.closest('.lesson-item').classList.add('active');
            return;
        }

        // 4. Progress Toggle (Checkbox)
        if (t.type === 'checkbox' && t.dataset.gid) {
            const gid = t.dataset.gid;
            const cid = gid.split('_')[0];
            completed = t.checked ? [...completed, gid] : completed.filter(id => id !== gid);
            
            await syncCloud();
            updateModalUI(cid);
            render(); // Refresh dashboard cards in the background
        }
    });

    // Sub-Logic: Updates the Progress UI inside the sidebar modal
    function updateModalUI(cid) {
        const course = playlists.find(p => p.courseId === cid);
        const stats = getStats(course);
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        
        if(bar) bar.style.width = stats.percent + '%';
        if(text) text.textContent = `${stats.percent}% Syllabus Complete`;

        const sidebarHeader = document.querySelector('.sidebar-header');
        const oldCert = document.getElementById('dl-cert-btn'); 
        if(oldCert) oldCert.remove();
        
        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.style = "background:#28a745; color:white; border:none; padding:12px; width:100%; cursor:pointer; margin-top:15px; border-radius:6px; font-weight:bold;";
            btn.innerHTML = '🎓 Download Verified Certificate';
            btn.onclick = () => {
                document.getElementById('cert-user-name').textContent = currentUser.displayName;
                document.getElementById('cert-course-name').textContent = course.title;
                document.getElementById('cert-date').textContent = "Achieved: " + new Date().toLocaleDateString();
                const certEl = document.getElementById('certificate-template');
                certEl.style.display = 'block';
                html2pdf().from(certEl).set({ margin: 0.5, filename: `Cert_${course.courseId}.pdf`, jsPDF: { orientation: 'landscape' } }).save().then(() => certEl.style.display = 'none');
            };
            sidebarHeader.appendChild(btn);
        }
    }

    // Modal Close logic
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('video-overlay').style.display = 'none';
            document.getElementById('video-player').src = ''; 
            document.body.style.overflow = 'auto'; 
        };
    }

    // Search and Input Filter
    if (searchInput) {
        searchInput.oninput = (e) => { 
            searchTerm = e.target.value.toLowerCase(); 
            render(); 
        };
    }

    if (loginBtn) loginBtn.onclick = handleLogin;
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().then(() => window.location.reload());

    loadData();
});