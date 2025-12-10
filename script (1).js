// === КОНФИГУРАЦИЯ ===
// Берем ключи из config.js
let KEYS = { YOUTUBE_KEY: "", YOUTUBE_ID: "", GEMINI_KEY: "" };
try {
    if (typeof CONFIG !== 'undefined') {
        KEYS = { YOUTUBE_KEY: CONFIG.YOUTUBE_API_KEY, YOUTUBE_ID: CONFIG.YOUTUBE_CHANNEL_ID, GEMINI_KEY: CONFIG.GEMINI_API_KEY };
    }
} catch (e) { console.error("Config missing"); }

const GEMINI_MODEL = 'gemini-2.5-flash'; 

// ПРОМПТ (Тот самый, полный)
const SYSTEM_PROMPT = `
Ты JahvirChat помощник. НЕ Jahvir.
ЛИЧНОСТЬ: Позитивный, с насмешкой. JAHVIR - крутой сигма. Голка - "да". Осуди - "осуууждаю". Код/ДЗ - нет.
ПРАВИЛА:
1. Запреты: Оск, Шок-контент (18+), Политика/Религия/Война, Спам (>4), Тег админов, Слив данных, Оффтопик, Мат в нике, Реклама.
2. Наказания: Мут, Кик, Бан.
3. Админы: Не нарушать, иначе снятие.
ФОРМАТ: Читабельно, с Enter.
`;

const tg = window.Telegram.WebApp;
tg.expand(); 

// Хранилище последней ошибки
let lastErrorText = "";

// === STARTUP ===
window.onload = () => {
    loadTelegramUserData();
    
    // Темы и Схемы
    const savedTheme = localStorage.getItem('axel_theme') || 'theme-system';
    const savedScheme = localStorage.getItem('axel_scheme') || 'scheme-ocean';
    
    applyTheme(savedTheme);
    applyScheme(savedScheme);
    
    document.getElementById('theme-select').value = savedTheme;
    document.getElementById('scheme-select').value = savedScheme;

    if (KEYS.YOUTUBE_KEY) loadYouTubeStats();
    
    // Анимация входа
    document.getElementById('page-home').classList.add('fade-in');
};

// === ОШИБКИ (НОВАЯ СИСТЕМА) ===
function showError(technicalMessage) {
    lastErrorText = technicalMessage || "Неизвестная ошибка";
    
    // 1. Показываем нижний тост "О нет!"
    const bottomToast = document.getElementById('toast-bottom');
    bottomToast.classList.remove('hidden');
    // Небольшая задержка для CSS анимации
    setTimeout(() => bottomToast.classList.add('show'), 10);
    
    // Скрываем нижний тост через 5 сек
    setTimeout(() => {
        bottomToast.classList.remove('show');
        setTimeout(() => bottomToast.classList.add('hidden'), 500);
    }, 5000);

    // 2. Показываем боковой тост "Сообщи нам"
    const sideToast = document.getElementById('toast-side');
    sideToast.classList.remove('hidden');
    setTimeout(() => sideToast.classList.add('show'), 10);
}

function hideSideToast() {
    const sideToast = document.getElementById('toast-side');
    sideToast.classList.remove('show');
    setTimeout(() => sideToast.classList.add('hidden'), 400);
}

function copyLastError() {
    if (!lastErrorText) return;
    navigator.clipboard.writeText(lastErrorText).then(() => {
        const btn = document.querySelector('.copy-err-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-icons-round">check</span> Скопировано!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    });
}

// === НАВИГАЦИЯ (Плавная) ===
function toggleMenu() { 
    const menu = document.getElementById('menu-dropdown');
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

function toggleSettings() { 
    const modal = document.getElementById('settings-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function navigate(pageId) {
    document.getElementById('menu-dropdown').classList.add('hidden');
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
        p.classList.remove('fade-in'); // Убираем анимацию
        setTimeout(() => {
            p.classList.remove('active-page');
            p.classList.add('hidden-page');
        }, 400); // Ждем пока исчезнет (400ms transition)
    });
    
    let targetId = 'page-placeholder';
    if (pageId === 'home') targetId = 'page-home';
    if (pageId === 'jahvir-ai') targetId = 'page-jahvir-ai';
    
    const target = document.getElementById(targetId);
    
    // Задержка чтобы прошла анимация исчезновения
    setTimeout(() => {
        target.classList.remove('hidden-page');
        target.classList.add('active-page');
        // Запуск анимации появления
        setTimeout(() => target.classList.add('fade-in'), 50);
    }, 400);
}

// === THEME MANAGER ===
function changeTheme(val) {
    localStorage.setItem('axel_theme', val);
    applyTheme(val);
}
function applyTheme(val) {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
    if (val === 'theme-system') {
        if (tg.colorScheme === 'dark' || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.add('theme-light');
        }
    } else {
        document.body.classList.add(val);
    }
}

function changeScheme(val) {
    localStorage.setItem('axel_scheme', val);
    applyScheme(val);
}
function applyScheme(val) {
    // Удаляем старые схемы
    document.body.classList.forEach(className => {
        if (className.startsWith('scheme-')) document.body.classList.remove(className);
    });
    document.body.classList.add(val);
}

// === AI LOGIC ===
let chatHistory = [];
function clearHistory() {
    chatHistory = [];
    document.getElementById('chat-output').innerHTML = '<div class="message bot">Память очищена.</div>';
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    if (!KEYS.GEMINI_KEY) {
        showError("API Key Missing (Config Error)");
        return;
    }

    appendMessage(text, 'user');
    input.value = '';
    input.disabled = true;

    if (chatHistory.length > 6) chatHistory = chatHistory.slice(-6);
    let contents = [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }];
    chatHistory.forEach(msg => contents.push(msg));
    contents.push({ role: "user", parts: [{ text: text }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${KEYS.GEMINI_KEY}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: contents })
        });
        const data = await res.json();

        if (data.error) {
            console.error(data.error);
            // ВЫЗЫВАЕМ НОВУЮ ОШИБКУ, А НЕ ПИШЕМ В ЧАТ
            showError("AI Error: " + data.error.message);
        } else {
            const reply = data.candidates[0].content.parts[0].text;
            chatHistory.push({ role: "user", parts: [{ text: text }] });
            chatHistory.push({ role: "model", parts: [{ text: reply }] });
            appendMessage(reply, 'bot');
        }
    } catch (e) {
        console.error(e);
        showError("Network Error: " + e.message);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

function appendMessage(txt, type) {
    const box = document.getElementById('chat-output');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = txt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.width = '100%';
    
    if (type === 'bot') {
        wrapper.style.alignItems = 'flex-start';
        wrapper.appendChild(div);
        // Копирование сообщения
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn'; // Добавить стиль если пропал
        copyBtn.innerText = 'Копировать';
        copyBtn.style.cssText = "margin-left:5px;background:none;border:none;color:var(--text-muted);font-size:10px;cursor:pointer;";
        copyBtn.onclick = () => { navigator.clipboard.writeText(txt); };
        wrapper.appendChild(copyBtn);
    } else {
        wrapper.style.alignItems = 'flex-end';
        wrapper.appendChild(div);
    }
    
    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
}

// === YOUTUBE API ===
async function loadYouTubeStats() {
    const subsEl = document.getElementById('yt-subs');
    const videoTitleEl = document.getElementById('yt-video');
    const videoContainer = document.getElementById('video-player-container');

    try {
        // 1. Subs
        const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${KEYS.YOUTUBE_ID}&key=${KEYS.YOUTUBE_KEY}`);
        if (!chanRes.ok) throw new Error(`Channel API: ${chanRes.status}`);
        const chanData = await chanRes.json();
        
        if (chanData.items) {
            subsEl.innerText = Number(chanData.items[0].statistics.subscriberCount).toLocaleString(); 
        }

        // 2. Video
        const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${KEYS.YOUTUBE_KEY}&channelId=${KEYS.YOUTUBE_ID}&part=snippet&order=date&maxResults=1&type=video`);
        if (!vidRes.ok) throw new Error(`Video API: ${vidRes.status}`);
        const vidData = await vidRes.json();
        
        if (vidData.items && vidData.items.length > 0) {
            const video = vidData.items[0];
            videoTitleEl.innerText = video.snippet.title;
            const videoId = video.id.videoId;
            videoContainer.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="Player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            videoTitleEl.innerText = "Нет видео";
        }

    } catch (e) {
        console.error("YT Error:", e);
        subsEl.innerText = "Ошибка";
        videoTitleEl.innerText = "Сбой";
        // Здесь можно тоже вызвать showError, если критично
        showError("YouTube API Error: " + e.message);
    }
}

// === TELEGRAM DATA ===
function loadTelegramUserData() {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        nameEl.innerText = user.first_name || 'User';
        if (user.photo_url) avatarEl.src = user.photo_url;
        else avatarEl.src = `https://ui-avatars.com/api/?name=${user.first_name}&background=random`;
        
        if (localStorage.getItem('axel_theme') === 'theme-system') {
             if (tg.colorScheme === 'dark') document.body.classList.add('theme-dark');
        }
    } else {
        nameEl.innerText = "Tester";
        avatarEl.src = "https://via.placeholder.com/150"; 
    }
}

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
