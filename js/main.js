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

// Helper: Calculate 0-100% stats for a journey
function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const total = course.videos.length;
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
}

// ==========================================
// 3. INITIALIZATION & AUTH
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const searchInput = document.getElementById('search-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userPic = document.getElementById('user-pic');
    const navItems = document.querySelectorAll('[data-filter]');

    const loadData = async () => {
        try {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
            renderDashboard();
        } catch (e) { console.error("Data error:", e); }
    };
    loadData();

    if (loginBtn) {
        loginBtn.onclick = () => {
            auth.signInWithPopup(provider).catch(error => {
                console.warn("Popup blocked, trying redirect...");
                auth.signInWithRedirect(provider);
            });
        };
    }

    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            loginBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            userPic.src = user.photoURL;
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                favorites = doc.data().favorites || [];
                completed = doc.data().completed || [];
            }
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userProfile.style.display = 'none';
        }
        renderDashboard();
    });

    const syncCloud = async () => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
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
            <div style="grid-column:1/-1; text-align:center; padding:50px;">
                <h1>🔐 Performance Academy Access</h1>
                <p>Sign in with your Google account to access 900+ lessons and your personal tracking dashboard.</p>
                <button class="auth-btn" style="margin-top:20px" onclick="auth.signInWithPopup(provider)">Join Now</button>
            </div>`;
            return;
        }

        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
            if (currentFilter === 'Favorites') return favorites.includes(p.courseId) && matchesSearch;
            return (currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter) && matchesSearch;
        });

        container.innerHTML = '';
        filtered.forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool} <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span></div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
                <small>${stats.percent}% (${stats.done}/${stats.total} videos)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Journey</button>
            `;
            container.appendChild(card);
        });
        document.getElementById('progress-count').textContent = completed.length;
    }

    function openLMS(cid) {
        const course = playlists.find(p => p.courseId === cid);
        if(!course) return;

        const list = document.getElementById('curriculum-list');
        list.innerHTML = '';
        
        course.videos.forEach(v => {
            const gid = `${cid}_${v.id}`;
            const isChecked = completed.includes(gid);
            const li = document.createElement('li');
            li.className = `lesson-item ${isChecked ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${isChecked ? 'checked' : ''} data-gid="${gid}">
                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>
            `;
            list.appendChild(li);
        });

        document.getElementById('course-title-label').textContent = course.title;
        updateLMSProgress(cid);
        document.getElementById('video-overlay').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function updateLMSProgress(cid) {
        const course = playlists.find(p => p.courseId === cid);
        const stats = getCourseStats(course);
        const bar = document.getElementById('modal-progress-bar');
        const text = document.getElementById('modal-progress-text');
        
        if (bar) bar.style.width = stats.percent + '%';
        if (text) text.textContent = `${stats.percent}% Complete`;

        // CERTIFICATE BUTTON LOGIC
        const sidebarHeader = document.querySelector('.sidebar-header');
        const existingBtn = document.getElementById('dl-cert-btn');
        if (existingBtn) existingBtn.remove();

        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.innerHTML = '🥇 Download My Certificate';
            btn.onclick = () => generateCertificate(course.title);
            sidebarHeader.appendChild(btn);
        }
    }

    // ==========================================
    // 5. INTERACTION & CERTIFICATE
    // ==========================================
    function generateCertificate(courseTitle) {
        document.getElementById('cert-user-name').textContent = currentUser.displayName;
        document.getElementById('cert-course-name').textContent = courseTitle;
        document.getElementById('cert-date').textContent = new Date().toLocaleDateString();

        const element = document.getElementById('certificate-template');
        element.style.display = 'block';

        const opt = {
            margin: 0.5,
            filename: `${courseTitle.replace(/\s+/g, '_')}_Certificate.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
        });
    }

    document.addEventListener('click', async (e) => {
        // Handle course card click
        if (e.target.classList.contains('lms-btn')) {
            openLMS(e.target.dataset.cid);
        }

        // Handle clicking a specific video title in the sidebar
        if (e.target.classList.contains('lesson-link')) {
            const vidId = e.target.dataset.vid;
            const player = document.getElementById('video-player');
            player.src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0`;
            document.getElementById('current-lesson-title').textContent = e.target.textContent;
            
            // Highlight active lesson
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            e.target.closest('.lesson-item').classList.add('active');
        }

        // Handle checking off a video
        if (e.target.type === 'checkbox' && e.target.dataset.gid) {
            const gid = e.target.dataset.gid;
            const cid = gid.split('_')[0];
            
            if (e.target.checked) {
                if (!completed.includes(gid)) completed.push(gid);
                e.target.closest('.lesson-item').classList.add('completed');
            } else {
                completed = completed.filter(id => id !== gid);
                e.target.closest('.lesson-item').classList.remove('completed');
            }
            
            await syncCloud();
            updateLMSProgress(cid);
            renderDashboard(); // Update progress bar on background home screen
        }
    });

    // Modal Close
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
        document.body.style.overflow = 'auto';
    };

    // Filter and Search inputs
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
});