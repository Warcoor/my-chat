const API_URL = "https://mychat-backend-gnp6.onrender.com";

function Login() {
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;

    fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: login, pas: pass })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        alert(data.message);
        if (data.session_id) {
            localStorage.setItem("session_id", data.session_id);
        }
    })
    .catch(err => alert("Ошибка подключения к серверу (возможно, он просыпается): " + err));
}

function Register() {
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;

    fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: login, pas: pass })
    })
    .then(res => res.text())
    .then(data => alert(data))
    .catch(err => alert("Ошибка при регистрации: " + err));
}

function sendData() {
    const message = document.getElementById("message").value;
    const session_id = localStorage.getItem("session_id");
    const adress = document.getElementById("Who").value;

    if (!session_id) {
        alert("Вы не авторизованы!");
        return;
    }

    if (adress !== "") {
        fetch(`${API_URL}/save`, {
            method: "POST", // Исправлено с "Post" на "POST"
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: message,
                session_id: session_id,
                address: adress
            })
        })
        .then(res => res.text())
        .then(data => alert(data))
        .catch(err => alert("Ошибка отправки: " + err));
    } else {
        alert("Укажите получателя!");
    }
}

function getData() {
    const session_id = localStorage.getItem("session_id");

    if (!session_id) return;

    fetch(`${API_URL}/getlm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session_id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.backm) {
            document.getElementById("phrase").innerText = data.backm;
        }
    })
    .catch(err => console.error("Ошибка получения данных:", err));
}

function erase() {
    fetch(`${API_URL}/erase`)
        .then(res => res.text())
        .then(() => {
            const dl = document.getElementById("dl");
            if (dl) dl.showModal();
        })
        .catch(err => alert("Не удалось очистить: " + err));
}

function clos() {
    const dl = document.getElementById("dl");
    if (dl) dl.close();
}