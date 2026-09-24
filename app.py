@app.route("/get_chats", methods=["POST"])
def get_chats():
    data = request.get_json() or {}
    session_id = data.get("session_id")

    user_id = sessions.get(session_id)
    if not user_id:
        return jsonify({"error": "Неавторизован"}), 401

    user_messages = messages_collection.find({
        "$or": [
            {"sender_id": user_id},
            {"receiver_id": user_id}
        ]
    })

    partner_ids = set()
    for msg in user_messages:
        partner_id = msg["receiver_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        partner_ids.add(partner_id)

    chats = []
    for pid in partner_ids:
        try:
            partner = users_collection.find_one({"_id": ObjectId(pid)})
        except Exception:
            partner = users_collection.find_one({"_id": pid})
            
        if partner and "login" in partner:
            chats.append(partner["login"])

    return jsonify({"chats": chats}), 200
