function Login(){
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;
    fetch("https://mychat-backend-gnp6.onrender.com/login", { method: "POST",
    headers: {
    "Content-type":  "application/json"
    },
    body: JSON.stringify({
        log: login,
        pas: pass
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        alert(data.message);
        if (data.session_id) {
            localStorage.setItem("session_id", data.session_id);
        }
    });
}
function Register(){
    const login = document.getElementById("login").value;
    const pass = document.getElementById("password").value;
    fetch("https://mychat-backend-gnp6.onrender.com/register", {method: "POST",
    headers: {
    "Content-type": "application/json"
    },
    body: JSON.stringify({
        log: login,
        pas: pass
        })
    })
    .then(res => res.text())
    .then(data => alert(data));
}
function sendData(){
            const message = document.getElementById("message").value;
            const session_id = localStorage.getItem("session_id");
            const adress = document.getElementById("Who").value;
            console.log(session_id)
            if(adress !== ""){
                fetch("https://mychat-backend-gnp6.onrender.com/save", {
                    method: "Post",
                    headers: {
                        "Content-type": "application/json"
                    },
                    body:
                    JSON.stringify({
                    text: message,
                    session_id: session_id,
                    address: adress
                })
                })
                .then(res => res.text())
                .then(data => alert(data));
            }
        }
function getData(){
            const session_id = localStorage.getItem("session_id");
            fetch("https://mychat-backend-gnp6.onrender.com/getlm", {
            method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            body:
                JSON.stringify({
                    session_id: session_id
                })
            })
           .then(Response => Response.json())
           .then(data => {
            document.getElementById("phrase").innerText = data.backm;
        });
        }
function erase(){
            fetch("https://mychat-backend-gnp6.onrender.com/erase")
            const dl = document.getElementById("dl");
            dl.showModal();
        }
function clos(){
            const dl = document.getElementById("dl");
            dl.close();
        }