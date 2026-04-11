from flask import Flask, render_template_string
from flask_socketio import SocketIO, send
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# простой HTML прямо в коде (чтобы не зависеть от templates)
HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Test Chat</title>
</head>
<body>
    <h2>SocketIO Test</h2>
    <input id="msg" placeholder="message">
    <button onclick="sendMsg()">Send</button>

    <ul id="chat"></ul>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script>
        const socket = io();

        socket.on("message", (msg) => {
            const li = document.createElement("li");
            li.innerText = msg;
            document.getElementById("chat").appendChild(li);
        });

        function sendMsg() {
            const msg = document.getElementById("msg").value;
            socket.send(msg);
        }
    </script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML)


@socketio.on("message")
def handle_message(msg):
    print("Received:", msg)
    send(msg, broadcast=True, include_self=False)


if __name__ == "__main__":
    port = int(os.environ.get("PORT"))

    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        allow_unsafe_werkzeug=True
    )
