from flask import Flask, jsonify
import json
import os

app = Flask(__name__)

COUNTER_FILE = "/data/counter.json"  # Render persistent disk mount

def load_count():
    if not os.path.exists(COUNTER_FILE):
        return 0
    with open(COUNTER_FILE, "r") as f:
        return json.load(f).get("count", 0)

def save_count(count):
    with open(COUNTER_FILE, "w") as f:
        json.dump({"count": count}, f)

@app.route("/api/visit")
def visit():
    count = load_count() + 1
    save_count(count)
    return jsonify({"visits": count})

@app.route("/")
def home():
    return "Visitor counter API running."

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
