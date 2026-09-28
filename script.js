// URL вашего сервера на Render
const API_URL = "https://mychat-backend-gnp6.onrender.com";

const POLL_ACTIVE_MS = 1000;   // чат открыт и вкладка видна
const POLL_IDLE_MS = 3000;     // иначе реже
const TYPING_THROTTLE_MS = 1500;
const TOKEN_KEY = "mychat_token";
const THEME_KEY = "mychat_theme";
const LANG_KEY = "mychat_lang";

// ------------------------------------------------------------ Состояние
let token = localStorage.getItem(TOKEN_KEY);
let me = null;
let chats = [];
let activeId = null;
let lastMsgId = null;
let lastSender = null;
let renderedIds = new Set();
let pollTimer = null;
let polling = false;
let localJobs = new Map();
let pollGen = 0;
let lastTypingSent = 0;
let lastListSig = "";
let replyToMsg = null;
let selectedMsgId = null;

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
}

// ------------------------------------------------------------ Темы и язык
const TRANSLATIONS = {
    ru: {
        login: "Войдите или создайте аккаунт",
        auth_hint: "Логин: 3–20 символов, латиница, цифры и «_». Пароль: от 6 символов, минимум одна буква и одна цифра",
        placeholder: "Сообщение",
        add_chat: "Добавить чат",
        search: "Поиск...",
        online: "в сети",
        offline: "не в сети",
        settings: "Настройки",
        profile: "Профиль",
        theme: "Тема",
        light: "☀️ Светлая",
        dark: "🌙 Темная",
        auto: "🖥️ Система",
        language: "Язык",
        save: "Сохранить",
        logout: "Выйти",
        upload_avatar: "Загрузить аватарку",
        name: "Имя",
        bio: "Описание",
        delivered: "доставлено",
        read: "прочитано",
        reply: "Ответить",
        reactions: "Реакции",
        pin: "Закрепить",
        edit: "Редактировать",
        delete: "Удалить",
        copy: "Копировать",
        members: "Участников",
        personal_chat: "Личный чат",
        typing: "печатает…",
    },
    en: {
        login: "Sign in or create account",
        auth_hint: "Login: 3–20 characters, latin letters, numbers and «_». Password: 6+ characters, at least one letter and one digit",
        placeholder: "Type a message",
        add_chat: "Add chat",
        search: "Search...",
        online: "online",
        offline: "offline",
        settings: "Settings",
        profile: "Profile",
        theme: "Theme",
        light: "☀️ Light",
        dark: "🌙 Dark",
        auto: "🖥️ System",
        language: "Language",
        save: "Save",
        logout: "Sign out",
        upload_avatar: "Upload avatar",
        name: "Name",
        bio: "Bio",
        delivered: "delivered",
        read: "read",
        reply: "Reply",
        reactions: "Reactions",
        pin: "Pin",
        edit: "Edit",
        delete: "Delete",
        copy: "Copy",
        members: "Members",
        personal_chat: "Personal chat",
        typing: "typing…",
    },
    ua: {
        login: "Увійдіть або створіть обліковий запис",
        auth_hint: "Логін: 3–20 символів, латиниця, цифри та «_». Пароль: 6+ символів, хоча б одна буква та одна цифра",
        placeholder: "Напишіть повідомлення",
        add_chat: "Додати чат",
        search: "Пошук...",
        online: "в мережі",
        offline: "не в мережі",
        settings: "Налаштування",
        profile: "Профіль",
        theme: "Тема",
        light: "☀️ Світла",
        dark: "🌙 Темна",
        auto: "🖥️ Система",
        language: "Мова",
        save: "Зберегти",
        logout: "Вийти",
        upload_avatar: "Завантажити аватар",
        name: "Ім'я",
        bio: "Опис",
        delivered: "доставлено",
        read: "прочитано",
        reply: "Відповісти",
        reactions: "Реакції",
        pin: "Закріпити",
        edit: "Редагувати",
        delete: "Видалити",
        copy: "Копіювати",
        members: "Учасники",
        personal_chat: "Особистий чат",
        typing: "друкує…",
    }
};

let currentLang = localStorage.getItem(LANG_KEY) || "ru";

function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.ru[key] || key;
}

function setTheme(theme) {
    const allowed = ["light", "dark", "auto"];
    if (!allowed.includes(theme)) theme = "light";
    localStorage.setItem(THEME_KEY, theme);
    document.body.className = theme;
    if (theme === "auto") {
        document.body.className = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (radio) radio.checked = true;
}

function applyTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    setTheme(saved);
}

function setLanguage(lang) {
    const allowed = ["ru", "en", "ua"];
    if (!allowed.includes(lang)) lang = "ru";
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    const radio = document.querySelector(`input[name="language"][value="${lang}"]`);
    if (radio) radio.checked = true;
    updateUiText();
}

function updateUiText() {
    $("auth-subtitle").textContent = t("login");
    $("auth-hint").textContent = t("auth_hint");
    $("message-text").placeholder = t("placeholder");
    $("btn-add-chat").textContent = t("add_chat");
    $("chat-search").placeholder = t("search");
}

// ------------------------------------------------------------ API
async function api(path, { method = "GET", body } = {}) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = "Bearer " + token;

    const res = await fetch(API_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (res.status === 401 && token) {
        resetSession();
        throw new Error("Сессия истекла, войдите заново");
    }
    if (!res.ok) throw new Error(data.error || "Ошибка запроса");
    return data;
}

function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

// ------------------------------------------------------------ Аватары
function avatarColor(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h} 42% 42%)`;
}

function makeAvatar(name, small = false) {
    const a = el("div", "avatar" + (small ? " sm" : ""), (name[0] || "?").toUpperCase());
    a.style.background = avatarColor(name);
    return a;
}

function fillAvatar(node, name) {
    node.textContent = (name[0] || "?").toUpperCase();
    node.style.background = avatarColor(name);
}

// ------------------------------------------------------------ Валидация
function checkCredentials(login, pas) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(login)) return "Логин: 3–20 символов, только латиница, цифры и «_»";
    if (pas.length < 6 || pas.length > 64) return "Пароль: от 6 до 64 символов";
    if (!/[A-Za-z]/.test(pas) || !/\d/.test(pas)) return "Пароль должен содержать букву и цифру";
    if (/\s/.test(pas)) return "Пароль не должен содержать пробелов";
    return "";
}

// ------------------------------------------------------------ Вход / выход
function setAuthError(msg) { $("auth-error").textContent = msg; }

async function doLogin(login, pas) {
    const data = await api("/login", { method: "POST", body: { log: login, pas } });
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    startApp(data.user);
}

async function onLoginClick() {
    setAuthError("");
    const login = $("auth-login").value.trim();
    const pas = $("auth-pas").value;
    if (!login || !pas) return setAuthError("Заполните все поля");
    setBusy(true);
    try { await doLogin(login, pas); }
    catch (e) { setAuthError(e.message); }
    finally { setBusy(false); }
}

async function onRegisterClick() {
    setAuthError("");
    const login = $("auth-login").value.trim();
    const pas = $("auth-pas").value;
    const problem = checkCredentials(login, pas);
    if (problem) return setAuthError(problem);
    setBusy(true);
    try {
        await api("/register", { method: "POST", body: { log: login, pas } });
        await doLogin(login, pas);
    } catch (e) { setAuthError(e.message); }
    finally { setBusy(false); }
}

function setBusy(busy) {
    $("btn-login").disabled = busy;
    $("btn-register").disabled = busy;
}

async function logout() {
    try { if (token) await api("/logout", { method: "POST" }); } catch (_) {}
    resetSession();
}

function resetSession() {
    token = null;
    me = null;
    localStorage.removeItem(TOKEN_KEY);
    pollGen++;
    clearTimeout(pollTimer);
    pollTimer = null;
    chats = [];
    activeId = null;
    closeModal();
    closeSettings();
    $("app").classList.add("hidden");
    $("app").classList.remove("chat-open");
    $("auth").classList.remove("hidden");
    $("auth-pas").value = "";
}

function startApp(user) {
    me = user;
    $("auth").classList.add("hidden");
    $("app").classList.remove("hidden");
    renderProfile();
    chats = [];
    lastListSig = "";
    showEmptyPane();
    pollGen++;
    clearTimeout(pollTimer);
    pollLoop(pollGen);
}

// ------------------------------------------------------------ Опрос сервера
async function poll() {
    if (polling || !token) return;
    polling = true;
    try {
        const params = new URLSearchParams();
        if (activeId) {
            params.set("chat_id", activeId);
            if (lastMsgId) params.set("after", lastMsgId);
            if (document.visibilityState === "visible") params.set("read", "1");
        }
        const data = await api("/poll?" + params.toString());
        if (data.chat_id && data.chat_id === activeId) appendMessages(data.messages);
        setChats(data.chats);
    } catch (e) {
        console.error("poll:", e.message);
    } finally {
        polling = false;
    }
}

async function pollLoop(gen) {
    if (gen !== pollGen || !token) return;
    await poll();
    if (gen !== pollGen || !token) return;
    const fast = activeId && document.visibilityState === "visible";
    pollTimer = setTimeout(() => pollLoop(gen), fast ? POLL_ACTIVE_MS : POLL_IDLE_MS);
}

function setChats(list) {
    chats = list;
    renderChatList();
    updateHeader();
}

// ------------------------------------------------------------ Список чатов
function formatListTime(iso) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function typingText(chat) {
    if (!chat.typing.length) return "";
    if (chat.type === "private") return t("typing");
    if (chat.typing.length === 1) return chat.typing[0] + " " + t("typing");
    return chat.typing.length + " человека " + t("typing");
}

function renderChatList() {
    const sig = JSON.stringify([chats, activeId, me && me.login]);
    if (sig === lastListSig) return;
    lastListSig = sig;

    const searchQ = ($("chat-search").value || "").toLowerCase();
    const filtered = chats.filter(c => c.title.toLowerCase().includes(searchQ));

    const list = $("chat-list");
    list.replaceChildren();

    if (!filtered.length) {
        list.appendChild(el("div", "empty-list", "Чатов не найдено. Нажмите «" + t("add_chat") + "», чтобы найти человека по логину или создать группу"));
        return;
    }

    for (const c of filtered) {
        const row = el("button", "chat-row" + (c.id === activeId ? " active" : ""));
        row.appendChild(makeAvatar(c.title));

        const mid = el("div", "mid");
        const top = el("div", "top");
        top.appendChild(el("div", "title", c.title));
        if (c.last_message) top.appendChild(el("div", "time", formatListTime(c.last_message.at)));

        const bottom = el("div", "bottom");
        const typing = typingText(c);
        let preview;
        if (typing) {
            preview = el("div", "preview typing", typing);
        } else if (c.last_message) {
            const mine = c.last_message.sender === me.login;
            const prefix = mine ? "Вы: " : c.type === "group" ? c.last_message.sender + ": " : "";
            preview = el("div", "preview", prefix + c.last_message.text);
        } else {
            preview = el("div", "preview", "Нет сообщений");
        }
        bottom.appendChild(preview);
        if (c.unread > 0 && c.id !== activeId) bottom.appendChild(el("div", "badge", c.unread > 99 ? "99+" : String(c.unread)));

        mid.append(top, bottom);
        row.appendChild(mid);
        row.addEventListener("click", () => openChat(c.id));
        list.appendChild(row);
    }
}

// ------------------------------------------------------------ Окно чата
function activeChat() {
    return chats.find((c) => c.id === activeId) || null;
}

function showEmptyPane() {
    $("pane-empty").classList.remove("hidden");
    $("chat-view").classList.add("hidden");
}

function updateHeader() {
    const c = activeChat();
    if (!c) return;
    $("head-title").textContent = c.title;
    fillAvatar($("head-avatar"), c.title);
    const status = $("head-status");
    const typing = typingText(c);
    if (typing) {
        status.textContent = typing;
        status.classList.add("typing");
    } else {
        status.classList.remove("typing");
        status.textContent = c.type === "group" ? `${t("members")}: ${c.members.length}` : t("personal_chat");
    }
}

async function openChat(chatId) {
    closeModal();
    activeId = chatId;
    lastMsgId = null;
    lastSender = null;
    renderedIds = new Set();
    lastTypingSent = 0;
    replyToMsg = null;

    $("messages").replaceChildren();
    $("message-text").value = "";
    $("pane-empty").classList.add("hidden");
    $("chat-view").classList.remove("hidden");
    $("app").classList.add("chat-open");

    lastListSig = "";
    renderChatList();
    updateHeader();

    try {
        const data = await api(`/chats/${chatId}/messages`);
        if (chatId !== activeId) return;
        if (!data.messages.length) showNoMessages();
        appendMessages(data.messages, true);
    } catch (e) {
        console.error(e.message);
    }
    if (window.matchMedia("(min-width: 761px)").matches) $("message-text").focus();
    poll();
}

function closeChat() {
    activeId = null;
    $("app").classList.remove("chat-open");
    showEmptyPane();
    lastListSig = "";
    renderChatList();
}

function showNoMessages() {
    if (!$("messages").querySelector(".no-msgs")) {
        $("messages").appendChild(el("div", "no-msgs", "Сообщений пока нет. Напишите первым!"));
    }
}

function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function removeEmptyNote() {
    const empty = $("messages").querySelector(".no-msgs");
    if (empty) empty.remove();
}

function buildRow(m, pending = false) {
    const c = activeChat();
    const isGroup = c ? c.type === "group" : false;
    const mine = m.sender_id === me.id;
    const firstInRun = lastSender !== m.sender_id;
    lastSender = m.sender_id;

    const row = el("div", "msg" + (mine ? " out" : "") + (firstInRun ? " gap" : "") + (pending ? " pending" : ""));
    row.dataset.msgId = m.id;

    if (!mine) {
        const slot = el("div", "avatar-slot");
        if (firstInRun) slot.appendChild(makeAvatar(m.sender, true));
        row.appendChild(slot);
    }

    const bubble = el("div", "bubble");
    
    // Ответ на сообщение
    if (m.reply_to_text) {
        const replyDiv = el("div", "replied-to", "↩ " + m.reply_to_text);
        bubble.appendChild(replyDiv);
    }

    if (!mine && isGroup && firstInRun) {
        const author = el("span", "author", m.sender);
        author.style.color = avatarColor(m.sender);
        bubble.appendChild(author);
    }

    // Текст и фото
    if (m.text) {
        bubble.appendChild(document.createTextNode(m.text));
    }
    
    if (m.image) {
        const img = document.createElement("img");
        img.src = m.image;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "8px";
        img.style.marginTop = "6px";
        img.style.display = "block";
        bubble.appendChild(img);
    }

    const meta = el("span", "time");
    const statusText = mine ? (m.read_by?.includes(me.id) ? t("read") : t("delivered")) : "";
    meta.textContent = (statusText ? statusText + " • " : "") + timeLabel(m.created_at);
    bubble.appendChild(meta);

    row.appendChild(bubble);

    // Меню действий над сообщением
    const menu = el("div", "message-menu");
    
    const replyBtn = el("button", "", "↩ " + t("reply"));
    replyBtn.addEventListener("click", (e) => { e.stopPropagation(); showReplyMenu(m); });
    menu.appendChild(replyBtn);

    const reactBtn = el("button", "", "👍 " + t("reactions"));
    reactBtn.addEventListener("click", (e) => { e.stopPropagation(); showReactionPicker(m); });
    menu.appendChild(reactBtn);

    const pinBtn = el("button", "", "📌 " + t("pin"));
    pinBtn.addEventListener("click", (e) => { e.stopPropagation(); pinMessage(m); });
    menu.appendChild(pinBtn);

    if (mine) {
        const editBtn = el("button", "", "✏️ " + t("edit"));
        editBtn.addEventListener("click", (e) => { e.stopPropagation(); editMessage(m, row); });
        menu.appendChild(editBtn);

        const delBtn = el("button", "", "🗑️ " + t("delete"));
        delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteMessage(m, row); });
        menu.appendChild(delBtn);
    }

    const copyBtn = el("button", "", "📋 " + t("copy"));
    copyBtn.addEventListener("click", (e) => { e.stopPropagation(); copyMessage(m); });
    menu.appendChild(copyBtn);

    row.appendChild(menu);

    // Показываем меню на hover
    row.addEventListener("mouseenter", () => menu.style.display = "block");
    row.addEventListener("mouseleave", () => menu.style.display = "none");
    row.addEventListener("click", (e) => {
        if (e.target === bubble || e.target.parentElement === bubble) {
            menu.style.display = menu.style.display === "block" ? "none" : "block";
        }
    });

    return row;
}

function appendMessages(list, forceScroll = false) {
    const box = $("messages");
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    let added = false;
    let mineAdded = false;

    for (const m of list) {
        if (renderedIds.has(m.id)) continue;

        const job = m.client_id ? localJobs.get(m.client_id) : null;
        if (job && !job.done && job.el.isConnected) {
            confirmJob(job, m);
            continue;
        }

        renderedIds.add(m.id);
        if (!lastMsgId || m.id > lastMsgId) lastMsgId = m.id;
        removeEmptyNote();
        box.appendChild(buildRow(m));
        added = true;
        if (m.sender_id === me.id) mineAdded = true;
    }

    if (added && (forceScroll || nearBottom || mineAdded)) box.scrollTop = box.scrollHeight;
}

// ------------------------------------------------------------ Действия с сообщениями
function showReplyMenu(msg) {
    replyToMsg = msg;
    const text = msg.text || "📷 Фото";
    $("message-text").placeholder = `Ответить на: "${text.substring(0, 30)}..."`;
    $("message-text").focus();
}

function showReactionPicker(msg) {
    const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "💯"];
    alert("Реакции: " + emojis.join(" ") + "\n(Функция в разработке)");
}

function pinMessage(msg) {
    alert("Закреплено: " + (msg.text || "📷 Фото"));
}

function editMessage(msg, row) {
    const newText = prompt("Редактировать сообщение:", msg.text || "");
    if (newText !== null && newText !== msg.text) {
        msg.text = newText;
        const bubble = row.querySelector(".bubble");
        const textNode = bubble.childNodes[bubble.childNodes.length - 2];
        if (textNode) textNode.textContent = newText;
    }
}

function deleteMessage(msg, row) {
    if (confirm("Удалить сообщение?")) {
        row.style.opacity = "0.5";
        row.style.pointerEvents = "none";
        api(`/chats/${activeId}/messages/${msg.id}`, { method: "DELETE" }).catch(e => alert(e.message));
    }
}

function copyMessage(msg) {
    const text = msg.text || "📷 Фото";
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log("Скопировано в буфер обмена");
        });
    }
}

// ------------------------------------------------------------ Отправка
function sendMessage() {
    if (!activeId) return;
    const input = $("message-text");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.placeholder = t("placeholder");
    input.focus();
    lastTypingSent = 0;

    const job = { chatId: activeId, text, clientId: uuid(), done: false, el: null };
    localJobs.set(job.clientId, job);

    removeEmptyNote();
    const box = $("messages");
    job.el = buildRow(
        { 
            id: "local-" + job.clientId, 
            sender_id: me.id, 
            sender: me.login, 
            text, 
            created_at: new Date().toISOString(),
            reply_to_text: replyToMsg ? (replyToMsg.text || "📷 Фото") : null,
        },
        true
    );
    job.el.addEventListener("click", () => {
        if (job.el.classList.contains("failed")) postJob(job);
    });
    box.appendChild(job.el);
    box.scrollTop = box.scrollHeight;

    postJob(job);
    replyToMsg = null;
}

async function postJob(job) {
    const timeEl = job.el.querySelector(".time");
    job.el.classList.remove("failed");
    job.el.classList.add("pending");
    if (timeEl) timeEl.textContent = "отправка…";

    try {
        const data = await api(`/chats/${job.chatId}/messages`, {
            method: "POST",
            body: { 
                text: job.text, 
                client_id: job.clientId,
                reply_to: replyToMsg ? replyToMsg.id : null,
                reply_to_text: replyToMsg ? (replyToMsg.text || "📷 Фото") : null,
            },
        });
        if (!job.done) confirmJob(job, data.message);
        poll();
    } catch (e) {
        if (job.done) return;
        job.el.classList.remove("pending");
        job.el.classList.add("failed");
        if (timeEl) timeEl.textContent = "Не отправлено, нажмите, чтобы повторить";
    }
}

function confirmJob(job, m) {
    job.done = true;
    localJobs.delete(job.clientId);
    renderedIds.add(m.id);
    if (job.chatId === activeId && (!lastMsgId || m.id > lastMsgId)) lastMsgId = m.id;
    if (job.el.isConnected) {
        job.el.classList.remove("pending", "failed");
        const t = job.el.querySelector(".time");
        if (t) t.textContent = timeLabel(m.created_at);
    }
}

function onTyping() {
    if (!activeId || !$("message-text").value.trim()) return;
    const t = Date.now();
    if (t - lastTypingSent < TYPING_THROTTLE_MS) return;
    lastTypingSent = t;
    api(`/chats/${activeId}/typing`, { method: "POST" }).catch(() => {});
}

// ------------------------------------------------------------ Профиль и настройки
function renderProfile() {
    if (!me) return;
    fillAvatar($("me-avatar"), me.login);
    $("me-name").textContent = me.name || me.login;
    
    const lastSeenTime = me.last_seen ? new Date(me.last_seen) : null;
    let statusText = me.online ? t("online") : t("offline");
    if (!me.online && lastSeenTime) {
        const diff = Date.now() - lastSeenTime.getTime();
        if (diff < 60000) statusText += " (минуту назад)";
        else if (diff < 3600000) statusText += ` (${Math.floor(diff / 60000)} мин назад)`;
        else if (diff < 86400000) statusText += ` (${Math.floor(diff / 3600000)} ч назад)`;
        else statusText += " (давно)";
    }
    $("head-status").textContent = statusText;
}

function openSettings() {
    $("settings-menu").classList.remove("hidden");
    
    // Загружаем текущие значения профиля
    if (me) {
        $("profile-name").value = me.name || me.login;
        $("profile-bio").value = me.bio || "";
        
        if (me.avatar) {
            $("profile-avatar-big-img").src = me.avatar;
            $("profile-avatar-big-img").style.display = "block";
        } else {
            $("profile-avatar-big-img").style.display = "none";
            fillAvatar($("profile-avatar-big"), me.login);
        }
    }
}

function closeSettings() {
    $("settings-menu").classList.add("hidden");
}

async function saveProfile() {
    if (!me) return;
    
    const name = $("profile-name").value.trim();
    const bio = $("profile-bio").value.trim();
    
    if (!name) {
        alert("Имя не может быть пустым");
        return;
    }

    try {
        const data = await api("/me", {
            method: "PATCH",
            body: {
                name,
                bio,
            }
        });
        me = data.user;
        renderProfile();
        alert("Профиль сохранён!");
    } catch (e) {
        alert(e.message);
    }
}

function handleAvatarUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        
        // Показываем preview
        $("profile-avatar-big-img").src = base64;
        $("profile-avatar-big-img").style.display = "block";
        
        // Сохраняем на сервер
        api("/me", {
            method: "PATCH",
            body: { avatar: base64 }
        }).then(data => {
            me = data.user;
            renderProfile();
        }).catch(err => alert(err.message));
    };
    reader.readAsDataURL(file);
}

function handlePhotoUpload(file) {
    if (!file || !activeId) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        
        const job = { 
            chatId: activeId, 
            text: "[Фото]", 
            image: base64,
            clientId: uuid(), 
            done: false, 
            el: null 
        };
        localJobs.set(job.clientId, job);

        removeEmptyNote();
        const box = $("messages");
        const msgData = {
            id: "local-" + job.clientId,
            sender_id: me.id,
            sender: me.login,
            text: "",
            image: base64,
            created_at: new Date().toISOString(),
            reply_to_text: replyToMsg ? (replyToMsg.text || "📷 Фото") : null,
        };
        job.el = buildRow(msgData, true);
        box.appendChild(job.el);
        box.scrollTop = box.scrollHeight;

        postPhotoJob(job);
    };
    reader.readAsDataURL(file);
}

async function postPhotoJob(job) {
    const timeEl = job.el.querySelector(".time");
    job.el.classList.remove("failed");
    job.el.classList.add("pending");
    if (timeEl) timeEl.textContent = "отправка…";

    try {
        const data = await api(`/chats/${job.chatId}/messages`, {
            method: "POST",
            body: {
                text: "",
                image: job.image,
                client_id: job.clientId,
                reply_to: replyToMsg ? replyToMsg.id : null,
                reply_to_text: replyToMsg ? (replyToMsg.text || "📷 Фото") : null,
            },
        });
        if (!job.done) confirmJob(job, data.message);
        poll();
    } catch (e) {
        if (job.done) return;
        job.el.classList.remove("pending");
        job.el.classList.add("failed");
        if (timeEl) timeEl.textContent = "Ошибка загрузки фото";
    }
}

// ------------------------------------------------------------ Эмодзи
function showEmojiPicker() {
    const emojis = ["😀", "😂", "😍", "🥰", "😢", "🤔", "👍", "🔥", "💯", "🎉", "😎", "🤩", "❤️", "💕", "👏", "🙌"];
    const modal = el("div", "overlay");
    const box = el("div", "modal");
    
    const title = el("h3", "", "Выберите эмодзи");
    box.appendChild(title);
    
    const grid = el("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(8, 1fr)";
    grid.style.gap = "8px";
    grid.style.marginBottom = "12px";
    
    emojis.forEach(emoji => {
        const btn = el("button", "btn btn-ghost");
        btn.textContent = emoji;
        btn.style.padding = "8px";
        btn.addEventListener("click", () => {
            $("message-text").value += emoji;
            $("message-text").focus();
            closeModal();
        });
        grid.appendChild(btn);
    });
    
    box.appendChild(grid);
    
    const close = el("button", "btn btn-ghost", "Отмена");
    close.addEventListener("click", closeModal);
    box.appendChild(close);
    
    modal.appendChild(box);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    $("modal-root").appendChild(modal);
}

// ------------------------------------------------------------ Модальные окна
function closeModal() { $("modal-root").replaceChildren(); }

// ------------------------------------------------------------ Инициализация
document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    setLanguage(currentLang);
    updateUiText();

    $("btn-login").addEventListener("click", onLoginClick);
    $("btn-register").addEventListener("click", onRegisterClick);
    $("auth-pas").addEventListener("keydown", (e) => { if (e.key === "Enter") onLoginClick(); });
    $("btn-logout").addEventListener("click", logout);
    $("btn-add-chat").addEventListener("click", showAddChooser);
    $("btn-back").addEventListener("click", closeChat);
    $("head-info").addEventListener("click", showChatInfo);
    $("btn-send").addEventListener("click", sendMessage);
    $("message-text").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendMessage(); }
    });
    $("message-text").addEventListener("input", onTyping);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // Профиль и настройки
    $("me-card").addEventListener("click", openSettings);
    $("btn-settings").addEventListener("click", openSettings);
    $("settings-close").addEventListener("click", closeSettings);
    $("save-profile").addEventListener("click", saveProfile);
    
    document.getElementById("avatar-upload")?.addEventListener("change", (e) => {
        handleAvatarUpload(e.target.files[0]);
    });

    // Эмодзи и фото
    $("btn-emoji").addEventListener("click", showEmojiPicker);
    
    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.accept = "image/*";
    photoInput.id = "photo-upload-hidden";
    photoInput.style.display = "none";
    photoInput.addEventListener("change", (e) => {
        handlePhotoUpload(e.target.files[0]);
    });
    document.body.appendChild(photoInput);
    
    $("btn-photo").addEventListener("click", () => {
        document.getElementById("photo-upload-hidden").click();
    });

    // Тема
    document.querySelectorAll('input[name="theme"]').forEach(r => {
        r.addEventListener("change", (e) => setTheme(e.target.value));
    });

    // Язык
    document.querySelectorAll('input[name="language"]').forEach(r => {
        r.addEventListener("change", (e) => {
            setLanguage(e.target.value);
            updateUiText();
            renderChatList();
        });
    });

    // Поиск чатов
    $("chat-search").addEventListener("input", renderChatList);

    // Мобильная клавиатура
    function syncViewport() {
        const vv = window.visualViewport;
        document.documentElement.style.setProperty("--app-h", (vv ? vv.height : window.innerHeight) + "px");
        window.scrollTo(0, 0);
    }
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewport);
        window.visualViewport.addEventListener("scroll", syncViewport);
    }
    window.addEventListener("resize", syncViewport);
    syncViewport();

    $("message-text").addEventListener("focus", () => {
        setTimeout(() => { const b = $("messages"); b.scrollTop = b.scrollHeight; }, 300);
    });

    // Инициализация приложения
    if (!token) return;
    try {
        api("/me").then(data => {
            startApp(data.user);
        }).catch(_ => {
            resetSession();
        });
    } catch (_) {
        resetSession();
    }
});

// Функции для создания чатов (из оригинального скрипта)
function showAddChooser() {
    const modal = el("div", "overlay");
    const box = el("div", "modal");
    
    const title = el("h3", "", "Добавить чат");
    box.appendChild(title);
    
    const a = el("button", "row-btn");
    a.append(el("b", "", "Добавить контакт"), el("span", "", "Найти человека по логину и начать чат"));
    a.addEventListener("click", showAddContact);
    
    const b = el("button", "row-btn");
    b.append(el("b", "", "Создать группу"), el("span", "", "Выбрать людей из ваших контактов"));
    b.addEventListener("click", showCreateGroup);
    
    const cancel = el("button", "btn btn-ghost btn-wide", "Отмена");
    cancel.addEventListener("click", closeModal);
    
    box.append(a, b, cancel);
    modal.appendChild(box);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    $("modal-root").appendChild(modal);
}

function showAddContact() {
    const modal = el("div", "overlay");
    const box = el("div", "modal");
    
    const title = el("h3", "", "Добавить контакт");
    box.appendChild(title);
    
    const error = el("div", "error");
    const input = el("input", "field");
    input.placeholder = "Логин человека";
    input.maxLength = 20;
    input.autocomplete = "off";
    
    const actions = el("div", "actions");
    const back = el("button", "btn btn-ghost", "Назад");
    const add = el("button", "btn", "Добавить");
    actions.append(back, add);
    
    box.append(input, error, actions);
    modal.appendChild(box);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    $("modal-root").appendChild(modal);
    
    input.focus();
    
    back.addEventListener("click", () => {
        closeModal();
        showAddChooser();
    });
    
    const submit = async () => {
        error.textContent = "";
        const login = input.value.trim();
        if (!login) { error.textContent = "Введите логин"; return; }
        add.disabled = true;
        try {
            const data = await api("/contacts", { method: "POST", body: { login } });
            if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
            closeModal();
            openChat(data.chat.id);
        } catch (e) {
            error.textContent = e.message;
            add.disabled = false;
        }
    };
    
    add.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

function showCreateGroup() {
    const modal = el("div", "overlay");
    const box = el("div", "modal");
    
    const title = el("h3", "", "Новая группа");
    box.appendChild(title);
    
    const error = el("div", "error");
    const name = el("input", "field");
    name.placeholder = "Название группы";
    name.maxLength = 40;
    box.appendChild(name);
    box.appendChild(el("p", "hint", "Участники из ваших контактов:"));
    
    const pickBox = el("div", "pick-list");
    pickBox.appendChild(el("div", "empty-list", "Загрузка…"));
    box.appendChild(pickBox);
    
    const actions = el("div", "actions");
    const back = el("button", "btn btn-ghost", "Назад");
    const create = el("button", "btn", "Создать");
    actions.append(back, create);
    box.append(error, actions);
    
    modal.appendChild(box);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    $("modal-root").appendChild(modal);
    
    back.addEventListener("click", () => {
        closeModal();
        showAddChooser();
    });
    
    let contacts = [];
    api("/contacts").then(data => {
        contacts = data.contacts || [];
        
        pickBox.replaceChildren();
        if (!contacts.length) {
            pickBox.appendChild(el("div", "empty-list", "В контактах пока никого. Сначала добавьте людей через «Добавить контакт»."));
            create.disabled = true;
            return;
        }
        
        const checks = [];
        for (const u of contacts) {
            const label = el("label", "pick");
            const cb = el("input");
            cb.type = "checkbox";
            cb.value = u.id;
            checks.push(cb);
            label.append(cb, makeAvatar(u.login, true), el("span", "", u.login));
            pickBox.appendChild(label);
        }
        
        create.addEventListener("click", async () => {
            error.textContent = "";
            const groupName = name.value.trim();
            const members = checks.filter((c) => c.checked).map((c) => c.value);
            if (!groupName) { error.textContent = "Введите название группы"; return; }
            if (!members.length) { error.textContent = "Выберите хотя бы одного участника"; return; }
            create.disabled = true;
            try {
                const data = await api("/groups", { method: "POST", body: { name: groupName, members } });
                if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
                closeModal();
                openChat(data.chat.id);
            } catch (e) {
                error.textContent = e.message;
                create.disabled = false;
            }
        });
    }).catch(e => {
        error.textContent = e.message;
    });
}

function showChatInfo() {
    const c = activeChat();
    if (!c) return;
    
    const modal = el("div", "overlay");
    const box = el("div", "modal");
    
    const head = el("div", "member-row");
    head.append(makeAvatar(c.title), el("h3", "", c.title));
    head.lastChild.style.marginBottom = "0";
    box.appendChild(head);
    
    if (c.type === "group") {
        box.appendChild(el("p", "hint", `${t("members")}: ${c.members.length}`));
        for (const m of c.members) {
            const row = el("div", "member-row");
            const suffix = m.id === c.owner_id ? " (создатель)" : m.id === me.id ? " (вы)" : "";
            row.append(makeAvatar(m.login, true), el("span", "", m.login + suffix));
            box.appendChild(row);
        }
    } else {
        box.appendChild(el("p", "hint", t("personal_chat")));
    }
    
    const close = el("button", "btn btn-ghost btn-wide", "Закрыть");
    close.style.marginTop = "12px";
    close.addEventListener("click", closeModal);
    box.appendChild(close);
    
    modal.appendChild(box);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    $("modal-root").appendChild(modal);
}
