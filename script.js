const API_URL = "https://mychat-backend-gnp6.onrender.com"; 

let lastSeenId = null;
let pollInterval = null;
let currentChatUser = null;
let activeChats = new Set(); // Храним список открытых чатов

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
    
    // Запускаем автоматический забор сообщений раз в 3 секунды
    if (!pollInterval) {
        pollInterval = setInterval(fetchMessages, 3000);
    }
}

function logout() {
    localStorage.removeItem("session_id");
    clearInterval(pollInterval);
    pollInterval = null;
    document.getElementById("chat-section").classList.add("hidden");
    document.getElementById("auth-section").classList.remove("hidden");
}

// Создание нового чата через ввод юзера
function startNewChat() {
    const userInput = document.getElementById("new-chat-user");
    const targetUser = userInput.value.trim();

    if (!targetUser) return;

    activeChats.add(targetUser);
    renderChatsList();
    openChat(targetUser);
    userInput.value = "";
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
    lastSeenId = null; // Сбрасываем ID, чтобы загрузить всю переписку заново
    document.getElementById("current-chat-title").innerText = `Чат с: ${username}`;
    document.getElementById("messages-container").innerHTML = "";
    
    renderChatsList();
    fetchMessages();
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
                
                // Мои сообщения - темные справа, чужие - светлые слева
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
