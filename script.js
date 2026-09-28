// URL вашего сервера на Render
const API_URL = "https://mychat-backend-gnp6.onrender.com";

const POLL_ACTIVE_MS = 1000;   // чат открыт и вкладка видна
const POLL_IDLE_MS = 3000;     // иначе реже
const TYPING_THROTTLE_MS = 1500;
const TOKEN_KEY = "mychat_token";

// ------------------------------------------------------------ Состояние
let token = localStorage.getItem(TOKEN_KEY);
let me = null;
let chats = [];
let activeId = null;
let lastMsgId = null;
let lastSender = null;          // для группировки сообщений подряд
let renderedIds = new Set();    // защита от повторного показа одного сообщения
let pollTimer = null;
let polling = false;
let localJobs = new Map();      // отправляемые сообщения: client_id -> job
let pollGen = 0;
let lastTypingSent = 0;
let lastListSig = "";

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
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

// ------------------------------------------------------------ Валидация (дублирует серверную)
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
    $("app").classList.add("hidden");
    $("app").classList.remove("chat-open");
    $("auth").classList.remove("hidden");
    $("auth-pas").value = "";
}

function startApp(user) {
    me = user;
    $("auth").classList.add("hidden");
    $("app").classList.remove("hidden");
    fillAvatar($("me-avatar"), me.login);
    $("me-name").textContent = me.login;
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
    if (chat.type === "private") return "печатает…";
    if (chat.typing.length === 1) return chat.typing[0] + " печатает…";
    return chat.typing.length + " человека печатают…";
}

function renderChatList() {
    const sig = JSON.stringify([chats, activeId, me && me.login]);
    if (sig === lastListSig) return;
    lastListSig = sig;

    const list = $("chat-list");
    list.replaceChildren();

    if (!chats.length) {
        list.appendChild(el("div", "empty-list", "Чатов пока нет. Нажмите «Добавить чат», чтобы найти человека по логину или создать группу."));
        return;
    }

    for (const c of chats) {
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
        status.textContent = c.type === "group" ? `Участников: ${c.members.length}` : "Личный чат";
    }
}

async function openChat(chatId) {
    closeModal();
    activeId = chatId;
    lastMsgId = null;
    lastSender = null;
    renderedIds = new Set();
    lastTypingSent = 0;

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

    if (!mine) {
        const slot = el("div", "avatar-slot");
        if (firstInRun) slot.appendChild(makeAvatar(m.sender, true));
        row.appendChild(slot);
    }

    const bubble = el("div", "bubble");
    if (!mine && isGroup && firstInRun) {
        const author = el("span", "author", m.sender);
        author.style.color = avatarColor(m.sender);
        bubble.appendChild(author);
    }
    bubble.appendChild(document.createTextNode(m.text));
    bubble.appendChild(el("span", "time", timeLabel(m.created_at)));
    row.appendChild(bubble);
    return row;
}

function appendMessages(list, forceScroll = false) {
    const box = $("messages");
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    let added = false;
    let mineAdded = false;

    for (const m of list) {
        if (renderedIds.has(m.id)) continue;

        // Это наше собственное сообщение, которое уже показано на экране - просто подтверждаем его
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

// ------------------------------------------------------------ Отправка
// Сообщение появляется на экране мгновенно (серым), а на сервер уходит в фоне.
// Поле ввода очищается сразу, поэтому новый текст никогда не смешивается со старым.
function sendMessage() {
    if (!activeId) return;
    const input = $("message-text");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.focus();
    lastTypingSent = 0;

    const job = { chatId: activeId, text, clientId: uuid(), done: false, el: null };
    localJobs.set(job.clientId, job);

    removeEmptyNote();
    const box = $("messages");
    job.el = buildRow(
        { id: "local-" + job.clientId, sender_id: me.id, sender: me.login, text, created_at: new Date().toISOString() },
        true
    );
    job.el.addEventListener("click", () => {
        if (job.el.classList.contains("failed")) postJob(job);
    });
    box.appendChild(job.el);
    box.scrollTop = box.scrollHeight;

    postJob(job);
}

async function postJob(job) {
    const timeEl = job.el.querySelector(".time");
    job.el.classList.remove("failed");
    job.el.classList.add("pending");
    if (timeEl) timeEl.textContent = "отправка…";

    try {
        const data = await api(`/chats/${job.chatId}/messages`, {
            method: "POST",
            body: { text: job.text, client_id: job.clientId },
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

// Статус «печатает…»: первый сигнал уходит сразу с первой буквы, дальше не чаще раза в 1,5 с
function onTyping() {
    if (!activeId || !$("message-text").value.trim()) return;
    const t = Date.now();
    if (t - lastTypingSent < TYPING_THROTTLE_MS) return;
    lastTypingSent = t;
    api(`/chats/${activeId}/typing`, { method: "POST" }).catch(() => {});
}

// ------------------------------------------------------------ Модальные окна
function closeModal() { $("modal-root").replaceChildren(); }

function openModal(build) {
    const overlay = el("div", "overlay");
    const modal = el("div", "modal");
    overlay.appendChild(modal);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) closeModal(); });
    $("modal-root").replaceChildren(overlay);
    build(modal);
}

function showAddChooser() {
    openModal((modal) => {
        modal.appendChild(el("h3", "", "Добавить чат"));

        const a = el("button", "row-btn");
        a.append(el("b", "", "Добавить контакт"), el("span", "", "Найти человека по логину и начать чат"));
        a.addEventListener("click", showAddContact);

        const b = el("button", "row-btn");
        b.append(el("b", "", "Создать группу"), el("span", "", "Выбрать людей из ваших контактов"));
        b.addEventListener("click", showCreateGroup);

        const cancel = el("button", "btn btn-ghost btn-wide", "Отмена");
        cancel.addEventListener("click", closeModal);
        modal.append(a, b, cancel);
    });
}

function showAddContact() {
    openModal((modal) => {
        modal.appendChild(el("h3", "", "Добавить контакт"));
        const error = el("div", "error");
        const input = el("input", "field");
        input.placeholder = "Логин человека";
        input.maxLength = 20;
        input.autocomplete = "off";

        const actions = el("div", "actions");
        const back = el("button", "btn btn-ghost", "Назад");
        const add = el("button", "btn", "Добавить");
        actions.append(back, add);
        modal.append(input, error, actions);
        input.focus();

        back.addEventListener("click", showAddChooser);
        const submit = async () => {
            error.textContent = "";
            const login = input.value.trim();
            if (!login) { error.textContent = "Введите логин"; return; }
            add.disabled = true;
            try {
                const data = await api("/contacts", { method: "POST", body: { login } });
                if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
                openChat(data.chat.id);
            } catch (e) {
                error.textContent = e.message;
                add.disabled = false;
            }
        };
        add.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    });
}

function showCreateGroup() {
    openModal(async (modal) => {
        modal.appendChild(el("h3", "", "Новая группа"));
        const error = el("div", "error");
        const name = el("input", "field");
        name.placeholder = "Название группы";
        name.maxLength = 40;
        modal.appendChild(name);
        modal.appendChild(el("p", "hint", "Участники из ваших контактов:"));

        const box = el("div", "pick-list");
        box.appendChild(el("div", "empty-list", "Загрузка…"));
        modal.appendChild(box);

        const actions = el("div", "actions");
        const back = el("button", "btn btn-ghost", "Назад");
        const create = el("button", "btn", "Создать");
        actions.append(back, create);
        modal.append(error, actions);
        back.addEventListener("click", showAddChooser);

        let contacts = [];
        try {
            contacts = (await api("/contacts")).contacts;
        } catch (e) {
            error.textContent = e.message;
        }

        box.replaceChildren();
        if (!contacts.length) {
            box.appendChild(el("div", "empty-list", "В контактах пока никого. Сначала добавьте людей через «Добавить контакт»."));
            create.disabled = true;
        }
        const checks = [];
        for (const u of contacts) {
            const label = el("label", "pick");
            const cb = el("input");
            cb.type = "checkbox";
            cb.value = u.id;
            checks.push(cb);
            label.append(cb, makeAvatar(u.login, true), el("span", "", u.login));
            box.appendChild(label);
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
                openChat(data.chat.id);
            } catch (e) {
                error.textContent = e.message;
                create.disabled = false;
            }
        });
    });
}

function showChatInfo() {
    const c = activeChat();
    if (!c) return;
    openModal((modal) => {
        const head = el("div", "member-row");
        head.append(makeAvatar(c.title), el("h3", "", c.title));
        head.lastChild.style.marginBottom = "0";
        modal.appendChild(head);

        if (c.type === "group") {
            modal.appendChild(el("p", "hint", `Участников: ${c.members.length}`));
            for (const m of c.members) {
                const row = el("div", "member-row");
                const suffix = m.id === c.owner_id ? " (создатель)" : m.id === me.id ? " (вы)" : "";
                row.append(makeAvatar(m.login, true), el("span", "", m.login + suffix));
                modal.appendChild(row);
            }
        } else {
            modal.appendChild(el("p", "hint", "Личный чат. Здесь позже появится больше информации о человеке."));
        }
        const close = el("button", "btn btn-ghost btn-wide", "Закрыть");
        close.style.marginTop = "12px";
        close.addEventListener("click", closeModal);
        modal.appendChild(close);
    });
}

// ------------------------------------------------------------ Инициализация
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

// ------------------------------------------------------------ Мобильная клавиатура
// Высота приложения = видимая область экрана, поэтому шапка остаётся на месте,
// а поле ввода поднимается над клавиатурой.
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

(async function init() {
    if (!token) return;
    try {
        const data = await api("/me");
        startApp(data.user);
    } catch (_) {
        resetSession();
    }
})();
