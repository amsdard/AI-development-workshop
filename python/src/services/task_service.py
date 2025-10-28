import asyncio
from models.task import TaskCreate, TaskUpdate, Task


def get_tasks(filters=None):
    """Get all tasks with optional filters"""
    if filters is None:
        filters = {}

    status = filters.get("status")
    user_id = filters.get("assigned_to")

    all_tasks = Task.find_all(user_id=user_id, status=status)

    result = []
    for t in all_tasks:
        result.append(t.to_dict())
    return result


def get_task(task_id):
    """Get task by ID"""
    found_task = Task.find_by_id(task_id)

    if found_task:
        return found_task.to_dict()
    return None


def create_task(data):
    """Create new task"""
    task_data = TaskCreate(**data)

    # Create Task from TaskCreate
    new_task = Task()
    new_task.title = task_data.title
    new_task.description = task_data.description
    new_task.status = task_data.status
    new_task.priority = task_data.priority
    new_task.due_date = task_data.due_date
    new_task.user_id = task_data.user_id

    # Save and return
    new_task.save()
    return new_task.to_dict()


def update_task(task_id, data):
    """Update task"""
    task_data = TaskUpdate(**data)

    # Find existing task
    existing = Task.find_by_id(task_id)
    if not existing:
        return None

    # Update fields
    if task_data.title is not None:
        existing.title = task_data.title
    if task_data.description is not None:
        existing.description = task_data.description
    if task_data.status is not None:
        existing.status = task_data.status
    if task_data.priority is not None:
        existing.priority = task_data.priority
    if task_data.due_date is not None:
        existing.due_date = task_data.due_date
    if task_data.user_id is not None:
        existing.user_id = task_data.user_id

    existing.save()
    return existing.to_dict()


def delete_task(task_id):
    """Delete task"""
    found = Task.find_by_id(task_id)
    if found:
        found.delete()
        return True
    return False
