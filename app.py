import os
import uuid
import certifi
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId

app = Flask(__name__)
CORS(app)

# Глобальный перехватчик CORS OPTIONS
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        return response, 200

# Подключение к MongoDB с передачей SSL-сертификата certifi
MONGO_URI = os.environ.get("MONGO_URI", "your_fallback_mongo_uri_here")
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())

db = client['chat_db']
users_collection = db['users']
messages_collection = db['messages']

sessions = {}

@app.route('/')
def home():
    return jsonify({"status": "ok", "message": "Backend is running"})

@app.route("/login", methods=["POST"])
def checklogin():
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

@app.route("/register", methods=["POST"])
def registration():
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

@app.route("/save", methods=["POST"])
def save():
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

# Эндпоинт получения списка сообщений (всех или только новых)
@app.route("/get_messages", methods=["POST"])
def get_messages():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    last_id = data.get("last_id")

    user_id = sessions.get(session_id)
    if not user_id:
        return jsonify({"error": "Неавторизован"}), 401

    query = {"receiver_id": user_id}

    # Если передан last_id, запрашиваем только более свежие записи
    if last_id:
        try:
            query["_id"] = {"$gt": ObjectId(last_id)}
        except Exception:
            pass

    new_messages = messages_collection.find(query).sort('_id', 1)

    message_list = []
    for msg in new_messages:
        # Поиск логина отправителя по его _id
        sender_id_val = msg["sender_id"]
        if isinstance(sender_id_val, str) and len(sender_id_val) == 24:
            sender = users_collection.find_one({"_id": ObjectId(sender_id_val)})
        else:
            sender = users_collection.find_one({"_id": sender_id_val})

        sender_login = sender["login"] if sender else "Неизвестный"

        message_list.append({
            "id": str(msg["_id"]),
            "sender": sender_login,
            "text": msg["text"]
        })

    return jsonify({"messages": message_list}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)