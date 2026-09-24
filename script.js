// Замените на URL вашего сервера Render
const API_URL = "https://mychat-backend.onrender.com";

let lastSeenId = null;
let pollInterval = null;

// Проверяем авторизацию при загрузке страницы
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

    // Сбрасываем ID и очищаем чат
    lastSeenId = null;
    document.getElementById("messages-container").innerHTML = "";

    // Сразу получаем историю и запускаем таймер на проверку новых сообщений
    fetchMessages();
    pollInterval = setInterval(fetchMessages, 3000);
}

function logout() {
    localStorage.removeItem("session_id");
    clearInterval(pollInterval);
    document.getElementById("chat-section").classList.add("hidden");
    document.getElementById("auth-section").classList.remove("hidden");
}

async function sendMessage() {
    const sessionId = localStorage.getItem("session_id");
    const address = document.getElementById("receiver-login").value;
    const text = document.getElementById("message-text").value;

    if (!text || !address) {
        alert("Заполните логин получателя и текст сообщения!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                address: address,
                text: text
            })
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("message-text").value = "";
            // Сразу запрашиваем обновленные сообщения
            fetchMessages();
        } else {
            alert(data.error || "Ошибка отправки");
        }
    } catch (err) {
        alert("Ошибка сети при отправке");
    }
}

async function fetchMessages() {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;

    try {
        const res = await fetch(`${API_URL}/get_messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                last_id: lastSeenId
            })
        });

        if (res.status === 401) {
            // Если сессия истекла или недействительна
            logout();
            return;
        }

        const data = await res.json();

        if (res.ok && data.messages && data.messages.length > 0) {
            const container = document.getElementById("messages-container");

            data.messages.forEach(msg => {
                const msgDiv = document.createElement("div");
                msgDiv.className = "message-item";
                msgDiv.innerHTML = `<strong>От: ${msg.sender}</strong>${msg.text}`;
                container.appendChild(msgDiv);

                // Фиксируем ID последнего отображенного сообщения
                lastSeenId = msg.id;
            });

            // Автоматически скроллим контейнер вниз при появлении новых сообщений
            container.scrollTop = container.scrollHeight;
        }
    } catch (err) {
        console.error("Ошибка при получении сообщений:", err);
    }
}
