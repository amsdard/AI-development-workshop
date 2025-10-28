from flask import Flask
from routes.tasks import tasks_bp
from routes.users import users_bp
from db import init_db

app = Flask(__name__)


# Register blueprints
app.register_blueprint(tasks_bp)
app.register_blueprint(users_bp)


@app.route("/")
def index():
    return {"message": "TaskFlow API - Legacy Version"}


@app.route("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    # Initialize database on startup
    import asyncio

    asyncio.run(init_db())

    app.run(debug=True, host="0.0.0.0", port=5000)
