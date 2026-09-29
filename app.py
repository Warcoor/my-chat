import base64
import binascii
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from functools import wraps

import certifi
from bson.binary import Binary
from bson.objectid import ObjectId
from flask import Flask, Response, request, jsonify, g
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024  # фото приходят как base64, поэтому лимит больше
CORS(app)

# ---------------------------------------------------------------- БД
MONGO_URI = os.environ["MONGO_URI"]  # обязательно задаётся в Render -> Environment
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), tz_aware=True)
db = client["chat_db"]

users_col = db["users"]
sessions_col = db["sessions"]
contacts_col = db["contacts"]
chats_col = db["chats"]
messages_col = db["chat_messages"]
typing_col = db["typing"]
avatars_col = db["avatars"]
images_col = db["images"]

# ---------------------------------------------------------------- Ограничения
LOGIN_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
PASSWORD_MIN, PASSWORD_MAX = 6, 64
MESSAGE_MAX = 2000
GROUP_NAME_MAX = 40
GROUP_MEMBERS_MAX = 50
NAME_MAX = 30
BIO_MAX = 200
SESSION_DAYS = 30
TYPING_TTL_SECONDS = 3
ONLINE_WINDOW = 30          # секунд с последнего запроса = «в сети»
LAST_SEEN_THROTTLE = 10     # как часто обновляем last_seen в базе
AVATAR_MAX_BYTES = 400 * 1024
IMAGE_MAX_BYTES = 2 * 1024 * 1024
REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👎", "🎉"]

# Тексты ошибок (русские - запасные; клиент переводит по коду)
ERR = {
    "not_auth": "Не авторизован",
    "fill_all": "Заполните все поля",
    "login_invalid": "Логин: 3–20 символов, только латиница, цифры и «_»",
    "pass_length": "Пароль: от {min} до {max} символов",
    "pass_chars": "Пароль должен содержать хотя бы одну букву и одну цифру",
    "pass_spaces": "Пароль не должен содержать пробелов",
    "login_taken": "Данный логин уже занят",
    "bad_creds": "Неверный логин или пароль",
    "enter_login": "Введите логин",
    "user_not_found": "Пользователь не найден",
    "self_contact": "Нельзя добавить самого себя",
    "group_name": "Название группы: от 1 до {max} символов",
    "group_members_empty": "Выберите хотя бы одного участника",
    "group_members_max": "Максимум {max} участников",
    "bad_members": "Некорректный список участников",
    "not_in_contacts": "Некоторых участников нет в ваших контактах",
    "chat_not_found": "Чат не найден",
    "msg_empty": "Введите сообщение",
    "msg_long": "Сообщение слишком длинное (максимум {max} символов)",
    "bad_request": "Некорректный запрос",
    "msg_not_found": "Сообщение не найдено",
    "forbidden": "Нет доступа",
    "bad_image": "Не удалось обработать изображение",
    "image_big": "Изображение слишком большое",
    "bad_emoji": "Недопустимая реакция",
    "name_long": "Имя: не больше {max} символов",
    "bio_long": "Описание: не больше {max} символов",
}


def err(code, status=400, **params):
    return jsonify({"error": ERR[code].format(**params), "code": code, "params": params}), status


def init_db():
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
    idx(messages_col, [("chat_id", ASCENDING), ("updated_at", ASCENDING)])
    idx(messages_col, [("sender_id", ASCENDING), ("client_id", ASCENDING)], unique=True)
    idx(typing_col, [("chat_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    idx(typing_col, [("at", ASCENDING)], expireAfterSeconds=30)
    idx(images_col, [("chat_id", ASCENDING)])


init_db()


# ---------------------------------------------------------------- Хелперы
def now():
    t = datetime.now(timezone.utc)
    return t.replace(microsecond=(t.microsecond // 1000) * 1000)  # Mongo хранит миллисекунды


def iso(dt):
    return dt.isoformat(timespec="milliseconds") if dt else None


def parse_iso(s):
    if not isinstance(s, str):
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def as_str(v):
    """Принимаем только строки. Защита от NoSQL-инъекций вида {"$ne": ""}."""
    return v if isinstance(v, str) else None


def as_oid(v):
    if not isinstance(v, str) or len(v) != 24:
        return None
    try:
        return ObjectId(v)
    except Exception:
        return None


def clamp_int(v, lo, hi, default):
    try:
        v = int(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


def validate_login(login):
    if not login or not LOGIN_RE.match(login):
        return "login_invalid", {}
    return None


def validate_password(password):
    if not password or not (PASSWORD_MIN <= len(password) <= PASSWORD_MAX):
        return "pass_length", {"min": PASSWORD_MIN, "max": PASSWORD_MAX}
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "pass_chars", {}
    if " " in password:
        return "pass_spaces", {}
    return None


DATA_URL_RE = re.compile(r"^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$")


def parse_image(data_url, max_bytes):
    """Проверяем data-URL картинки: тип, размер и «магические» байты. Возвращает (mime, bytes)."""
    if not isinstance(data_url, str) or len(data_url) > max_bytes * 4 // 3 + 200:
        raise ValueError("image_big" if isinstance(data_url, str) else "bad_image")
    m = DATA_URL_RE.match(data_url)
    if not m:
        raise ValueError("bad_image")
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise ValueError("bad_image")
    if len(raw) > max_bytes:
        raise ValueError("image_big")
    kind = m.group(1)
    ok = (
        (kind == "jpeg" and raw[:3] == b"\xff\xd8\xff")
        or (kind == "png" and raw[:8] == b"\x89PNG\r\n\x1a\n")
        or (kind == "webp" and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
    )
    if not ok:
        raise ValueError("bad_image")
    return "image/" + kind, raw


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        sess = sessions_col.find_one({"token": token}) if token else None
        if not sess:
            return err("not_auth", 401)
        user = users_col.find_one({"_id": sess["user_id"]})
        if not user:
            return err("not_auth", 401)
        t = now()
        ls = user.get("last_seen")
        if not ls or (t - ls).total_seconds() > LAST_SEEN_THROTTLE:
            users_col.update_one({"_id": user["_id"]}, {"$set": {"last_seen": t}})
            user["last_seen"] = t
        g.user = user
        g.token = token
        return f(*args, **kwargs)

    return wrapper


def display_name(u):
    if not u:
        return "?"
    return u.get("name") or u["login"]


def user_dto(u):
    ls = u.get("last_seen")
    online = bool(ls and (now() - ls).total_seconds() < ONLINE_WINDOW)
    return {
        "id": str(u["_id"]),
        "login": u["login"],
        "name": display_name(u),
        "bio": u.get("bio", ""),
        "avatar": f"/avatar/{u['_id']}?v={u['avatar_v']}" if u.get("avatar_v") else None,
        "online": online,
        "last_seen": iso(ls),
    }


def users_map(ids):
    return {u["_id"]: u for u in users_col.find({"_id": {"$in": list(ids)}})}


def get_chat_for_user(chat_id_str):
    cid = as_oid(chat_id_str)
    if not cid:
        return None
    return chats_col.find_one({"_id": cid, "members": g.user["_id"]})


def get_message_for_user(mid):
    oid = as_oid(mid)
    if not oid:
        return None, None
    m = messages_col.find_one({"_id": oid})
    if not m:
        return None, None
    chat = chats_col.find_one({"_id": m["chat_id"], "members": g.user["_id"]})
    if not chat:
        return None, None
    return m, chat


# ---------------------------------------------------------------- Сообщения (DTO)
def message_dto(m, umap, replies, others, me_id):
    sender = umap.get(m["sender_id"])
    deleted = bool(m.get("deleted"))
    reply = None
    if m.get("reply_to") and not deleted:
        r = replies.get(m["reply_to"])
        if r and not r.get("deleted"):
            reply = {
                "id": str(r["_id"]),
                "sender": display_name(umap.get(r["sender_id"])),
                "text": (r.get("text") or "")[:100],
                "image": bool(r.get("image_id")),
            }
        else:
            reply = {"id": str(m["reply_to"]), "deleted": True}

    dto = {
        "id": str(m["_id"]),
        "chat_id": str(m["chat_id"]),
        "sender_id": str(m["sender_id"]),
        "sender": display_name(sender),
        "text": "" if deleted else m.get("text", ""),
        "deleted": deleted,
        "edited": bool(m.get("edited")),
        "created_at": iso(m["created_at"]),
        "updated_at": iso(m.get("updated_at") or m["created_at"]),
        "rev": m.get("rev", 0),
        "client_id": m.get("client_id"),
        "image": (
            {"id": str(m["image_id"]), "w": m.get("image_w", 0), "h": m.get("image_h", 0)}
            if m.get("image_id") and not deleted
            else None
        ),
        "reply": reply,
        "reactions": {e: [str(u) for u in users] for e, users in (m.get("reactions") or {}).items() if users},
    }
    if m["sender_id"] == me_id:
        read = len(m.get("read_by", {}))
        delivered = len(m.get("delivered_to", {}))
        dto["status"] = "read" if read else "delivered" if delivered else "sent"
        dto["read_count"] = read
        dto["delivered_count"] = delivered
        dto["others"] = others
    return dto


def build_messages(msgs, chat, me_id):
    if not msgs:
        return []
    reply_ids = {m["reply_to"] for m in msgs if m.get("reply_to")}
    replies = {}
    if reply_ids:
        replies = {r["_id"]: r for r in messages_col.find({"_id": {"$in": list(reply_ids)}})}
    uids = {m["sender_id"] for m in msgs} | {r["sender_id"] for r in replies.values()}
    umap = users_map(uids)
    others = max(len(chat["members"]) - 1, 1)
    return [message_dto(m, umap, replies, others, me_id) for m in msgs]


def pinned_dto(chat):
    pid = chat.get("pinned")
    if not pid:
        return None
    m = messages_col.find_one({"_id": pid, "deleted": {"$ne": True}})
    if not m:
        return None
    u = users_col.find_one({"_id": m["sender_id"]})
    return {
        "id": str(m["_id"]),
        "sender": display_name(u),
        "text": (m.get("text") or "")[:100],
        "image": bool(m.get("image_id")),
    }


def refresh_last_message(chat_id):
    last = messages_col.find_one({"chat_id": chat_id, "deleted": {"$ne": True}}, sort=[("_id", DESCENDING)])
    if not last:
        chats_col.update_one({"_id": chat_id}, {"$unset": {"last_message": ""}})
        return
    u = users_col.find_one({"_id": last["sender_id"]})
    chats_col.update_one(
        {"_id": chat_id},
        {
            "$set": {
                "last_message": {
                    "id": str(last["_id"]),
                    "sender_id": str(last["sender_id"]),
                    "sender": display_name(u),
                    "text": (last.get("text") or "")[:100],
                    "image": bool(last.get("image_id")),
                    "at": last["created_at"],
                }
            }
        },
    )


# ---------------------------------------------------------------- Доставка / прочтение
def mark_delivered(chat_id, uid, upto):
    t = now()
    messages_col.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": uid}, f"delivered_to.{uid}": {"$exists": False}, "_id": {"$lte": upto}},
        {"$set": {f"delivered_to.{uid}": t, "updated_at": t}, "$inc": {"rev": 1}},
    )


def mark_read(chat, uid):
    lm = chat.get("last_message")
    if not lm or chat.get("read", {}).get(str(uid)) == lm["id"]:
        return
    upto = ObjectId(lm["id"])
    mark_delivered(chat["_id"], uid, upto)
    t = now()
    messages_col.update_many(
        {"chat_id": chat["_id"], "sender_id": {"$ne": uid}, f"read_by.{uid}": {"$exists": False}, "_id": {"$lte": upto}},
        {"$set": {f"read_by.{uid}": t, "updated_at": t}, "$inc": {"rev": 1}},
    )
    chats_col.update_one({"_id": chat["_id"]}, {"$set": {f"read.{uid}": lm["id"]}})


# ---------------------------------------------------------------- Чаты (DTO)
def chats_for_user(me):
    uid = me["_id"]
    chats = list(chats_col.find({"members": uid}).sort("updated_at", DESCENDING))
    if not chats:
        return []

    # Всё, что пришло к нам в список чатов, считается доставленным
    for c in chats:
        lm = c.get("last_message")
        if lm and lm.get("sender_id") != str(uid) and c.get("delivered", {}).get(str(uid)) != lm["id"]:
            mark_delivered(c["_id"], uid, ObjectId(lm["id"]))
            chats_col.update_one({"_id": c["_id"]}, {"$set": {f"delivered.{uid}": lm["id"]}})

    umap = users_map({m for c in chats for m in c["members"]})

    since = now() - timedelta(seconds=TYPING_TTL_SECONDS)
    typing_by_chat = {}
    for t in typing_col.find({"chat_id": {"$in": [c["_id"] for c in chats]}, "user_id": {"$ne": uid}, "at": {"$gt": since}}):
        u = umap.get(t["user_id"])
        if u:
            typing_by_chat.setdefault(t["chat_id"], []).append(display_name(u))

    result = []
    for c in chats:
        members = [user_dto(umap[m]) for m in c["members"] if m in umap]
        peer = None
        if c["type"] == "private":
            peer = next((m for m in members if m["id"] != str(uid)), None)
            title = peer["name"] if peer else "?"
        else:
            title = c.get("name", "Group")

        q = {"chat_id": c["_id"], "sender_id": {"$ne": uid}, "deleted": {"$ne": True}}
        last_read = as_oid(c.get("read", {}).get(str(uid)))
        if last_read:
            q["_id"] = {"$gt": last_read}
        unread = messages_col.count_documents(q, limit=100)

        lm = c.get("last_message")
        result.append(
            {
                "id": str(c["_id"]),
                "type": c["type"],
                "title": title,
                "peer": peer,
                "members": members,
                "owner_id": str(c["owner_id"]) if c.get("owner_id") else None,
                "unread": unread,
                "typing": typing_by_chat.get(c["_id"], []),
                "last_message": (
                    {"text": lm["text"], "sender": lm["sender"], "image": lm.get("image", False), "at": iso(lm["at"])}
                    if lm
                    else None
                ),
            }
        )
    return result


def chat_dto_by_id(chat_id, me):
    return next((c for c in chats_for_user(me) if c["id"] == str(chat_id)), None)


def get_or_create_private_chat(a, b):
    key = ":".join(sorted([str(a), str(b)]))
    doc = {"type": "private", "members": [a, b], "created_at": now(), "updated_at": now(), "read": {}, "delivered": {}}
    try:
        return chats_col.find_one_and_update(
            {"private_key": key}, {"$setOnInsert": doc}, upsert=True, return_document=ReturnDocument.AFTER
        )
    except DuplicateKeyError:
        return chats_col.find_one({"private_key": key})


# ---------------------------------------------------------------- Авторизация
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
        return err(problem[0], **problem[1])

    try:
        users_col.insert_one(
            {
                "login": login,
                "login_lower": login.lower(),
                "password": generate_password_hash(password),
                "name": "",
                "bio": "",
                "created_at": now(),
                "last_seen": now(),
            }
        )
    except DuplicateKeyError:
        return err("login_taken")
    return jsonify({"ok": True}), 201


@app.post("/login")
def login_route():
    data = request.get_json(silent=True) or {}
    login = as_str(data.get("log"))
    password = as_str(data.get("pas"))
    if not login or not password:
        return err("fill_all")

    user = users_col.find_one({"login_lower": login.strip().lower()})
    if not user or not check_password_hash(user["password"], password):
        return err("bad_creds", 401)

    token = secrets.token_urlsafe(32)
    sessions_col.insert_one({"token": token, "user_id": user["_id"], "created_at": now()})
    users_col.update_one({"_id": user["_id"]}, {"$set": {"last_seen": now()}})
    user["last_seen"] = now()
    return jsonify({"token": token, "user": user_dto(user)})


@app.post("/logout")
@auth_required
def logout():
    sessions_col.delete_one({"token": g.token})
    # при выходе сразу показываем «не в сети»
    users_col.update_one({"_id": g.user["_id"]}, {"$set": {"last_seen": now() - timedelta(seconds=ONLINE_WINDOW + 1)}})
    return jsonify({"ok": True})


@app.get("/me")
@auth_required
def me():
    return jsonify({"user": user_dto(g.user)})


# ---------------------------------------------------------------- Профиль
@app.post("/profile")
@auth_required
def update_profile():
    data = request.get_json(silent=True) or {}
    name = as_str(data.get("name"))
    bio = as_str(data.get("bio"))
    if name is None or bio is None:
        return err("bad_request")
    name, bio = name.strip(), bio.strip()
    if len(name) > NAME_MAX:
        return err("name_long", max=NAME_MAX)
    if len(bio) > BIO_MAX:
        return err("bio_long", max=BIO_MAX)
    users_col.update_one({"_id": g.user["_id"]}, {"$set": {"name": name, "bio": bio}})
    return jsonify({"user": user_dto(users_col.find_one({"_id": g.user["_id"]}))})


@app.post("/profile/avatar")
@auth_required
def upload_avatar():
    data = request.get_json(silent=True) or {}
    try:
        mime, raw = parse_image(data.get("image"), AVATAR_MAX_BYTES)
    except ValueError as e:
        return err(str(e))
    uid = g.user["_id"]
    avatars_col.replace_one({"_id": uid}, {"_id": uid, "mime": mime, "data": Binary(raw)}, upsert=True)
    users_col.update_one({"_id": uid}, {"$set": {"avatar_v": int(time.time())}})
    return jsonify({"user": user_dto(users_col.find_one({"_id": uid}))})


@app.delete("/profile/avatar")
@auth_required
def delete_avatar():
    uid = g.user["_id"]
    avatars_col.delete_one({"_id": uid})
    users_col.update_one({"_id": uid}, {"$unset": {"avatar_v": ""}})
    return jsonify({"user": user_dto(users_col.find_one({"_id": uid}))})


@app.get("/avatar/<uid>")
def get_avatar(uid):
    oid = as_oid(uid)
    doc = avatars_col.find_one({"_id": oid}) if oid else None
    if not doc:
        return Response(status=404)
    resp = Response(bytes(doc["data"]), mimetype=doc["mime"])
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


# ---------------------------------------------------------------- Контакты
@app.get("/contacts")
@auth_required
def list_contacts():
    links = list(contacts_col.find({"owner_id": g.user["_id"]}))
    umap = users_map([l["contact_id"] for l in links])
    contacts = sorted((user_dto(u) for u in umap.values()), key=lambda u: u["name"].lower())
    return jsonify({"contacts": contacts})


@app.post("/contacts")
@auth_required
def add_contact():
    data = request.get_json(silent=True) or {}
    login = as_str(data.get("login"))
    if not login or not login.strip():
        return err("enter_login")
    login = login.strip().lstrip("@")

    target = users_col.find_one({"login_lower": login.lower()})
    if not target:
        return err("user_not_found", 404)
    if target["_id"] == g.user["_id"]:
        return err("self_contact")

    try:
        contacts_col.insert_one({"owner_id": g.user["_id"], "contact_id": target["_id"], "created_at": now()})
    except DuplicateKeyError:
        pass

    chat = get_or_create_private_chat(g.user["_id"], target["_id"])
    return jsonify({"contact": user_dto(target), "chat": chat_dto_by_id(chat["_id"], g.user)}), 201


# ---------------------------------------------------------------- Группы
@app.post("/groups")
@auth_required
def create_group():
    data = request.get_json(silent=True) or {}
    name = as_str(data.get("name"))
    raw_members = data.get("members")

    name = name.strip() if name else ""
    if not name or len(name) > GROUP_NAME_MAX:
        return err("group_name", max=GROUP_NAME_MAX)
    if not isinstance(raw_members, list) or not raw_members:
        return err("group_members_empty")
    if len(raw_members) > GROUP_MEMBERS_MAX:
        return err("group_members_max", max=GROUP_MEMBERS_MAX)

    ids = {as_oid(m) for m in raw_members}
    if None in ids:
        return err("bad_members")

    valid = {l["contact_id"] for l in contacts_col.find({"owner_id": g.user["_id"], "contact_id": {"$in": list(ids)}})}
    if valid != ids:
        return err("not_in_contacts")

    res = chats_col.insert_one(
        {
            "type": "group",
            "name": name,
            "owner_id": g.user["_id"],
            "members": [g.user["_id"], *valid],
            "created_at": now(),
            "updated_at": now(),
            "read": {},
            "delivered": {},
        }
    )
    return jsonify({"chat": chat_dto_by_id(res.inserted_id, g.user)}), 201


# ---------------------------------------------------------------- Чаты и сообщения
@app.get("/chats")
@auth_required
def list_chats():
    return jsonify({"chats": chats_for_user(g.user)})


@app.get("/chats/<chat_id>/messages")
@auth_required
def get_messages(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("chat_not_found", 404)

    msgs = list(
        messages_col.find({"chat_id": chat["_id"], "deleted": {"$ne": True}}).sort("_id", DESCENDING).limit(200)
    )[::-1]
    since = max((m.get("updated_at") or m["created_at"] for m in msgs), default=chat["created_at"])
    return jsonify(
        {
            "messages": build_messages(msgs, chat, g.user["_id"]),
            "since": iso(since),
            "pinned": pinned_dto(chat),
        }
    )


@app.post("/chats/<chat_id>/messages")
@auth_required
def send_message(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("chat_not_found", 404)

    data = request.get_json(silent=True) or {}
    text = (as_str(data.get("text")) or "").strip()
    client_id = as_str(data.get("client_id"))
    image_data = data.get("image")

    if not text and not image_data:
        return err("msg_empty")
    if len(text) > MESSAGE_MAX:
        return err("msg_long", max=MESSAGE_MAX)
    if not client_id or not (8 <= len(client_id) <= 64):
        return err("bad_request")

    me = g.user

    # повторная отправка того же сообщения: возвращаем уже сохранённое
    existing = messages_col.find_one({"sender_id": me["_id"], "client_id": client_id})
    if existing:
        return jsonify({"message": build_messages([existing], chat, me["_id"])[0], "duplicate": True})

    reply_to = None
    if data.get("reply_to"):
        rid = as_oid(data.get("reply_to"))
        if not rid:
            return err("bad_request")
        if messages_col.find_one({"_id": rid, "chat_id": chat["_id"]}, {"_id": 1}):
            reply_to = rid

    image_id = None
    if image_data:
        try:
            mime, raw = parse_image(image_data, IMAGE_MAX_BYTES)
        except ValueError as e:
            return err(str(e))
        image_id = images_col.insert_one({"chat_id": chat["_id"], "mime": mime, "data": Binary(raw)}).inserted_id

    # отправка сообщения = прочитал всё, что было до него
    mark_read(chat, me["_id"])

    created = now()
    doc = {
        "chat_id": chat["_id"],
        "sender_id": me["_id"],
        "text": text,
        "client_id": client_id,
        "created_at": created,
        "updated_at": created,
        "rev": 0,
        "reactions": {},
    }
    if reply_to:
        doc["reply_to"] = reply_to
    if image_id:
        doc["image_id"] = image_id
        doc["image_w"] = clamp_int(data.get("w"), 1, 10000, 0)
        doc["image_h"] = clamp_int(data.get("h"), 1, 10000, 0)

    try:
        doc["_id"] = messages_col.insert_one(doc).inserted_id
    except DuplicateKeyError:
        if image_id:
            images_col.delete_one({"_id": image_id})
        existing = messages_col.find_one({"sender_id": me["_id"], "client_id": client_id})
        return jsonify({"message": build_messages([existing], chat, me["_id"])[0], "duplicate": True})

    chats_col.update_one(
        {"_id": chat["_id"]},
        {
            "$set": {
                "updated_at": created,
                "last_message": {
                    "id": str(doc["_id"]),
                    "sender_id": str(me["_id"]),
                    "sender": display_name(me),
                    "text": text[:100],
                    "image": bool(image_id),
                    "at": created,
                },
            }
        },
    )
    typing_col.delete_one({"chat_id": chat["_id"], "user_id": me["_id"]})
    return jsonify({"message": build_messages([doc], chat, me["_id"])[0]}), 201


def touch(mid, fields):
    fields["updated_at"] = now()
    messages_col.update_one({"_id": mid}, {"$set": fields, "$inc": {"rev": 1}})
    return messages_col.find_one({"_id": mid})


@app.post("/messages/<mid>/edit")
@auth_required
def edit_message(mid):
    m, chat = get_message_for_user(mid)
    if not m or m.get("deleted"):
        return err("msg_not_found", 404)
    if m["sender_id"] != g.user["_id"]:
        return err("forbidden", 403)

    text = (as_str((request.get_json(silent=True) or {}).get("text")) or "").strip()
    if not text and not m.get("image_id"):
        return err("msg_empty")
    if len(text) > MESSAGE_MAX:
        return err("msg_long", max=MESSAGE_MAX)

    if text != m.get("text"):
        m = touch(m["_id"], {"text": text, "edited": True})
        refresh_last_message(chat["_id"])
    return jsonify({"message": build_messages([m], chat, g.user["_id"])[0]})


@app.post("/messages/<mid>/delete")
@auth_required
def delete_message(mid):
    m, chat = get_message_for_user(mid)
    if not m:
        return err("msg_not_found", 404)
    if m["sender_id"] != g.user["_id"]:
        return err("forbidden", 403)

    if m.get("image_id"):
        images_col.delete_one({"_id": m["image_id"]})
    m = touch(m["_id"], {"deleted": True, "text": "", "reactions": {}, "image_id": None})
    if chat.get("pinned") == m["_id"]:
        chats_col.update_one({"_id": chat["_id"]}, {"$unset": {"pinned": ""}})
    refresh_last_message(chat["_id"])
    return jsonify({"message": build_messages([m], chat, g.user["_id"])[0]})


@app.post("/messages/<mid>/react")
@auth_required
def react(mid):
    m, chat = get_message_for_user(mid)
    if not m or m.get("deleted"):
        return err("msg_not_found", 404)
    emoji = as_str((request.get_json(silent=True) or {}).get("emoji"))
    if emoji not in REACTIONS:
        return err("bad_emoji")

    uid = g.user["_id"]
    reactions = m.get("reactions") or {}
    had = uid in reactions.get(emoji, [])
    for e in list(reactions):  # одна реакция на человека
        reactions[e] = [u for u in reactions[e] if u != uid]
        if not reactions[e]:
            del reactions[e]
    if not had:
        reactions.setdefault(emoji, []).append(uid)

    m = touch(m["_id"], {"reactions": reactions})
    return jsonify({"message": build_messages([m], chat, uid)[0]})


@app.post("/chats/<chat_id>/pin")
@auth_required
def pin_message(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("chat_not_found", 404)
    raw = (request.get_json(silent=True) or {}).get("message_id")
    if raw is None:
        chats_col.update_one({"_id": chat["_id"]}, {"$unset": {"pinned": ""}})
        return jsonify({"pinned": None})
    mid = as_oid(raw)
    m = messages_col.find_one({"_id": mid, "chat_id": chat["_id"], "deleted": {"$ne": True}}) if mid else None
    if not m:
        return err("msg_not_found", 404)
    chats_col.update_one({"_id": chat["_id"]}, {"$set": {"pinned": m["_id"]}})
    return jsonify({"pinned": pinned_dto({"pinned": m["_id"]})})


@app.get("/messages/<mid>/receipts")
@auth_required
def receipts(mid):
    m, chat = get_message_for_user(mid)
    if not m or m.get("deleted"):
        return err("msg_not_found", 404)
    if m["sender_id"] != g.user["_id"]:
        return err("forbidden", 403)
    umap = users_map(chat["members"])
    rows = []
    for uid in chat["members"]:
        if uid == m["sender_id"] or uid not in umap:
            continue
        rows.append(
            {
                "user": user_dto(umap[uid]),
                "delivered_at": iso(m.get("delivered_to", {}).get(str(uid))),
                "read_at": iso(m.get("read_by", {}).get(str(uid))),
            }
        )
    return jsonify({"receipts": rows})


@app.get("/images/<image_id>")
@auth_required
def get_image(image_id):
    oid = as_oid(image_id)
    doc = images_col.find_one({"_id": oid}) if oid else None
    if not doc or not chats_col.find_one({"_id": doc["chat_id"], "members": g.user["_id"]}, {"_id": 1}):
        return Response(status=404)
    resp = Response(bytes(doc["data"]), mimetype=doc["mime"])
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


@app.post("/chats/<chat_id>/typing")
@auth_required
def typing(chat_id):
    chat = get_chat_for_user(chat_id)
    if not chat:
        return err("chat_not_found", 404)
    typing_col.update_one({"chat_id": chat["_id"], "user_id": g.user["_id"]}, {"$set": {"at": now()}}, upsert=True)
    return jsonify({"ok": True})


@app.get("/search")
@auth_required
def search():
    q = (as_str(request.args.get("q")) or "").strip()
    if len(q) < 2 or len(q) > 50:
        return jsonify({"results": []})
    chat_ids = [c["_id"] for c in chats_col.find({"members": g.user["_id"]}, {"_id": 1})]
    msgs = list(
        messages_col.find(
            {"chat_id": {"$in": chat_ids}, "deleted": {"$ne": True}, "text": {"$regex": re.escape(q), "$options": "i"}}
        )
        .sort("_id", DESCENDING)
        .limit(20)
    )
    umap = users_map({m["sender_id"] for m in msgs})
    return jsonify(
        {
            "results": [
                {
                    "id": str(m["_id"]),
                    "chat_id": str(m["chat_id"]),
                    "sender": display_name(umap.get(m["sender_id"])),
                    "text": m["text"][:200],
                    "created_at": iso(m["created_at"]),
                }
                for m in msgs
            ]
        }
    )


@app.get("/poll")
@auth_required
def poll():
    """Один запрос: изменения в открытом чате + список чатов."""
    me = g.user
    result = {"chat_id": None, "messages": [], "pinned": None}

    raw_chat = request.args.get("chat_id")
    chat = get_chat_for_user(raw_chat) if raw_chat else None
    if chat:
        result["chat_id"] = str(chat["_id"])
        since = parse_iso(request.args.get("since"))
        if request.args.get("read") == "1":
            mark_read(chat, me["_id"])
        if since:
            msgs = list(
                messages_col.find({"chat_id": chat["_id"], "updated_at": {"$gte": since}})
                .sort([("updated_at", ASCENDING), ("_id", ASCENDING)])
                .limit(200)
            )
            result["messages"] = build_messages(msgs, chat, me["_id"])
        fresh = chats_col.find_one({"_id": chat["_id"]}, {"pinned": 1})
        result["pinned"] = pinned_dto(fresh or {})

    result["chats"] = chats_for_user(me)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)
