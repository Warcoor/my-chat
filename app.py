import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Полностью разрешаем CORS для всех запросов
CORS(app, resources={r"/*": {"origins": "*"}})

# Подключение через переменную окружения
MONGO_URI = os.environ.get("MONGO_URI", "your_fallback_mongo_uri_here")
client = MongoClient(MONGO_URI)

db = client['chat_db']
users_collection = db['users']
messages_collection = db['messages']

# Хранилище сессий
sessions = {}

@app.route('/')
def home():
    return jsonify({"status": "ok", "message": "Backend is running"})

@app.route("/login", methods=["POST", "OPTIONS"])
def checklogin():
    # Отвечаем браузеру на проверку CORS
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    login = data.get('log')
    password = data.get('pas')

    if not login or not password:
        return jsonify({"error": "Заполните все поля!"}), 400

    user = users_collection.find_one({"login": login})

    if user and check_password_hash(user['password'], password):
        session_id = str(uuid.uuid4())
        user_id = str(user['_id'])
        sessions[session_id] = user_id

        return jsonify({
            "message": "Вы успешно вошли!",
            "session_id": session_id
        }), 200

    return jsonify({"error": "Неверный логин или пароль!"}), 401

@app.route("/register", methods=["POST", "OPTIONS"])
def registration():
    # Отвечаем браузеру на проверку CORS
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    login = data.get('log')
    password = data.get('pas')

    if not login or not password:
        return jsonify({"error": "Заполните все поля!"}), 400

    if users_collection.find_one({"login": login}):
        return jsonify({"error": "Данный логин уже занят!"}), 400

    hashed_password = generate_password_hash(password)
    users_collection.insert_one({
        "login": login,
        "password": hashed_password
    })

    return jsonify({"message": "Вы успешно зарегистрированы!"}), 201

@app.route("/save", methods=["POST", "OPTIONS"])
def save():
    # Отвечаем браузеру на проверку CORS
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    text = data.get('text')
    session_id = data.get('session_id')
    address_login = data.get('address')

    user_id = sessions.get(session_id)
    if not user_id:
        return jsonify({"error": "Вы не авторизованы"}), 401

    if not text or not address_login:
        return jsonify({"error": "Введите сообщение и получателя"}), 400

    recipient = users_collection.find_one({"login": address_login})
    if not recipient:
        return jsonify({"error": "Получатель не найден"}), 404

    messages_collection.insert_one({
        "text": text,
        "sender_id": user_id,
        "receiver_id": str(recipient['_id'])
    })

    return jsonify({"message": "Сообщение отправлено!"}), 200

@app.route("/getlm", methods=["POST", "OPTIONS"])
def getlm():
    # Отвечаем браузеру на проверку CORS
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    session_id = data.get("session_id")

    user_id = sessions.get(session_id)
    if not user_id:
        return jsonify({"error": "Неавторизован"}), 401

    last_message = messages_collection.find_one(
        {"receiver_id": user_id},
        sort=[('_id', -1)]
    )

    lastm = last_message["text"] if last_message else "Нет сообщений"
    return jsonify({"backm": lastm}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)