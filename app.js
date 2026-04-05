/* =============================================
   WebTruyện - Frontend Application
   ============================================= */

const API_BASE = 'https://backendapi-production-5207.up.railway.app';
const THUMB_CDN = 'https://img.otruyenapi.com/uploads/comics/';

// =============================================
// INTRO SCREEN FUNCTIONALITY
// =============================================
let introAnimationComplete = false;

// Check if user has seen intro before
function hasSeenIntro() {
    return localStorage.getItem('wt_intro_seen') === 'true';
}

// Mark intro as seen
function markIntroSeen() {
    localStorage.setItem('wt_intro_seen', 'true');
}

// Skip intro animation
function skipIntro() {
    const introScreen = document.getElementById('intro-screen');
    if (introScreen) {
        introAnimationComplete = true;
        markIntroSeen();
        introScreen.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Remove intro screen from DOM after transition
        setTimeout(() => {
            introScreen.remove();
        }, 1000);
    }
}

// Animate loading progress
function animateLoadingProgress() {
    const progressBar = document.getElementById('intro-progress');
    const percentageText = document.getElementById('intro-percentage');
    
    if (!progressBar || !percentageText) return;
    
    let progress = 0;
    const duration = 3000; // 3 seconds
    const steps = 60;
    const increment = 100 / steps;
    const stepDuration = duration / steps;
    
    const interval = setInterval(() => {
        progress += increment + Math.random() * 5;
        if (progress > 100) progress = 100;
        
        progressBar.style.width = progress + '%';
        percentageText.textContent = Math.floor(progress) + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                showEnterButton();
            }, 500);
        }
    }, stepDuration);
}

// Show enter button
function showEnterButton() {
    const enterBtn = document.getElementById('intro-enter-btn');
    if (enterBtn) {
        enterBtn.style.opacity = '1';
        enterBtn.style.pointerEvents = 'auto';
        enterBtn.style.animation = 'bounceIn 1s ease-out both, pulseGlow 2s ease-in-out infinite';
    }
}

// Initialize intro screen
function initIntroScreen() {
    // If user has seen intro before, skip it
    if (hasSeenIntro()) {
        const introScreen = document.getElementById('intro-screen');
        if (introScreen) {
            introScreen.remove();
        }
        document.body.style.overflow = 'auto';
        return;
    }
    
    // Prevent body scroll during intro
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    const enterBtn = document.getElementById('intro-enter-btn');
    const skipBtn = document.getElementById('intro-skip-btn');
    
    if (enterBtn) {
        enterBtn.addEventListener('click', skipIntro);
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', skipIntro);
    }
    
    // Start loading animation after logo animation
    setTimeout(() => {
        animateLoadingProgress();
    }, 6000);
    
    // Auto-skip after 12 seconds if user doesn't interact
    setTimeout(() => {
        if (!introAnimationComplete) {
            skipIntro();
        }
    }, 12000);
}

// Add floating elements animation
function initFloatingElements() {
    const floatingElements = document.querySelectorAll('.floating-shape');
    floatingElements.forEach((element, index) => {
        // Mouse interaction
        element.addEventListener('mouseenter', () => {
            const currentAnimation = element.style.animation;
            element.style.animation = 'wobble 0.6s ease-in-out';
            setTimeout(() => {
                element.style.animation = currentAnimation;
            }, 600);
        });
        
        // Click interaction
        element.addEventListener('click', () => {
            const currentAnimation = element.style.animation;
            element.style.animation = 'bounce 1s ease-in-out';
            setTimeout(() => {
                element.style.animation = currentAnimation;
            }, 1000);
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initIntroScreen();
    initFloatingElements();
});

// =============================================
// STATE
// =============================================
let state = {
    currentPage: 'home',
    comicsPage: 1,
    totalPages: 1,
    genres: [],
    currentComicId: null,
    token: localStorage.getItem('wt_token') || null,
    user: null,
    searchDebounce: null,
    followedComics: new Set(),
};

// =============================================
// API HELPERS
// =============================================
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : {};
        // Normalize .NET $values format (ReferenceHandler.Preserve)
        return (parsed && parsed.$values) ? parsed.$values : parsed;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

// =============================================
// THUMBNAIL HELPER
// =============================================
function getThumbUrl(thumbFile) {
    if (!thumbFile) return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" fill="%231a1f2e"><rect width="200" height="280"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%2364748b" font-size="14">No Image</text></svg>';
    if (thumbFile.startsWith('http')) return thumbFile;
    return `${THUMB_CDN}${thumbFile}`;
}

function getLatestChapter(chaptersLatestStr) {
    try {
        const arr = JSON.parse(chaptersLatestStr);
        if (arr && arr.length > 0) return arr[0];
    } catch {}
    return null;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// =============================================
// NAVIGATION
// =============================================
function navigateTo(page, params = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    state.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (page === 'home' && params.reload !== false) {
        loadComics(state.comicsPage);
    }
    if (page === 'follows') {
        loadFollows();
    }
}

// =============================================
// SKELETON LOADING
// =============================================
function showSkeletons(containerId, count = 20) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-thumb"></div>
                <div class="skeleton-text skeleton" style="width:80%"></div>
                <div class="skeleton-text skeleton-text-sm skeleton"></div>
            </div>
        `;
    }
}

// =============================================
// RENDER COMICS
// =============================================
function renderComicCard(comic) {
    const latest = getLatestChapter(comic.chaptersLatest);
    const chapterText = latest ? `Chap ${latest.chapter_name}` : '';
    const comicId = comic.comicId || comic.id || comic._id;
    
    return `
        <div class="comic-card" onclick="openComicDetail('${comicId}')">
            <div class="comic-card-thumb">
                <img src="${getThumbUrl(comic.thumbUrl)}" alt="${comic.name}" loading="lazy" 
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22 fill=%22%231a1f2e%22><rect width=%22200%22 height=%22280%22/><text x=%2250%%25%22 y=%2250%%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2364748b%22 font-size=%2214%22>No Image</text></svg>'">
                ${chapterText ? `<span class="comic-chapter-badge">${chapterText}</span>` : ''}
                <div class="comic-card-overlay">
                    <span>👁 Đọc ngay</span>
                </div>
            </div>
            <div class="comic-card-info">
                <div class="comic-card-name">${comic.name}</div>
                <div class="comic-card-meta">${timeAgo(comic.updatedAt)}</div>
            </div>
        </div>
    `;
}

// =============================================
// LOAD COMICS (HOME)
// =============================================
async function loadComics(page = 1) {
    showSkeletons('comics-grid');
    try {
        const data = await apiFetch(`/api/Comics/page?page=${page}`);
        const container = document.getElementById('comics-grid');
        const comics = Array.isArray(data) ? data : [];
        
        if (comics.length > 0) {
            container.innerHTML = comics.map(renderComicCard).join('');
            state.comicsPage = page;
            // Show pagination if full page returned (backend pageSize = 20)
            const estimatedTotal = comics.length === 20 ? page + 1 : page;
            renderPagination('pagination-home', estimatedTotal, page, (p) => {
                state.comicsPage = p;
                loadComics(p);
            });
            
            // Update stats
            document.getElementById('stat-comics').textContent = formatNumber(comics.length);
        } else {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📚</span><p>Chưa có truyện nào</p></div>';
        }
    } catch (err) {
        document.getElementById('comics-grid').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Lỗi kết nối server</p></div>';
    }
}

// =============================================
// PAGINATION
// =============================================
function renderPagination(containerId, totalPages, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    
    let html = '';
    
    // Previous
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="event.preventDefault();" data-page="${currentPage - 1}">‹</button>`;
    
    // Page numbers
    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    
    if (start > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (start > 2) html += `<span class="page-btn" style="border:none;background:none;cursor:default">...</span>`;
    }
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span class="page-btn" style="border:none;background:none;cursor:default">...</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Next
    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
    
    container.innerHTML = html;
    
    // Attach events
    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page);
            if (p >= 1 && p <= totalPages) onPageChange(p);
        });
    });
}

// =============================================
// GENRES
// =============================================
async function loadGenres() {
    try {
        const genres = await apiFetch('/api/Genres');
        state.genres = genres;
        
        // Render genre dropdown
        const dropdownMenu = document.getElementById('genre-menu');
        dropdownMenu.innerHTML = genres.map(g => 
            `<a href="#" onclick="loadGenre('${g.genreId}', '${g.name}')">${g.name}</a>`
        ).join('');
        
        // Render genre tags on home
        const tagsContainer = document.getElementById('genre-tags');
        tagsContainer.innerHTML = genres.slice(0, 20).map(g => 
            `<span class="genre-tag" onclick="loadGenre('${g.genreId}', '${g.name}')">${g.name}</span>`
        ).join('');
        
        document.getElementById('stat-genres').textContent = genres.length;
    } catch (err) {
        console.error('Load genres error:', err);
    }
}

async function loadGenre(genreId, genreName) {
    navigateTo('genre');
    document.getElementById('genre-page-title').textContent = `📂 ${genreName}`;
    showSkeletons('genre-results');
    
    try {
        const comics = await apiFetch(`/api/Comics/Genre/${genreId}`);
        const container = document.getElementById('genre-results');
        if (comics && comics.length > 0) {
            container.innerHTML = comics.map(renderComicCard).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📂</span><p>Chưa có truyện trong thể loại này</p></div>';
        }
    } catch (err) {
        document.getElementById('genre-results').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Lỗi kết nối</p></div>';
    }
}

// =============================================
// SEARCH
// =============================================
function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    performSearch(query);
}

function heroSearch() {
    const query = document.getElementById('hero-search-input').value.trim();
    if (!query) return;
    performSearch(query);
}

async function performSearch(keyword) {
    navigateTo('search');
    document.getElementById('search-query-text').textContent = `Kết quả cho: "${keyword}"`;
    document.getElementById('loading-search').style.display = 'flex';
    document.getElementById('empty-search').style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
    
    try {
        const results = await apiFetch(`/api/Comics/search?keyword=${encodeURIComponent(keyword)}`);
        document.getElementById('loading-search').style.display = 'none';
        
        if (results && results.length > 0) {
            document.getElementById('search-results').innerHTML = results.map(renderComicCard).join('');
        } else {
            document.getElementById('empty-search').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('loading-search').style.display = 'none';
        document.getElementById('empty-search').style.display = 'block';
    }
}

// Live search suggestions
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(state.searchDebounce);
            const val = e.target.value.trim();
            if (val.length < 2) {
                document.getElementById('search-suggestions').classList.remove('active');
                return;
            }
            state.searchDebounce = setTimeout(async () => {
                try {
                    const results = await apiFetch(`/api/Comics/search?keyword=${encodeURIComponent(val)}`);
                    const sugContainer = document.getElementById('search-suggestions');
                    if (results && results.length > 0) {
                        sugContainer.innerHTML = results.slice(0, 6).map(c => {
                            const cid = c.comicId || c.id || c._id;
                            return `
                                <div class="search-suggestion-item" onclick="openComicDetail('${cid}')">
                                    <img src="${getThumbUrl(c.thumbUrl)}" alt="${c.name}" onerror="this.style.display='none'">
                                    <span>${c.name}</span>
                                </div>
                            `;
                        }).join('');
                        sugContainer.classList.add('active');
                    } else {
                        sugContainer.classList.remove('active');
                    }
                } catch {}
            }, 300);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('search-suggestions').classList.remove('active');
                handleSearch();
            }
        });
    }
    
    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            document.getElementById('search-suggestions').classList.remove('active');
        }
    });
});

// =============================================
// COMIC DETAIL
// =============================================
async function openComicDetail(comicId) {
    state.currentComicId = comicId;
    navigateTo('detail');
    
    document.getElementById('comic-detail').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải...</p></div>';
    document.getElementById('chapters-section').innerHTML = '';
    document.getElementById('comments-section').innerHTML = '';
    
    try {
        const comic = await apiFetch(`/api/Comics/${comicId}`);
        renderComicDetail(comic);
        loadChapters(comicId);
        loadComments(comicId);
    } catch (err) {
        document.getElementById('comic-detail').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Không thể tải thông tin truyện</p></div>';
    }
}

function renderComicDetail(comic) {
    const banner = document.getElementById('detail-banner');
    banner.style.backgroundImage = `url(${getThumbUrl(comic.thumbUrl)})`;
    banner.style.filter = 'blur(2px)';
    banner.style.transform = 'scale(1.05)';
    
    const latest = getLatestChapter(comic.chaptersLatest);
    const isFollowed = state.followedComics.has(comic.comicId);
    
    document.getElementById('comic-detail').innerHTML = `
        <div class="comic-detail-cover">
            <img src="${getThumbUrl(comic.thumbUrl)}" alt="${comic.name}" 
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22 fill=%22%231a1f2e%22><rect width=%22200%22 height=%22280%22/></svg>'">
        </div>
        <div class="comic-detail-info">
            <h1 class="comic-detail-name">${comic.name}</h1>
            ${comic.originName ? `<p class="comic-detail-origin">${comic.originName}</p>` : ''}
            <div class="comic-detail-badges">
                <span class="badge badge-status">${comic.status || 'Đang cập nhật'}</span>
                ${latest ? `<span class="badge badge-chapter">Chap ${latest.chapter_name}</span>` : ''}
            </div>
            <div class="comic-detail-actions">
                ${comic.chapters && comic.chapters.length > 0 ? `
                    <button class="btn btn-primary" onclick="readFirstChapter('${comic.comicId}')">📖 Đọc Ngay</button>
                ` : ''}
                ${state.token ? `
                    <button class="btn-follow ${isFollowed ? 'following' : ''}" id="follow-btn" onclick="toggleFollow('${comic.comicId}')">
                        ${isFollowed ? '❤️ Đang Theo Dõi' : '🤍 Theo Dõi'}
                    </button>
                ` : ''}
            </div>
            <p class="comic-detail-updated">🕐 Cập nhật: ${timeAgo(comic.updatedAt)}</p>
        </div>
    `;
}

// =============================================
// CHAPTERS
// =============================================
async function loadChapters(comicId) {
    try {
        const chapters = await apiFetch(`/api/Chapters/Comic/${comicId}`);
        const section = document.getElementById('chapters-section');
        
        if (chapters && chapters.length > 0) {
            // Sort by chapterIndex desc
            chapters.sort((a, b) => (b.chapterIndex || 0) - (a.chapterIndex || 0));
            
            section.innerHTML = `
                <h3 class="chapters-title">📑 Danh Sách Chương (${chapters.length})</h3>
                <div class="chapters-list">
                    ${chapters.map(ch => `
                        <div class="chapter-item" onclick="readChapter('${comicId}', '${ch.chapterApiData || ''}', '${(ch.chapterName || '').replace(/'/g, "\\'")}')">
                            <div>
                                <div class="chapter-item-name">${ch.chapterName || `Chương ${ch.chapterIndex}`}</div>
                                ${ch.chapterTitle ? `<div class="chapter-item-title">${ch.chapterTitle}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('stat-chapters').textContent = formatNumber(chapters.length);
        }
    } catch (err) {
        console.error('Load chapters error:', err);
    }
}

function readFirstChapter(comicId) {
    const firstChapter = document.querySelector('.chapter-item:last-child');
    if (firstChapter) firstChapter.click();
}

async function readChapter(comicId, apiUrl, chapterName) {
    if (!apiUrl) {
        showToast('Chương này chưa có dữ liệu', 'error');
        return;
    }
    
    navigateTo('reading');
    document.getElementById('reading-title').textContent = chapterName || 'Đang tải...';
    document.getElementById('reading-content').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải trang truyện...</p></div>';
    
    try {
        const res = await fetch(apiUrl, {});
        const data = await res.json();
        
        if (data.data && data.data.item) {
            const item = data.data.item;
            const domain = data.data.domain_cdn || 'https://sv1.otruyencdn.com';
            const chapterPath = item.chapter_path;
            const images = item.chapter_image || [];
            
            document.getElementById('reading-title').textContent = item.chapter_name || chapterName;
            document.getElementById('reading-content').innerHTML = images.map(img => 
                `<img src="${domain}/${chapterPath}/${img.image_file}" alt="Page ${img.image_page}" loading="lazy" 
                    onerror="this.style.display='none'">`
            ).join('');
        } else {
            document.getElementById('reading-content').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Không thể tải trang truyện</p></div>';
        }
    } catch (err) {
        document.getElementById('reading-content').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Lỗi kết nối CDN</p></div>';
    }
}

// =============================================
// COMMENTS
// =============================================
async function loadComments(comicId) {
    try {
        const comments = await apiFetch(`/api/comments/comic/${comicId}`);
        const section = document.getElementById('comments-section');
        
        section.innerHTML = `
            <h3 class="comments-title">💬 Bình Luận (${comments ? comments.length : 0})</h3>
            ${state.token ? `
                <div class="comment-form">
                    <input type="text" id="comment-input" placeholder="Viết bình luận..." 
                        onkeypress="if(event.key==='Enter') postComment('${comicId}')">
                    <button class="btn btn-primary" onclick="postComment('${comicId}')">Gửi</button>
                </div>
            ` : '<p style="color:var(--text-muted);margin-bottom:1rem;font-size:0.9rem;">Đăng nhập để bình luận</p>'}
            <div class="comment-list">
                ${comments && comments.length > 0 ? comments.map(c => `
                    <div class="comment-item">
                        <div class="comment-avatar">${(c.account?.userName || 'U')[0].toUpperCase()}</div>
                        <div class="comment-body">
                            <div class="comment-author">${c.account?.userName || 'Người dùng'}</div>
                            <div class="comment-content">${escapeHtml(c.content || '')}</div>
                            <div class="comment-time">${timeAgo(c.createdAt)}</div>
                        </div>
                    </div>
                `).join('') : '<p style="color:var(--text-muted);font-size:0.9rem;">Chưa có bình luận nào</p>'}
            </div>
        `;
    } catch (err) {
        console.error('Load comments error:', err);
    }
}

async function postComment(comicId) {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;
    
    try {
        await apiFetch('/api/comments', {
            method: 'POST',
            body: JSON.stringify({ comicId, content }),
        });
        input.value = '';
        showToast('Đã gửi bình luận!', 'success');
        loadComments(comicId);
    } catch (err) {
        showToast('Lỗi gửi bình luận', 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// FOLLOW
// =============================================
async function toggleFollow(comicId) {
    if (!state.token) {
        showToast('Vui lòng đăng nhập', 'info');
        showModal('login');
        return;
    }
    
    const isFollowed = state.followedComics.has(comicId);
    try {
        if (isFollowed) {
            await apiFetch(`/api/follows/${comicId}`, { method: 'DELETE' });
            state.followedComics.delete(comicId);
            showToast('Đã bỏ theo dõi', 'info');
        } else {
            await apiFetch(`/api/follows/${comicId}`, { method: 'POST' });
            state.followedComics.add(comicId);
            showToast('Đã theo dõi truyện!', 'success');
        }
        
        // Update button
        const btn = document.getElementById('follow-btn');
        if (btn) {
            const nowFollowed = state.followedComics.has(comicId);
            btn.className = `btn-follow ${nowFollowed ? 'following' : ''}`;
            btn.innerHTML = nowFollowed ? '❤️ Đang Theo Dõi' : '🤍 Theo Dõi';
        }
    } catch (err) {
        showToast('Lỗi thao tác', 'error');
    }
}

async function loadFollows() {
    if (!state.token) {
        document.getElementById('follows-grid').innerHTML = '';
        document.getElementById('empty-follows').style.display = 'block';
        document.getElementById('empty-follows').querySelector('p').textContent = 'Vui lòng đăng nhập để xem truyện theo dõi';
        return;
    }
    
    document.getElementById('loading-follows').style.display = 'flex';
    document.getElementById('empty-follows').style.display = 'none';
    document.getElementById('follows-grid').innerHTML = '';
    
    try {
        const follows = await apiFetch('/api/follows/my');
        document.getElementById('loading-follows').style.display = 'none';
        
        if (follows && follows.length > 0) {
            state.followedComics = new Set(follows.map(f => f.comicId));
            document.getElementById('follows-grid').innerHTML = follows.map(f => `
                <div class="comic-card" onclick="openComicDetail('${f.comicId}')">
                    <div class="comic-card-thumb">
                        <img src="${getThumbUrl(f.thumbUrl)}" alt="${f.name}" loading="lazy"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22 fill=%22%231a1f2e%22><rect width=%22200%22 height=%22280%22/></svg>'">
                        <div class="comic-card-overlay"><span>👁 Đọc ngay</span></div>
                    </div>
                    <div class="comic-card-info">
                        <div class="comic-card-name">${f.name}</div>
                        <div class="comic-card-meta">${timeAgo(f.followedAt)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('empty-follows').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('loading-follows').style.display = 'none';
        document.getElementById('empty-follows').style.display = 'block';
    }
}

// =============================================
// AUTH
// =============================================
function showModal(type) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('auth-modal').classList.add('active');
    
    document.getElementById('login-form').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = type === 'register' ? 'block' : 'none';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('auth-modal').classList.remove('active');
}

async function handleLogin() {
    const loginName = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!loginName || !password) {
        showToast('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const data = await apiFetch('/api/Auth/login', {
            method: 'POST',
            body: JSON.stringify({ loginName, password }),
        });
        
        if (data.token) {
            state.token = data.token;
            localStorage.setItem('wt_token', data.token);
            showToast('Đăng nhập thành công!', 'success');
            closeModal();
            loadCurrentUser();
            loadFollowedIds();
        } else if (data.message) {
            showToast(data.message, 'error');
        } else {
            // Some APIs return the token directly
            if (typeof data === 'string') {
                state.token = data;
                localStorage.setItem('wt_token', data);
                showToast('Đăng nhập thành công!', 'success');
                closeModal();
                loadCurrentUser();
                loadFollowedIds();
            } else {
                showToast('Sai thông tin đăng nhập', 'error');
            }
        }
    } catch (err) {
        showToast('Đăng nhập thất bại', 'error');
    }
}

async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const userName = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    
    if (!email || !userName || !password) {
        showToast('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const data = await apiFetch('/api/Auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, userName, password }),
        });
        showToast('Đăng ký thành công! Hãy đăng nhập.', 'success');
        showModal('login');
    } catch (err) {
        showToast('Đăng ký thất bại', 'error');
    }
}

async function loadCurrentUser() {
    if (!state.token) return;
    try {
        const user = await apiFetch('/api/Auth/me');
        state.user = user;
        updateUserUI();
    } catch (err) {
        // Token expired
        state.token = null;
        localStorage.removeItem('wt_token');
        updateUserUI();
    }
}

function updateUserUI() {
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const navAdmin = document.getElementById('nav-admin');
    const mobileNavAdmin = document.getElementById('mobile-nav-admin');
    const navFollows = document.getElementById('nav-follows');
    const mobileNavFollows = document.getElementById('mobile-nav-follows');
    
    // Default admin and follows links to hidden
    if (navAdmin) navAdmin.style.display = 'none';
    if (mobileNavAdmin) mobileNavAdmin.style.display = 'none';
    if (navFollows) navFollows.style.display = 'none';
    if (mobileNavFollows) mobileNavFollows.style.display = 'none';
    
    if (state.user && state.token) {
        authBtns.style.display = 'none';
        userMenu.style.display = 'block';
        
        // Show follows link for all logged-in users
        if (navFollows) navFollows.style.display = 'block';
        if (mobileNavFollows) mobileNavFollows.style.display = 'block';
        document.getElementById('user-name-display').textContent = state.user.userName || state.user.mail || 'User';
        const avatar = document.getElementById('user-avatar-img');
        if (state.user.image) {
            avatar.src = state.user.image;
            avatar.style.display = 'block';
        } else {
            avatar.style.display = 'none';
        }
        
        // Admin verification logic
        const userRole = typeof state.user.role === 'string' ? state.user.role.toLowerCase() : '';
        const userRoles = Array.isArray(state.user.roles) ? state.user.roles.map(r => r.toLowerCase()) : [];
        const isUserAdmin = 
            userRole === 'admin' || 
            userRoles.includes('admin') || 
            state.user.isAdmin === true || 
            (state.user.userName && state.user.userName.toLowerCase() === 'admin') ||
            (state.user.mail && state.user.mail.toLowerCase().startsWith('admin'));
            
        if (isUserAdmin) {
            if (navAdmin) navAdmin.style.display = 'block';
            if (mobileNavAdmin) mobileNavAdmin.style.display = 'block';
        }
    } else {
        authBtns.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

function toggleUserDropdown() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

function logout() {
    state.token = null;
    state.user = null;
    state.followedComics.clear();
    localStorage.removeItem('wt_token');
    updateUserUI();
    showToast('Đã đăng xuất', 'info');
    navigateTo('home');
}

// =============================================
// AVATAR UPLOAD
// =============================================
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chọn file hình ảnh hợp lệ', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        // Update local UI
        const avatarImg = document.getElementById('user-avatar-img');
        if (avatarImg) {
            avatarImg.src = base64;
            avatarImg.style.display = 'block';
        }
        if (state.user) {
            state.user.image = base64;
        }
        showToast('Đã đổi avatar thành công!', 'success');
        
        try {
            await apiFetch('/api/Auth/update-avatar', {
                method: 'POST',
                body: JSON.stringify({ image: base64 })
            });
        } catch (err) {}
    };
    reader.readAsDataURL(file);
}

async function loadFollowedIds() {
    if (!state.token) return;
    try {
        const follows = await apiFetch('/api/follows/my');
        if (follows) {
            state.followedComics = new Set(follows.map(f => f.comicId));
        }
    } catch {}
}

// Close user dropdown on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown').classList.remove('active');
    }
});

// =============================================
// MOBILE MENU
// =============================================
function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('active');
    document.getElementById('mobile-menu-overlay').classList.toggle('active');
}

// =============================================
// TOAST
// =============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// =============================================
// PROFILE PAGE
// =============================================
async function openProfile() {
    if (!state.user || !state.token) {
        showToast('Vui lòng đăng nhập trước', 'info');
        showModal('login');
        return;
    }
    
    navigateTo('profile');
    document.getElementById('profile-content').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải dữ liệu...</p></div>';
    
    try {
        const user = state.user; // Already fetched by loadCurrentUser
        let totalFollows = state.followedComics ? state.followedComics.size : 0;
        
        const joinDate = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Không rõ';

        const roleLabel = (user.role === 'ADMIN' || user.roles?.includes('ADMIN')) ? 'Admin' : 'Thành viên';
        const roleClass = (user.role === 'ADMIN' || user.roles?.includes('ADMIN')) ? 'admin' : '';
        const statusLabel = user.banned ? '🔴 Bị cấm' : '🟢 Đang hoạt động';

        document.getElementById('profile-content').innerHTML = `
            <div class="profile-header-card">
                <div class="profile-avatar-large" onclick="document.getElementById('avatar-upload').click()" title="Đổi Avatar">
                    ${user.image ? `<img src="${user.image}" alt="avatar">` : (user.userName || 'U')[0].toUpperCase()}
                </div>
                <div class="profile-header-info">
                    <div class="profile-name-lg">${user.userName || 'Người dùng'}</div>
                    <div class="profile-email-badge">✉️ ${user.mail || user.email || '—'}</div>
                    <br>
                    <span class="profile-role-badge ${roleClass}">${roleLabel}</span>
                </div>
            </div>

            <div class="profile-stats-container">
                <div class="profile-stat-box">
                    <div class="profile-stat-icon">📖</div>
                    <div class="profile-stat-number">${totalFollows}</div>
                    <div class="profile-stat-text">Truyện đang theo dõi</div>
                </div>
                <div class="profile-stat-box">
                    <div class="profile-stat-icon">📅</div>
                    <div class="profile-stat-number" style="font-size:1.25rem; margin-top:0.5rem; margin-bottom:0.75rem">${joinDate}</div>
                    <div class="profile-stat-text">Ngày tham gia</div>
                </div>
                <div class="profile-stat-box">
                    <div class="profile-stat-icon">⭐</div>
                    <div class="profile-stat-number" style="font-size:1.1rem; margin-top:0.6rem; margin-bottom:0.8rem">${statusLabel}</div>
                    <div class="profile-stat-text">Trạng thái</div>
                </div>
            </div>

            <h3 style="margin-bottom:1.5rem; font-size:1.25rem">📋 Thông Tin Chi Tiết</h3>
            <div class="profile-details-grid">
                <div class="profile-detail-item">
                    <div class="profile-detail-icon">👤</div>
                    <div class="profile-detail-info">
                        <h4>Tên đăng nhập</h4>
                        <p>${user.userName || '—'}</p>
                    </div>
                </div>
                <div class="profile-detail-item">
                    <div class="profile-detail-icon">📧</div>
                    <div class="profile-detail-info">
                        <h4>Email</h4>
                        <p>${user.mail || user.email || '—'}</p>
                    </div>
                </div>
                <div class="profile-detail-item">
                    <div class="profile-detail-icon">🆔</div>
                    <div class="profile-detail-info">
                        <h4>ID Tài Khoản</h4>
                        <p style="font-family:monospace; font-size:0.85rem">${user.accountId || user.id || '—'}</p>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        document.getElementById('profile-content').innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Không thể tải thông tin</p></div>';
    }
}

// =============================================
// HEADER SCROLL
// =============================================
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load genres
    await loadGenres();
    
    // Load comics
    loadComics(1);
    
    // Check auth
    if (state.token) {
        loadCurrentUser();
        loadFollowedIds();
    }
});
