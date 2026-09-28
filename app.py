import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import certifi
from bson.objectid import ObjectId
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 МБ для фото
CORS(app)

# ---------------------------------------------------------------- БД
MONGO_URI = os.environ["MONGO_URI"]
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), tz_aware=True)
db = client["chat_db"]

users_col = db["users"]
sessions_col = db["sessions"]
contacts_col = db["contacts"]
chats_col = db["chats"]
messages_col = db["chat_messages"]
typing_col = db["typing"]

# ---------------------------------------------------------------- Ограничения
LOGIN_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
PASSWORD_MIN, PASSWORD_MAX = 6, 64
MESSAGE_MAX = 2000
GROUP_NAME_MAX = 40
GROUP_MEMBERS_MAX = 50
SESSION_DAYS = 30
TYPING_TTL_SECONDS = 3


def now():
    return datetime.now(timezone.utc)


def err(message, code=400):
    return jsonify({"error": message}), code


def as_str(v):
    """Принимаем только строки. Защита от NoSQL-инъекций."""
    return v if isinstance(v, str) else None


def as_oid(v):
    if not isinstance(v, str) or len(v) != 24:
        return None
    try:
        return ObjectId(v)
    except Exception:
        return None


def validate_login(login):
    if not login or not LOGIN_RE.match(login):
        return "Логин: 3–20 символов, только латиница, цифры и «_»"
    return None


def validate_password(password):
    if not password or not (PASSWORD_MIN <= len(password) <= PASSWORD_MAX):
        return f"Пароль: от {PASSWORD_MIN} до {PASSWORD_MAX} символов"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Пароль должен содержать хотя бы одну букву и одну цифру"
    if " " in password:
        return "Пароль не должен содержать пробелов"
    return None


def user_online(u):
    if not u.get("last_seen"):
        return False
    return now() - u["last_seen"] <= timedelta(minutes=5)


def user_dto(u):
    return {
        "id": str(u["_id"]),
        "login": u["login"],
        "name": u.get("name") or u["login"],
        "bio": u.get("bio", ""),
        "avatar": u.get("avatar", ""),
        "theme": u.get("theme", "light"),
        "language": u.get("language", "ru"),
        "online": user_online(u),
        "last_seen": u.get("last_seen").isoformat() if u.get("last_seen") else None,
    }


def init_db():
    # Старым пользователям добавляем login_lower
    for u in users_col.find({"login_lower": {"$exists": False}}):
        users_col.update_one({"_id": u["_id"]}, {"$set": {"login_lower": u["login"].lower()}})

    def idx(col, keys, **kw):
        try:
            col.create_index(keys, **kw)
        except Exception as e:
            print("Index warning:", e)

    idx(users_col, [("login_lower", ASCENDING)], unique=True)
    idx(sessions_col, [("token", ASCENDING)], unique=True)
    idx(sessions_col, [("created_at", ASCENDING)], expireAfterSeconds=SESSION_DAYS * 86400)
    idx(contacts_col, [("owner_id", ASCENDING), ("contact_id", ASCENDING)], unique=True)
    idx(chats_col, [("members", ASCENDING), ("updated_at", DESCENDING)])
    idx(chats_col, [("private_key", ASCENDING)], unique=True, sparse=True)
    idx(messages_col, [("chat_id", ASCENDING), ("_id", ASCENDING)])
    idx(messages_col, [("sender_id", ASCENDING), ("client_id", ASCENDING)], unique=True)
    idx(typing_col, [("chat_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    idx(typing_col, [("at", ASCENDING)], expireAfterSeconds=30)


init_db()


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        sess = sessions_col.find_one({"token": token}) if token else None
        if not sess:
            return err("Не авторизован", 401)
        user = users_col.find_one({"_id": sess["user_id"]})
        if not user:
            return err("Не авторизован", 401)
        g.user = user
        g.token = token
        return f(*args, **kwargs)

    return wrapper


def get_chat_for_user(chat_id_str):
    cid = as_oid(chat_id_str)
    if not cid:
        return None
    return chats_col.find_one({"_id": cid, "members": g.user["_id"]})


def users_map(ids):
    ids = [i for i in ids if i is not None]
    if not ids:
        return {}
    return {u["_id"]: u for u in users_col.find({"_id": {"$in": list(ids)}})}


def message_dto(m, umap):
    sender = umap.get(m["sender_id"])
    return {
        "id": str(m["_id"]),
        "chat_id": str(m["chat_id"]),
        "sender_id": str(m["sender_id"]),
        "sender": sender["login"] if sender else "Удалённый пользователь",
        "text": m.get("text", ""),
        "image": m.get("image"),
        "created_at": m["created_at"].isoformat(),
        "client_id": m.get("client_id"),
        "reply_to": m.get("reply_to"),
        "reply_to_text": m.get("reply_to_text"),
        "read_by": [str(uid) for uid in m.get("read_by", [])],
    }


def chats_for_user(me):
    chats = list(chats_col.find({"members": me["_id"]}).sort("updated_at", DESCENDING))
    if not chats:
        return []

    member_ids = {m for c in chats for m in c["members"]}
    umap = users_map(member_ids)

    since = now() - timedelta(seconds=TYPING_TTL_SECONDS)
    typing_by_chat = {}
    for t in typing_col.find(
        {"chat_id": {"$in": [c["_id"] for c in chats]}, "user_id": {"$ne": me["_id"]}, "at": {"$gt": since}}
    ):
        u = umap.get(t["user_id"])
        if u:
            typing_by_chat.setdefault(t["chat_id"], []).append(u["login"])

    result = []
    for c in chats:
        members = [user_dto(umap[m]) for m in c["members"] if m in umap]
        if c["type"] == "private":
            other = next((m for m in members if m["id"] != str(me["_id"])), None)
            title = other["login"] if other else "Удалённый пользователь"
        else:
            title = c.get("name", "Группа")

        q = {"chat_id": c["_id"], "sender_id": {"$ne": me["_id"]}}
        last_read = as_oid(c.get("read", {}).get(str(me["_id"])))
        if last_read:
            q["_id"] = {"$gt": last_read}
        unread = messages_col.count_documents(q, limit=100)

        last = c.get("last_message")
        result.append(
            {
                "id": str(c["_id"]),
                "type": c["type"],
                "title": title,
                "members": members,
                "owner_id": str(c["owner_id"]) if c.get("owner_id") else None,
                "unread": unread,
                "typing": typing_by_chat.get(c["_id"], []),
                "last_message": (
                    {"text": last["text"], "sender": last["sender"], "at": last["at"].isoformat()} if last else None
                ),
            }
        )
    return result


def chat_dto_by_id(chat_id, me):
    return next((c for c in chats_for_user(me) if c["id"] == str(chat_id)), None)


def get_or_create_private_chat(a, b):
    key = ":".join(sorted([str(a), str(b)]))
    doc = {
        "type": "private",
        "members": [a, b],
        "created_at": now(),
        "updated_at": now(),
        "read": {},
        "private_key": key,
    }
    try:
        return chats_col.find_one_and_update(
            {"private_key": key},
            {"$setOnInsert": doc},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        return chats_col.find_one({"private_key": key})


# ================================================================ АВТОРИЗАЦИЯ
@app.get("/")
def home():
    return jsonify({"status": "ok", "message": "Backend is running"})


@app.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    login = as_str(data.get("log"))
    password = as_str(data.get("pas"))
    login = login.strip() if login else login

    problem = validate_login(login) or validate_password(password)
    if problem:
        return err(problem)

    try:
        users_col.insert_one(
            {
                "login": login,
                "login_lower": login.lower(),
                "password": generate_password_hash(password),
                "created_at": now(),
                "last_seen": now(),
                "name": login,
                "bio": "",
                "avatar": "",
                "theme": "light",
                "language": "ru",
            }
        )
    except DuplicateKeyError:
        return err("Данный логин уже занят")

    return jsonify({"message": "Вы успешно зарегистрированы!"}), 201


@app.post("/login")
def login_route():
    data = request.get_json(silent=True) or {}
    login = as_str(data.get("log"))
    password = as_str(data.get("pas"))
    if not login or not password:
        return err("Заполните все поля")

    user = users_col.find_one({"login_lower": login.strip().lower()})
    if not user or not check_password_hash(user["password"], password):
        return err("Неверный логин или пароль", 401)

    users_col.update_one({"_id": user["_id"]}, {"$set": {"last_seen": now()}})
    token = secrets.token_urlsafe(32)
    sessions_col.insert_one({"token": token, "user_id": user["_id"], "created_at": now()})
    return jsonify({"token": token, "user": user_dto(users_col.find_one({"_id": user["_id"]}))})


@app.post("/logout")
@auth_required
def logout():
    sessions_col.delete_one({"token": g.token})
    return jsonify({"ok": True})


# ================================================================ ПРОФИЛЬ
@app.get("/me")
@auth_required
def me():
    return jsonify({"user": user_dto(g.user)})


@app.patch("/me")
@auth_required
def patch_me():
    data = request.get_json(silent=True) or {}
    update = {"last_seen": now()}

    if "name" in data:
        name = as_str(data.get("name"))
        if name is not None:
            name = name.strip()
            if not name:
                return err("Имя не может быть пустым")
            if len(name) > 50:
                return err("Имя слишком длинное")
            update["name"] = name

    if "bio" in data:
        bio = as_str(data.get("bio"))
        if bio is not None:
            bio = bio.strip()
            if len(bio) > 150:
                return err("Описание слишком длинное")
            update["bio"] = bio

    if "avatar" in data:
        avatar = as_str(data.get("avatar"))
        if avatar is not None:
            if len(avatar) > 2000000:  # 2MB base64 limit
                return err("Аватарка слишком большая")
            update["avatar"] = avatar

    if "theme" in data:
        theme = as_str(data.get("theme"))
        if theme in {"light", "dark", "auto"}:
            update["theme"] = theme

    if "language" in data:
        lang = as_str(data.get("language"))
        if lang in {"ru", "en", "ua"}:
            update["language"] = lang

    if update:
        users_col.update_one({"_id": g.user["_id"]}, {"$set": update})

    user = users_col.find_one({"_id": g.user["_id"]})
    return jsonify({"user": user_dto(user)})


@app.post("/me/online")
@auth_required
def set_online():
    users_col.update_one({"_id": g.user["_id"]}, {"$set": {"last_seen": now()}})
    return jsonify({"ok": True})


# ================================================================ КОНТАКТЫ
@app.get("/contacts")
@auth_required
def list_contacts():
    links = list(contacts_col.find({"owner_id": g.user["_id"]}))
    umap = users_map([l["contact_id"] for l in links])
    contacts = sorted((user_dto(u) for u in umap.values()), key=lambda u: u["login"].lower())
    return jsonify({"contacts": contacts})


@app.post("/contacts")
@auth_required
def add_contact():
    data = request.get_json(silent=True) or {}
    login = as_str(data.get("login"))
    if not login or not login.strip():
        return err("Введите логин")

    target = users_col.find_one({"login_lower": login.strip().lower()})
    if not target:
        return err("Пользователь не найден", 404)
    if target["_id"] == g.user["_id"]:
        return err("Нельзя добавить самого себя")

    try:
        contacts_col.insert_one({"owner_id": g.user["_id"], "contact_id": target["_id"], "created_at": now()})
    except DuplicateKeyError:
        pass  # уже в контактах

    chat = get_or_create_private_chat(g.user["_id"], target["_id"])
    return jsonify({"contact": user_dto(target), "chat": chat_dto_by_id(chat["_id"], g.user)}), 201


# ================================================================ ГРУППЫ
@app.post("/groups")
@auth_required
def create_group():
    data = request.get_json(silent=True) or {}
    name = as_str(data.get("name"))
    raw_members = data.get("members")

    name = name.strip() if name else ""
    if not name or len(name) > GROUP_NAME_MAX:
        return err(f"Название группы: от 1 до {GROUP_NAME_MAX} символов")
    if not isinstance(raw_members, list) or not raw_members:
        return err("Выберите хотя бы одного участника")
    if len(raw_members) > GROUP_MEMBERS_MAX:
        return err(f"Максимум {GROUP_MEMBERS_MAX} участников")

    ids = {as_oid(m) for m in raw_members}
    if None in ids:
        return err("Некорректный список участников")

    valid = {l["contact_id"] for l in contacts_col.find({"owner_id": g.user["_id"], "contact_id": {"$in": list(ids)}})}
    if valid != ids:
        return err("Некоторых участников нет в ваших контактах")

    res = chats_col.insert_one(
        {
            "type": "group",
            "name": name,
            "owner_id": g.user["_id"],
            "members": [g.user["_id"], *valid],
            "created_at": now(),
            "updated_at": now(),
            "read": {},
        }
    )
    return jsonify({"chat": chat_dto_by_id(res.inserted_id, g.user)}), 201


# ================================================================ ЧАТЫ И СООБЩЕНИЯ
@app.get("/chats")
@auth_required
def list_chats():
    return jsonify({"chats": chats_for_user(g.user)})


@app.get("/chats/<chat_id>/messages")
@auth_required
def get_messages(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("Чат не найден", 404)

    q = {"chat_id": chat["_id"]}
    after = as_oid(request.args.get("after"))
    if after:
        q["_id"] = {"$gt": after}
        msgs = list(messages_col.find(q).sort("_id", ASCENDING).limit(200))
    else:
        msgs = list(messages_col.find(q).sort("_id", DESCENDING).limit(200))[::-1]

    umap = users_map({m["sender_id"] for m in msgs})
    return jsonify({"messages": [message_dto(m, umap) for m in msgs]})


@app.post("/chats/<chat_id>/messages")
@auth_required
def send_message(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("Чат не найден", 404)

    data = request.get_json(silent=True) or {}
    text = as_str(data.get("text")) or ""
    image = as_str(data.get("image"))
    client_id = as_str(data.get("client_id"))
    reply_to = as_str(data.get("reply_to"))
    reply_to_text = as_str(data.get("reply_to_text"))

    text = text.strip()
    if not text and not image:
        return err("Введите сообщение или загрузите фото")
    if len(text) > MESSAGE_MAX:
        return err(f"Сообщение слишком длинное (максимум {MESSAGE_MAX} символов)")
    if not client_id or not (8 <= len(client_id) <= 64):
        return err("Некорректный запрос")

    me = g.user
    doc = {
        "chat_id": chat["_id"],
        "sender_id": me["_id"],
        "text": text,
        "image": image,
        "reply_to": reply_to,
        "reply_to_text": reply_to_text,
        "client_id": client_id,
        "created_at": now(),
        "read_by": [me["_id"]],
    }
    try:
        doc["_id"] = messages_col.insert_one(doc).inserted_id
    except DuplicateKeyError:
        existing = messages_col.find_one({"sender_id": me["_id"], "client_id": client_id})
        return jsonify({"message": message_dto(existing, {me["_id"]: me}), "duplicate": True})

    last_text = text if text else "📷 Фото"
    chats_col.update_one(
        {"_id": chat["_id"]},
        {
            "$set": {
                "updated_at": doc["created_at"],
                f"read.{me['_id']}": str(doc["_id"]),
                "last_message": {"text": last_text[:100], "sender": me["login"], "at": doc["created_at"]},
            }
        },
    )
    typing_col.delete_one({"chat_id": chat["_id"], "user_id": me["_id"]})
    return jsonify({"message": message_dto(doc, {me["_id"]: me})}), 201


@app.post("/chats/<chat_id>/typing")
@auth_required
def typing(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("Чат не найден", 404)
    typing_col.update_one(
        {"chat_id": chat["_id"], "user_id": g.user["_id"]},
        {"$set": {"at": now()}},
        upsert=True,
    )
    return jsonify({"ok": True})


@app.post("/chats/<chat_id>/read")
@auth_required
def mark_read(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("Чат не найден", 404)
    
    latest = messages_col.find_one({"chat_id": chat["_id"]}, sort=[("_id", DESCENDING)])
    if latest:
        messages_col.update_many(
            {"chat_id": chat["_id"], "_id": {"$lte": latest["_id"]}, "read_by": {"$ne": g.user["_id"]}},
            {"$addToSet": {"read_by": g.user["_id"]}},
        )
        chats_col.update_one({"_id": chat["_id"]}, {"$set": {f"read.{g.user['_id']}": str(latest["_id"])}})
    
    return jsonify({"ok": True})


# ================================================================ POLLING
@app.get("/poll")
@auth_required
def poll():
    """Один запрос вместо нескольких: список чатов + новые сообщения открытого чата."""
    me = g.user
    result = {"chat_id": None, "messages": []}

    # Обновляем last_seen при каждом polling запросе
    users_col.update_one({"_id": me["_id"]}, {"$set": {"last_seen": now()}})

    chat = get_chat_for_user(request.args.get("chat_id")) if request.args.get("chat_id") else None
    if chat:
        result["chat_id"] = str(chat["_id"])
        q = {"chat_id": chat["_id"]}
        after = as_oid(request.args.get("after"))
        if after:
            q["_id"] = {"$gt": after}
        msgs = list(messages_col.find(q).sort("_id", ASCENDING).limit(200))
        umap = users_map({m["sender_id"] for m in msgs})
        result["messages"] = [message_dto(m, umap) for m in msgs]

        # отмечаем прочитанным, только если вкладка открыта
        if request.args.get("read") == "1":
            latest = messages_col.find_one({"chat_id": chat["_id"]}, sort=[("_id", DESCENDING)])
            if latest:
                messages_col.update_many(
                    {"chat_id": chat["_id"], "_id": {"$lte": latest["_id"]}, "read_by": {"$ne": me["_id"]}},
                    {"$addToSet": {"read_by": me["_id"]}},
                )
                chats_col.update_one({"_id": chat["_id"]}, {"$set": {f"read.{me['_id']}": str(latest["_id"])}})

    result["chats"] = chats_for_user(me)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=False)
