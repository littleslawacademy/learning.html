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

    // AI Insight Loader (Only for Logged in Users)
    async function loadHourlyAITip() {
    try {
        const doc = await db.collection('admin_data').doc('hourly_tip').get();
        if (doc.exists) {
            const data = doc.data();
            const tipEl = document.getElementById('ai-tip-banner');
            if (tipEl) {
                tipEl.style.display = 'block';
                // Update with nice icon and AI text
                tipEl.innerHTML = `💡 <b>Hourly SRE Insight:</b> ${data.content}`;
            }
        }
    } catch (e) {
        console.log("No AI Tip found yet. Run the GitHub Action manually first.");
    }
}

    if (loginBtn) {
        loginBtn.onclick = () => {
            auth.signInWithPopup(provider).catch(error => {
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
            
            // Load Cloud Progress
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                favorites = doc.data().favorites || [];
                completed = doc.data().completed || [];
            }
            // Load the AI tip now that we have a connection
            loadHourlyAITip();
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

        // Add an AI Banner Placeholder at the top if it doesn't exist
        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; background:#f0f7ff; color:#0056b3; border:1px solid #cce5ff; display:none; margin-bottom:20px; border-radius:8px; padding:15px; font-size:0.9rem;"></div>`;

        const filtered = playlists.filter(p => {
            const matchesSearch = (p.title + p.tool).toLowerCase().includes(searchTerm);
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
                <small>${stats.percent}% (${stats.done}/${stats.total} videos)</small>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Journey</button>
            `;
            container.appendChild(card);
        });
        
        // Load the AI Tip content into the placeholder we just created
        loadHourlyAITip();

        document.getElementById('progress-count').textContent = completed.length;
    }

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
        updateLMSProgress(cid);
        document.getElementById('video-overlay').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function updateLMSProgress(cid) {
        const stats = getCourseStats(playlists.find(p => p.courseId === cid));
        document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
        document.getElementById('modal-progress-text').textContent = stats.percent + '% Complete';

        const sidebarHeader = document.querySelector('.sidebar-header');
        const existingBtn = document.getElementById('dl-cert-btn');
        if (existingBtn) existingBtn.remove();

        if (stats.percent === 100) {
            const btn = document.createElement('button');
            btn.id = 'dl-cert-btn';
            btn.className = 'cert-download-btn visible';
            btn.style.display = 'block';
            btn.innerHTML = '🥇 Download My Certificate';
            btn.onclick = () => generateCertificate(playlists.find(p => p.courseId === cid).title);
            sidebarHeader.appendChild(btn);
        }
    }

   // ==========================================
    // 5. INTERACTION, MEGA MENU & CERTIFICATE
    // ==========================================

    /**
     * CERTIFICATE GENERATOR
     * Triggered when a course hits 100%
     */
    function generateCertificate(courseTitle) {
        if (!currentUser) return;

        // Set the text in the hidden certificate template
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

        // Download and then hide the template again
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
        });
    }

    /**
     * MEGA MENU / NAVBAR LISTENER
     * Handles all filtering from the top menu
     */
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.addEventListener('click', (e) => {
            const filterTarget = e.target.closest('[data-filter]');
            if (!filterTarget) return;

            e.preventDefault();
            if (!currentUser) {
                alert("Please sign in to filter by specific toolsets.");
                return;
            }

            currentFilter = filterTarget.dataset.filter;

            // UI: Update Active status for the nav link and parent dropdown
            document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
            const parentNav = filterTarget.closest('.dropdown')?.querySelector('.nav-item');
            
            if (parentNav) {
                parentNav.classList.add('active');
            } else {
                filterTarget.classList.add('active');
            }

            // Update View
            renderDashboard();

            // Mobile: Close menu automatically after selection
            if (window.innerWidth < 1000) {
                const menu = filterTarget.closest('.mega-menu') || filterTarget.closest('.dropdown-menu');
                if (menu) {
                    menu.style.display = 'none';
                    setTimeout(() => menu.style.removeProperty('display'), 500);
                }
            }
        });
    }

    /**
     * MAIN INTERACTION LISTENER
     * Handles Dashboard Buttons, Lesson Selection, and Completion Checks
     */
    document.addEventListener('click', async (e) => {
        if (!currentUser) return;

        // 1. Open Course Dashboard (LMS)
        if (e.target.classList.contains('lms-btn')) {
            openLMS(e.target.dataset.cid);
        }

        // 2. Play specific lesson in sidebar
        if (e.target.classList.contains('lesson-link')) {
            const vidId = e.target.dataset.vid;
            const player = document.getElementById('video-player');
            
            // Build safe embed URL
            player.src = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0&modestbranding=1`;
            
            document.getElementById('current-lesson-title').textContent = e.target.textContent;
            
            // Highlight current selection
            document.querySelectorAll('.lesson-item').forEach(i => i.classList.remove('active'));
            e.target.parentElement.classList.add('active');
        }

        // 3. Mark Lesson as Done (Checkbox)
        if (e.target.type === 'checkbox' && e.target.dataset.gid) {
            const gid = e.target.dataset.gid; // Format: "courseId_videoId"
            const cid = gid.split('_')[0];

            if (e.target.checked) {
                if (!completed.includes(gid)) completed.push(gid);
                e.target.closest('.lesson-item').classList.add('completed');
            } else {
                completed = completed.filter(i => i !== gid);
                e.target.closest('.lesson-item').classList.remove('completed');
            }

            // Sync with Cloud
            await syncCloud();
            // Update UI
            updateLMSProgress(cid);
            renderDashboard(); 
        }
    });

    /**
     * SEARCH & UTILITIES
     */
    if (searchInput) {
        searchInput.oninput = (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderDashboard();
        };
    }

    // Modal Close logic
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('video-overlay').style.display = 'none';
            document.getElementById('video-player').src = ''; // Kill video stream
            document.body.style.overflow = 'auto'; // Unlock background scroll
        };
    }

    // Close on overlay background click
    const overlay = document.getElementById('video-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeBtn.onclick();
            }
        });
    }
    
    // Final check for initial load
    loadData();
});