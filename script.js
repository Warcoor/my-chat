const API_URL = "https://mychat-backend-gnp6.onrender.com"; 

let lastSeenId = null;
let pollInterval = null;
let currentChatUser = null;
let activeChats = new Set();
let myLogin = localStorage.getItem("my_login") || "";

window.onload = () => {
    const sessionId = localStorage.getItem("session_id");
    if (sessionId) {
        showChat();
    }
};

function showError(msg) {
    document.getElementById("auth-error").innerText = msg;
}

async function login() {
    showError("");
    const log = document.getElementById("auth-login").value;
    const pas = document.getElementById("auth-pas").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log, pas })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("session_id", data.session_id);
            myLogin = data.my_login || log;
            localStorage.setItem("my_login", myLogin);
            showChat();
        } else {
            showError(data.error || "Ошибка входа");
        }
    } catch (err) {
        showError("Не удалось связаться с сервером");
    }
}

async function register() {
    showError("");
    const log = document.getElementById("auth-login").value;
    const pas = document.getElementById("auth-pas").value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log, pas })
        });

        const data = await res.json();
        if (res.ok) {
            alert("Регистрация успешна! Теперь нажмите 'Войти'");
        } else {
            showError(data.error || "Ошибка регистрации");
        }
    } catch (err) {
        showError("Не удалось связаться с сервером");
    }
}

function showChat() {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("chat-section").classList.remove("hidden");
    
    if (myLogin) {
        document.getElementById("user-login-display").innerText = myLogin;
        document.getElementById("user-avatar").innerText = myLogin.charAt(0).toUpperCase();
    }

    loadUserChats();

    if (!pollInterval) {
        pollInterval = setInterval(() => {
            fetchMessages();
            loadUserChats();
        }, 3000);
    }
}

async function loadUserChats() {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;

    try {
        const res = await fetch(`${API_URL}/get_chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.chats) {
                let hasNewChat = false;

                data.chats.forEach(chatUser => {
                    if (!activeChats.has(chatUser)) {
                        activeChats.add(chatUser);
                        hasNewChat = true;
                    }
                });

                if (hasNewChat) {
                    renderChatsList();
                }
            }
        }
    } catch (err) {
        console.error("Ошибка обновления списка чатов:", err);
    }
}

function logout() {
    localStorage.removeItem("session_id");
    localStorage.removeItem("my_login");
    clearInterval(pollInterval);
    pollInterval = null;
    currentChatUser = null;
    activeChats.clear();
    document.getElementById("chats-list").innerHTML = "";
    document.getElementById("chat-section").classList.add("hidden");
    document.getElementById("auth-section").classList.remove("hidden");
}

async function startNewChat() {
    const userInput = document.getElementById("new-chat-user");
    const targetUser = userInput.value.trim();
    const sessionId = localStorage.getItem("session_id");

    if (!targetUser) return;

    try {
        const res = await fetch(`${API_URL}/check_user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                target_login: targetUser
            })
        });

        const data = await res.json();

        if (res.ok) {
            activeChats.add(targetUser);
            renderChatsList();
            openChat(targetUser);
            userInput.value = "";
        } else {
            alert(data.error || "Ошибка при поиске пользователя");
        }
    } catch (err) {
        alert("Ошибка сети при проверке пользователя");
    }
}

function renderChatsList() {
    const container = document.getElementById("chats-list");
    container.innerHTML = "";

    activeChats.forEach(user => {
        const div = document.createElement("div");
        div.className = `chat-item ${user === currentChatUser ? 'active' : ''}`;
        div.innerText = user;
        div.onclick = () => openChat(user);
        container.appendChild(div);
    });
}

function openChat(username) {
    currentChatUser = username;
    lastSeenId = null;
    document.getElementById("current-chat-title").innerText = `Чат с: ${username}`;
    document.getElementById("messages-container").innerHTML = "";
    
    document.getElementById("chat-section").classList.add("mobile-chat-active");

    renderChatsList();
    fetchMessages();
}

function closeMobileChat() {
    document.getElementById("chat-section").classList.remove("mobile-chat-active");
}

async function sendMessage() {
    const sessionId = localStorage.getItem("session_id");
    const text = document.getElementById("message-text").value;

    if (!currentChatUser) {
        alert("Выберите чат слева или создайте новый!");
        return;
    }

    if (!text) return;

    try {
        const res = await fetch(`${API_URL}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                address: currentChatUser,
                text: text
            })
        });

        if (res.ok) {
            document.getElementById("message-text").value = "";
            fetchMessages();
        } else {
            const data = await res.json();
            alert(data.error || "Ошибка отправки");
        }
    } catch (err) {
        alert("Ошибка сети при отправке");
    }
}

async function fetchMessages() {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId || !currentChatUser) return;

    try {
        const res = await fetch(`${API_URL}/get_messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                address: currentChatUser,
                last_id: lastSeenId
            })
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();

        if (res.ok && data.messages && data.messages.length > 0) {
            const container = document.getElementById("messages-container");

            data.messages.forEach(msg => {
                const msgDiv = document.createElement("div");
                msgDiv.className = `message-item ${msg.is_my ? 'my' : 'other'}`;
                msgDiv.innerHTML = `<strong>${msg.sender}</strong>${msg.text}`;
                
                container.appendChild(msgDiv);
                lastSeenId = msg.id;
            });

            container.scrollTop = container.scrollHeight;
        }
    } catch (err) {
        console.error("Ошибка при получении сообщений:", err);
    }
}
