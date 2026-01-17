// ==========================================
// 1. FIREBASE CONFIG
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

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// App State
let playlists = []; 
let completed = JSON.parse(localStorage.getItem('ll-completed')) || [];
let currentUser = null;
let currentFilter = 'All';
let searchTerm = '';

function getCourseStats(course) {
    if (!course.videos || course.videos.length === 0) return { done: 0, total: 0, percent: 0 };
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    return { done, total: course.videos.length, percent: Math.round((done / course.videos.length) * 100) };
}

// ==========================================
// 2. MAIN LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('playlist-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Authentication Observer
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            document.getElementById('user-profile').style.display = 'flex';
            document.getElementById('user-pic').src = user.photoURL;
            loginBtn.style.display = 'none';
            // Sync cloud data
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) { completed = doc.data().completed || []; }
            } catch(e) { console.warn("Firestore access error."); }
        } else {
            document.getElementById('user-profile').style.display = 'none';
            loginBtn.style.display = 'block';
        }
        renderDashboard();
    });

    const sync = async () => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).set({ completed });
        } else {
            localStorage.setItem('ll-completed', JSON.stringify(completed));
        }
    };

    const renderDashboard = async () => {
        if (!currentUser) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:100px;"><h2>🔐 Login to Access 900+ Videos</h2><button class="auth-btn" id="lock-login-btn">Login with Google</button></div>`;
            document.getElementById('lock-login-btn').onclick = () => auth.signInWithPopup(provider);
            return;
        }

        // Fetch courses if empty
        if (playlists.length === 0) {
            const res = await fetch('data/playlists.json');
            playlists = await res.json();
        }

        container.innerHTML = `<div id="ai-tip-banner" class="stats-bar" style="grid-column:1/-1; display:none; background:#fff; padding:25px; border-left:5px solid red; margin-bottom:20px;"></div>`;
        
        // Render AI Tip
        db.collection('admin_data').doc('hourly_tip').get().then(doc => {
            if(doc.exists) {
                const banner = document.getElementById('ai-tip-banner');
                banner.style.display = 'block';
                banner.innerHTML = `<h4>💡 Expert Masterclass</h4><div style="white-space:pre-wrap;">${doc.data().content}</div>`;
            }
        });

        playlists.filter(p => currentFilter === 'All' || p.category === currentFilter || p.tool === currentFilter)
                 .forEach(p => {
            const stats = getCourseStats(p);
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="card-tag">${p.tool}</div>
                <h2>${p.title}</h2>
                <div class="card-progress"><div class="progress-fill" style="width:${stats.percent}%"></div></div>
                <p>${p.description}</p>
                <button class="lms-btn" data-cid="${p.courseId}">Open Academy</button>
            `;
            container.appendChild(card);
        });
        document.getElementById('progress-count').textContent = completed.length;
    };

    // UI Click Handler
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('lms-btn')) {
            const course = playlists.find(p => p.courseId === e.target.dataset.cid);
            const list = document.getElementById('curriculum-list');
            list.innerHTML = '';
            course.videos.forEach(v => {
                const gid = `${course.courseId}_${v.id}`;
                const li = document.createElement('li');
                li.className = `lesson-item ${completed.includes(gid) ? 'completed' : ''}`;
                li.innerHTML = `<input type="checkbox" ${completed.includes(gid) ? 'checked' : ''} data-gid="${gid}">
                                <span class="lesson-link" data-vid="${v.id}">${v.title}</span>`;
                list.appendChild(li);
            });
            document.getElementById('video-overlay').style.display = 'flex';
        }

        if (e.target.classList.contains('lesson-link')) {
            document.getElementById('video-player').src = "https://www.youtube.com/embed/" + e.target.dataset.vid + "?autoplay=1";
            document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
            e.target.parentElement.classList.add('active');
        }

        if (e.target.type === 'checkbox' && e.target.dataset.gid) {
            const gid = e.target.dataset.gid;
            completed = e.target.checked ? [...completed, gid] : completed.filter(i => i !== gid);
            await sync();
            renderDashboard();
        }

        if (e.target.closest('[data-filter]')) {
            currentFilter = e.target.closest('[data-filter]').dataset.filter;
            renderDashboard();
        }
    });

    if(loginBtn) loginBtn.onclick = () => auth.signInWithPopup(provider);
    if(logoutBtn) logoutBtn.onclick = () => auth.signOut();
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('video-overlay').style.display = 'none';
        document.getElementById('video-player').src = '';
    };
});