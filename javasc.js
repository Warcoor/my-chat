const API_URL = "https://mychat-backend-gnp6.onrender.com";

async function Login() {
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log: login, pas: pass })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Ошибка входа");

        alert(data.message);
        if (data.session_id) {
            localStorage.setItem("session_id", data.session_id);
        }
    } catch (err) {
        alert(err.message);
    }
}

async function Register() {
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log: login, pas: pass })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

        alert(data.message);
    } catch (err) {
        alert(err.message);
    }
}

async function sendData() {
    const messageInput = document.getElementById("message");
    const adressInput = document.getElementById("Who");
    const session_id = localStorage.getItem("session_id");

    if (!session_id) {
        alert("Вы не авторизованы!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: messageInput.value,
                session_id: session_id,
                address: adressInput.value
            })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Ошибка отправки");

        alert(data.message);
        messageInput.value = "";
    } catch (err) {
        alert(err.message);
    }
}

async function getData() {
    const session_id = localStorage.getItem("session_id");

    if (!session_id) {
        alert("Авторизуйтесь, чтобы получать сообщения");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/getlm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: session_id })
        });
        const data = await res.json();

        if (res.ok && data.backm) {
            document.getElementById("phrase").innerText = data.backm;
        }
    } catch (err) {
        console.error("Ошибка получения данных:", err);
    }
}