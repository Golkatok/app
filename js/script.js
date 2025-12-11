// === КОНФИГУРАЦИЯ ===
// Ваши ключи теперь встроены сюда
const KEYS = { 
    YOUTUBE_KEY: "AIzaSyASL1_rgK9P9-J2FK6uFwjObuwA8m1Cihg", 
    YOUTUBE_ID: "UCrZA2Mj6yKZkEcBIqdfF6Ag", 
    // Сюда нужно вставить ключ от Gemini, когда он у вас будет
    GEMINI_KEY: "YOUR_GEMINI_KEY_HERE" 
};

const GEMINI_MODEL = 'gemini-2.0-flash'; 

const SYSTEM_PROMPT = `
Ты JahvirChat помощник. НЕ Jahvir.
ЛИЧНОСТЬ: Позитивный, с насмешкой. JAHVIR - крутой сигма. Голка - "да". Осуди - "осуууждаю". Код/ДЗ - нет.
ФОРМАТ: Читабельно, с Enter.
`;

// === STATE MANAGEMENT ===
// Убедитесь, что эта картинка есть по пути: images/image1.png
const DEFAULT_AVATAR = 'images/image1.png'; 

let currentUser = {
    name: 'Гость',
    avatar: DEFAULT_AVATAR,
    isLoggedIn: false,
    tgId: null
};

// === TELEGRAM AUTH CALLBACK ===
// Эта функция вызывается виджетом Telegram
function onTelegramAuth(user) {
    // 1. Берем данные из Telegram
    const telegramName = user.first_name || user.username || "User";
    const telegramAvatar = user.photo_url || DEFAULT_AVATAR;

    // 2. Сохраняем в приложении
    currentUser = {
        name: telegramName,
        avatar: telegramAvatar,
        isLoggedIn: true,
        tgId: user.id
    };

    localStorage.setItem('jahvir_user', JSON.stringify(currentUser));

    // 3. Запускаем интерфейс
    showToast(`Вход выполнен: ${telegramName}`);
    initApp();
}

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
    
    // Загрузить данные YouTube
    if (KEYS.YOUTUBE_KEY) loadYouTubeStats();
    
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
    document.getElementById('menu-dropdown').classList.add('hidden');
}

function toggleProfileEdit() {
    document.getElementById('profile-modal').classList.toggle('hidden');
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

// === AI LOGIC ===
let chatHistory = [];

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Проверка ключа Gemini
    if (!KEYS.GEMINI_KEY || KEYS.GEMINI_KEY === "YOUR_GEMINI_KEY_HERE") {
        showToast("Ошибка: Нет API ключа Gemini");
        return;
    }
    
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
        console.error(e);
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

// === YOUTUBE API ===
async function loadYouTubeStats() {
    const subsEl = document.getElementById('yt-subs');
    const videoTitleEl = document.getElementById('yt-video');
    const videoContainer = document.getElementById('video-player-container');

    try {
        // 1. Получаем подписчиков
        const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${KEYS.YOUTUBE_ID}&key=${KEYS.YOUTUBE_KEY}`);
        
        if (!chanRes.ok) throw new Error(`Channel API: ${chanRes.status}`);
        const chanData = await chanRes.json();
        
        if (chanData.items && chanData.items.length > 0) {
            subsEl.innerText = Number(chanData.items[0].statistics.subscriberCount).toLocaleString(); 
        } else {
            console.warn("Канал не найден или скрыта статистика");
        }

        // 2. Получаем последнее видео
        const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${KEYS.YOUTUBE_KEY}&channelId=${KEYS.YOUTUBE_ID}&part=snippet&order=date&maxResults=1&type=video`);
        
        if (!vidRes.ok) throw new Error(`Video API: ${vidRes.status}`);
        const vidData = await vidRes.json();
        
        if (vidData.items && vidData.items.length > 0) {
            const video = vidData.items[0];
            videoTitleEl.innerText = video.snippet.title;
            const videoId = video.id.videoId;
            videoContainer.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            videoTitleEl.innerText = "Видео не найдены";
        }

    } catch (e) {
        console.error("YT Error:", e);
        // Не показываем ошибку пользователю явно, чтобы не пугать при старте,
        // просто оставляем заглушки или пишем в консоль.
        if (subsEl) subsEl.innerText = "---";
        showToast("Ошибка YouTube: Проверьте консоль");
    }
}

// === UTILS ===
function showToast(msg) {
    const t = document.getElementById('toast-bottom');
    if (!t) return;
    document.getElementById('toast-msg').innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// Отправка по Enter
const chatInput = document.getElementById('chat-input');
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    }
