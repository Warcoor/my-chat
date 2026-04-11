from flask import Flask, render_template
from flask_socketio import SocketIO, send
import psycopg2
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


DATABASE_URL = "postgresql://postgres:ARHmeHekAknZBGekTCctDKhqzENFdnZY@metro.proxy.rlwy.net:29944/railway"
conn = psycopg2.connect(DATABASE_URL, sslmode="require")
cursor = conn.cursor()
print(DATABASE_URL)
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

port = int(os.environ.get("PORT", 3000))
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=port)
