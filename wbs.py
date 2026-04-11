from flask import Flask, render_template
from flask_socketio import SocketIO, send
import psycopg2
import os

print("HELLO START")

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


DATABASE_URL = "postgresql://postgres:ARHmeHekAknZBGekTCctDKhqzENFdnZY@metro.proxy.rlwy.net:29944/railway"
conn = None
cursor = None

def init_db():
    global conn, cursor
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    cursor = conn.cursor()

@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("message")
def handle_message(msg):
    print("Получено:", msg)

    # сохраняем в БД
    cursor.execute(
        "INSERT INTO Messages (TextMessage) VALUES (%s)",
        (msg,)
    )
    conn.commit()

    # отправляем всем
    send(msg, broadcast=True, include_self=False)

port = int(os.environ.get("PORT"))
if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
