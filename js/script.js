// === КОНФИГУРАЦИЯ ===
let KEYS = { YOUTUBE_KEY: "", YOUTUBE_ID: "", GEMINI_KEY: "" };
if (typeof CONFIG !== 'undefined') {
    KEYS = { YOUTUBE_KEY: CONFIG.YOUTUBE_API_KEY, YOUTUBE_ID: CONFIG.YOUTUBE_CHANNEL_ID, GEMINI_KEY: CONFIG.GEMINI_API_KEY };
}

const GEMINI_MODEL = 'gemini-2.0-flash'; // Обновил модель, если доступна

const SYSTEM_PROMPT = `
Ты JahvirChat помощник. НЕ Jahvir.
ЛИЧНОСТЬ: Позитивный, с насмешкой. JAHVIR - крутой сигма. Голка - "да". Осуди - "осуууждаю". Код/ДЗ - нет.
ФОРМАТ: Читабельно, с Enter. Без маркдауна в обычных фразах.
`;

// === STATE MANAGEMENT ===
const DEFAULT_AVATAR = 'images/image1.png'; // Убедитесь, что файл существует
let currentUser = {
    name: 'Гость',
    avatar: DEFAULT_AVATAR,
    isLoggedIn: false
};

// === STARTUP ===
window.onload = () => {
    loadSettings();
    checkAuth();
};

// === AUTH SYSTEM ===
function checkAuth() {
    const savedUser = localStorage.getItem('jahvir_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initApp();
    } else {
        // Показать экран входа
        document.getElementById('login-screen').classList.remove('closed');
    }
}

function initApp() {
    // Скрыть экран входа
    document.getElementById('login-screen').classList.add('closed');
    
    // Обновить UI
    updateHeaderUI();
    
    // Загрузить данные
    if (KEYS.YOUTUBE_KEY) loadYouTubeStats();
    
    // Приветствие в консоли
    console.log("App Started as", currentUser.name);
}

// Guest Login Logic
function openGuestSetup() {
    document.getElementById('guest-modal').classList.remove('hidden');
}

function closeGuestSetup() {
    document.getElementById('guest-modal').classList.add('hidden');
}

function finishGuestLogin() {
    const nickInput = document.getElementById('guest-nickname').value.trim();
    const avatarImg = document.getElementById('guest-preview').src;
    
    currentUser.name = nickInput || "Гость";
    currentUser.avatar = avatarImg;
    currentUser.isLoggedIn = true;
    
    localStorage.setItem('jahvir_user', JSON.stringify(currentUser));
    
    closeGuestSetup();
    initApp();
}

function logout() {
    localStorage.removeItem('jahvir_user');
    location.reload();
}

// === PROFILE MANAGEMENT ===
function updateHeaderUI() {
    document.getElementById('user-name').innerText = currentUser.name;
    document.getElementById('user-avatar').src = currentUser.avatar;
}

function openProfileEdit() {
    document.getElementById('edit-nickname').value = currentUser.name;
    document.getElementById('edit-preview').src = currentUser.avatar;
    document.getElementById('profile-modal').classList.remove('hidden');
    // Закрыть меню если открыто
    document.getElementById('menu-dropdown').classList.add('hidden');
}

function toggleProfileEdit() {
    const modal = document.getElementById('profile-modal');
    modal.classList.toggle('hidden');
}

function saveProfileChanges() {
    const newNick = document.getElementById('edit-nickname').value.trim();
    const newAvatar = document.getElementById('edit-preview').src;
    
    if(newNick) currentUser.name = newNick;
    currentUser.avatar = newAvatar;
    
    localStorage.setItem('jahvir_user', JSON.stringify(currentUser));
    updateHeaderUI();
    toggleProfileEdit();
    showToast("Профиль обновлен");
}

// === IMAGE HANDLING (Base64) ===
function previewAvatar(input, imgId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Сжимаем или просто отображаем.
            // Для локального хранения лучше сжимать, но пока просто сохраняем DataURL
            document.getElementById(imgId).src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// === UI & NAVIGATION ===
function toggleMenu() { 
    document.getElementById('menu-dropdown').classList.toggle('hidden');
}

function toggleSettings() { 
    document.getElementById('settings-modal').classList.toggle('hidden');
}

function navigate(pageId) {
    document.getElementById('menu-dropdown').classList.add('hidden');
    
    // Скрываем текущие
    document.querySelectorAll('.page').forEach(p => {
        if(p.classList.contains('active-page')) {
            p.classList.remove('active-page');
            p.classList.add('hidden-page');
        }
    });

    let targetId = 'page-placeholder';
    if (pageId === 'home') targetId = 'page-home';
    if (pageId === 'jahvir-ai') targetId = 'page-jahvir-ai';
    
    const target = document.getElementById(targetId);
    
    // Маленькая задержка для анимации
    setTimeout(() => {
        target.classList.remove('hidden-page');
        target.classList.add('active-page');
    }, 50);
}

// === SETTINGS MANAGER ===
function loadSettings() {
    const theme = localStorage.getItem('axel_theme') || 'theme-system';
    const scheme = localStorage.getItem('axel_scheme') || 'scheme-ocean';
    const fSize = localStorage.getItem('axel_fsize') || 'text-size-m';
    
    changeTheme(theme);
    changeScheme(scheme);
    changeFontSize(fSize);
    
    document.getElementById('theme-select').value = theme;
    document.getElementById('font-size-select').value = fSize;
}

function changeTheme(val) {
    localStorage.setItem('axel_theme', val);
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
    
    if (val === 'theme-system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    } else {
        document.body.classList.add(val);
    }
}

function changeScheme(val) {
    localStorage.setItem('axel_scheme', val);
    document.body.classList.forEach(c => {
        if(c.startsWith('scheme-')) document.body.classList.remove(c);
    });
    document.body.classList.add(val);
}

function changeFontSize(val) {
    localStorage.setItem('axel_fsize', val);
    document.body.classList.forEach(c => {
        if(c.startsWith('text-size-')) document.body.classList.remove(c);
    });
    document.body.classList.add(val);
}

// === AI LOGIC (Сохранена) ===
let chatHistory = [];

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    appendMessage(text, 'user');
    input.value = '';
    
    // Animation UX
    const btn = document.querySelector('.send-btn');
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 150);

    let contents = [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }];
    chatHistory.slice(-6).forEach(msg => contents.push(msg));
    contents.push({ role: "user", parts: [{ text: text }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${KEYS.GEMINI_KEY}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: contents })
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        
        const reply = data.candidates[0].content.parts[0].text;
        chatHistory.push({ role: "user", parts: [{ text: text }] });
        chatHistory.push({ role: "model", parts: [{ text: reply }] });
        appendMessage(reply, 'bot');

    } catch (e) {
        showToast("Ошибка AI: " + e.message);
    }
}

function appendMessage(txt, type) {
    const box = document.getElementById('chat-output');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = txt.replace(/\n/g, '<br>');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// === YOUTUBE (Сохранено) ===
async function loadYouTubeStats() {
    try {
        // Subs
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${KEYS.YOUTUBE_ID}&key=${KEYS.YOUTUBE_KEY}`);
        const cData = await cRes.json();
        if (cData.items) document.getElementById('yt-subs').innerText = Number(cData.items[0].statistics.subscriberCount).toLocaleString();

        // Video
        const vRes = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${KEYS.YOUTUBE_KEY}&channelId=${KEYS.YOUTUBE_ID}&part=snippet&order=date&maxResults=1&type=video`);
        const vData = await vRes.json();
        if (vData.items && vData.items.length > 0) {
            const vid = vData.items[0];
            document.getElementById('yt-video').innerText = vid.snippet.title;
            document.getElementById('video-player-container').innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vid.id.videoId}" frameborder="0" allowfullscreen></iframe>`;
        }
    } catch (e) { console.error("YT Error", e); }
}

// === UTILS ===
function showToast(msg) {
    const t = document.getElementById('toast-bottom');
    document.getElementById('toast-msg').innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
            
