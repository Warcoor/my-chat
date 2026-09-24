from flask import Flask, request, send_file, jsonify, render_template
from flask_cors import CORS  # <-- импорт
import pyodbc
import uuid

app = Flask(__name__)
CORS(app)  # <-- разрешаем CORS для всех запросов

@app.route('/')
def home():
    return render_template('index.html')

sessions = {}

conn = pyodbc.connect(
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=(localdb)\MSSQLLocalDB;"
    r"DATABASE=TestDB;"
    r"Trusted_Connection=yes;"
)
cursor = conn.cursor()

def get_user_info(login):
    cursor.execute(
        "SELECT id, login, password FROM users WHERE login = ?",
        (login,)
    )
    return cursor.fetchone()


@app.route("/login", methods=["POST"])
def checklogin():
    data = request.json
    login = data['log']
    password = data['pas']
    user_data = get_user_info(login)
    if user_data != None:
        id, login_base, password_base = user_data
        if password == password_base:
            session_id = str(uuid.uuid4())
            sessions[session_id] = id
            print(session_id)
            print("sessions - ", sessions[session_id])
            return jsonify({
                "message": "Вы успешно вошли в свой аккаунт!",
                "session_id": session_id
            })
        else:
              return jsonify({
                  "message": "Неверный пароль!"
              })
    else: return jsonify({
        "message": "Данного аккаунта не существует, зарегестрируйтесь пожалуйста!"
    })


@app.route("/register", methods=["POST"])
def registration():
    data = request.json
    login = data['log']
    password = data['pas']
    user_data = get_user_info(login)
    if user_data == None:
        cursor.execute("INSERT INTO users (login, password) VALUES (?,?)", (login,password))
        conn.commit()
    else: return "Данный логин уже занят"
    return "Вы успешно зарегестрированы!"

@app.route("/save", methods=["POST"])
def save():
    data = request.json
    text = data['text']
    session_id = data['session_id']
    print(session_id)
    user_id = sessions.get(session_id) #Кто отправляет
    address = data["address"]     #Кому отправляют
    cursor.execute("SELECT id FROM users WHERE login = ?",(address,))
    address_id_cort = cursor.fetchone()
    address_id = address_id_cort[0]
    if user_id is None:
        return "Вы не авторизованы", 401
    print("Попытка вставки:", text)

    cursor.execute("INSERT INTO Messages (TextMessage, Sender, ReceiverId) VALUES (?,?,?)",(text, user_id, address_id))
    conn.commit()

    # Проверка: получаем все строки из таблицы
    cursor.execute("SELECT * FROM Messages")
    rows = cursor.fetchall()
    print("Сейчас в таблице:", rows)

    return "Сохранено!"

@app.route("/getlm", methods=["POST"])
def getlm():
    print("getlm start")
    session_id = request.json["session_id"]
    print("session_id", session_id)
    user_id = sessions[session_id]
    print("user_id", user_id)
    cursor.execute(
                   """
                   SELECT TOP 1 TextMessage
                   FROM Messages
                   WHERE ReceiverId = ?          
                   ORDER BY ID DESC
                   """,
                   (user_id,)
                   )
    row = cursor.fetchone()
    print("Row:", row)
    lastm = row[0] if row else "None"
    print("Последнее сообщение:", lastm)
    return jsonify({"backm": lastm})
@app.route("/erase")
def erase():
    cursor.execute("TRUNCATE TABLE Messages")
    return 0
app.run(port=3000)