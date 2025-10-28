from flask import Blueprint, jsonify, request
from services import task_service

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("/tasks", methods=["GET"])
def get_tasks():
    """Get all tasks with optional filters"""
    filters = {
        "status": request.args.get("status"),
        "priority": request.args.get("priority"),
        "assigned_to": request.args.get("assigned_to"),
    }

    tasks = task_service.get_tasks(filters)
    return jsonify({"tasks": tasks})


@tasks_bp.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    """Get task by ID"""
    task = task_service.get_task(int(task_id))

    if task is None:
        return jsonify(None)

    return jsonify(task)


@tasks_bp.route("/tasks", methods=["POST"])
def create_task():
    """Create new task"""
    data = request.json
    task = task_service.create_task(data)
    return jsonify(task)


@tasks_bp.route("/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    """Update task"""
    data = request.json

    task = task_service.update_task(int(task_id), data)

    if task is None:
        return jsonify(None)

    return jsonify(task)


@tasks_bp.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete task"""
    success = task_service.delete_task(int(task_id))
    return jsonify({"deleted": success})
