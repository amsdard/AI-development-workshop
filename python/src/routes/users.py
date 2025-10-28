from flask import Blueprint, jsonify, request
from services import user_service

users_bp = Blueprint("users", __name__)


@users_bp.route("/users", methods=["GET"])
def get_users():
    """Get all users"""
    users = user_service.get_users()
    return jsonify({"users": users})


@users_bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    """Get user by ID"""
    user = user_service.get_user(int(user_id))

    if user is None:
        return jsonify(None)

    return jsonify(user)


@users_bp.route("/users", methods=["POST"])
def create_user():
    """Create new user"""
    data = request.json

    user = user_service.create_user(data)

    return jsonify(user)
