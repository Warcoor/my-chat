import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с GitHub Pages

# Подключение к MongoDB
mongo_uri = "mongodb+srv://daniilmax09_db_user:H3RgcaHz7vfxTr6Y@mychat.p0eb99n.mongodb.net/?appName=MyChat&compressors=zlib"
client = MongoClient(mongo_uri)

# Создаем/выбираем базу данных и коллекции
db = client['chat_db']
users_collection = db['users']
messages_collection = db['messages']

# Хранилище сессий в памяти
sessions = {}


@app.route('/')
def home():
    return "Flask + MongoDB backend is running!"


@app.route("/login", methods=["POST"])
def checklogin():
    data = request.json
    login = data.get('log')
    password = data.get('pas')

    # Ищем пользователя в MongoDB
    user = users_collection.find_one({"login": login})

    if user:
        if user['password'] == password:
            session_id = str(uuid.uuid4())
            # В MongoDB у каждого документа есть уникальный _id (приводим к str)
            user_id = str(user['_id'])
            sessions[session_id] = user_id

            return jsonify({
                "message": "Вы успешно вошли в свой аккаунт!",
                "session_id": session_id
            })
        else:
            return jsonify({"message": "Неверный пароль!"})
    else:
        return jsonify({"message": "Данного аккаунта не существует, зарегистрируйтесь пожалуйста!"})


@app.route("/register", methods=["POST"])
def registration():
    data = request.json
    login = data.get('log')
    password = data.get('pas')

    # Проверяем, существует ли логин
    user = users_collection.find_one({"login": login})

    if user is None:
        # Создаем нового пользователя
        users_collection.insert_one({
            "login": login,
            "password": password
        })
        return "Вы успешно зарегистрированы!"
    else:
        return "Данный логин уже занят"


@app.route("/save", methods=["POST"])
def save():
    data = request.json
    text = data.get('text')
    session_id = data.get('session_id')
    address_login = data.get('address')  # Логин получателя

    user_id = sessions.get(session_id)  # ID отправителя
    if not user_id:
        return "Вы не авторизованы", 401

    # Ищем получателя по его логину
    recipient = users_collection.find_one({"login": address_login})
    if not recipient:
        return "Получатель не найден", 404

    recipient_id = str(recipient['_id'])

    # Сохраняем сообщение в MongoDB
    messages_collection.insert_one({
        "text": text,
        "sender_id": user_id,
        "receiver_id": recipient_id
    })

    return "Сохранено!"


@app.route("/getlm", methods=["POST"])
def getlm():
    data = request.json
    session_id = data.get("session_id")

    user_id = sessions.get(session_id)
    if not user_id:
        return jsonify({"backm": "None"}), 401

    # Получаем ПОСЛЕДНЕЕ сообщение для этого пользователя
    # sort([('_id', -1)]) берет самый свежий документ
    last_message = messages_collection.find_one(
        {"receiver_id": user_id},
        sort=[('_id', -1)]
    )

    lastm = last_message["text"] if last_message else "None"
    return jsonify({"backm": lastm})


@app.route("/erase")
def erase():
    # Очищаем таблицу сообщений
    messages_collection.delete_many({})
    return "0"


if __name__ == "__main__":
    # Для деплоя на Render важно слушать порт из переменных окружения
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)