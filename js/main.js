// --- CALCULATE PROGRESS ---
function getCourseStats(course) {
    const total = course.videos.length;
    // We store progress in completed array as "courseId_videoId"
    const done = course.videos.filter(v => completed.includes(`${course.courseId}_${v.id}`)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
}

// --- RENDER BOOTCAMP CARDS ---
function renderCards(items) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    
    if (!currentUser) { /* Show login lock screen */ return; }

    items.forEach(p => {
        const stats = getCourseStats(p);
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <div class="card-tag">${p.tool}</div>
            <h2>${p.title}</h2>
            <div class="card-progress">
                <div class="progress-fill" style="width: ${stats.percent}%"></div>
            </div>
            <small>${stats.percent}% (${stats.done}/${stats.total} lessons)</small>
            <p>${p.description}</p>
            <button class="open-lms-btn" data-id="${p.courseId}">▶ Open Academy Dashboard</button>
        `;
        container.appendChild(card);
    });
}

// --- OPEN THE LMS DASHBOARD ---
function openLMS(courseId) {
    const course = playlists.find(p => p.courseId === courseId);
    const curriculumList = document.getElementById('curriculum-list');
    curriculumList.innerHTML = '';

    course.videos.forEach(vid => {
        const globalId = `${courseId}_${vid.id}`;
        const isWatched = completed.includes(globalId);
        
        const li = document.createElement('li');
        li.className = 'lesson-item';
        li.innerHTML = `
            <input type="checkbox" ${isWatched ? 'checked' : ''} data-gid="${globalId}">
            <span class="lesson-title" data-vid="${vid.id}">${vid.title}</span>
        `;
        
        // Switch Video logic
        li.querySelector('.lesson-title').onclick = () => {
            document.getElementById('video-player').src = `https://www.youtube.com/embed/${vid.id}?autoplay=1`;
            document.getElementById('current-lesson-title').textContent = vid.title;
            document.querySelectorAll('.lesson-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
        };
        
        curriculumList.appendChild(li);
    });

    const stats = getCourseStats(course);
    document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
    document.getElementById('modal-progress-text').textContent = stats.percent + '% Complete';
    document.getElementById('video-overlay').style.display = 'flex';
}

// --- CLICK HANDLER FOR CHECKBOXES & BUTTONS ---
document.addEventListener('click', async (e) => {
    // 1. Open Dashboard
    if (e.target.classList.contains('open-lms-btn')) {
        openLMS(e.target.dataset.id);
    }

    // 2. Mark specific lesson as done
    if (e.target.type === 'checkbox' && e.target.dataset.gid) {
        const gid = e.target.dataset.gid;
        if (e.target.checked) {
            completed.push(gid);
        } else {
            completed = completed.filter(id => id !== gid);
        }
        
        // Sync to Firebase
        await db.collection('users').doc(currentUser.uid).set({ favorites, completed });
        
        // Update Modal Progress
        const courseId = gid.split('_')[0];
        const course = playlists.find(p => p.courseId === courseId);
        const stats = getCourseStats(course);
        document.getElementById('modal-progress-bar').style.width = stats.percent + '%';
        document.getElementById('modal-progress-text').textContent = stats.percent + '% Complete';
        
        // Update Home Screen Cards
        renderCards(playlists);
    }
});