# Coding Standards for Migration

This document defines the **modern coding standards** for the TaskFlow API migration.

---

## Python: Flask → FastAPI Migration

### 1. Type Hints Required

**Before (Legacy):**

```python
def get_task(task_id):
    return task
```

**After (Modern):**

```python
def get_task(task_id: int) -> Task:
    return task
```

### 2. Pydantic Models for Validation

**Before (Legacy):**

```python
# Plain dict
task = {
    "title": "Task",
    "status": "pending"
}
```

**After (Modern):**

```python
from pydantic import BaseModel, Field
from typing import Optional

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = Field(default="pending")
    priority: str = Field(default="medium")

class Task(TaskCreate):
    id: int
    created_at: datetime
    updated_at: datetime
```

### 3. Async/Await Patterns

**Before (Legacy):**

```python
def get_tasks():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks")
    return cursor.fetchall()
```

**After (Modern):**

```python
async def get_tasks() -> list[Task]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT * FROM tasks")
        rows = await cursor.fetchall()
        return [Task(**dict(row)) for row in rows]
```

### 4. Parameterized SQL Queries

**Before (Legacy - SQL Injection!):**

```python
query = f"SELECT * FROM tasks WHERE id = {task_id}"
cursor.execute(query)
```

**After (Modern):**

```python
query = "SELECT * FROM tasks WHERE id = ?"
cursor.execute(query, (task_id,))
```

### 5. FastAPI Route Handlers

**Before (Legacy - Flask):**

```python
@app.route('/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    task = task_service.get_task(task_id)
    if not task:
        return jsonify(None)
    return jsonify(task)
```

**After (Modern - FastAPI):**

```python
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: int):
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
```

### 6. Environment Variables

**Before (Legacy):**

```python
DB_PASSWORD = "myPaSSword!"  # Hardcoded
```

**After (Modern):**

```python
import os
from dotenv import load_dotenv

load_dotenv()
DB_PASSWORD = os.getenv('DB_PASSWORD')
```

---

## Node.js: JavaScript → TypeScript Migration

### 1. TypeScript with Type Annotations

**Before (Legacy):**

```javascript
function getTask(id) {
  return db.query("SELECT * FROM tasks WHERE id = " + id);
}
```

**After (Modern):**

```typescript
async function getTask(id: number): Promise<Task | null> {
  return await db.tasks.findUnique({ where: { id } });
}
```

### 2. Interfaces for Data Models

**Before (Legacy):**

```javascript
// No types
var task = {
  title: "Task",
  status: "pending",
};
```

**After (Modern):**

```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date?: Date;
  assigned_to?: number;
  created_at: Date;
  updated_at: Date;
}

interface TaskCreate {
  title: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  due_date?: Date;
  assigned_to?: number;
}
```

### 3. Async/Await Instead of Callbacks

**Before (Legacy - Callback Hell):**

```javascript
function createTask(data, callback) {
  db.run(query, function (err) {
    if (err) return callback(err);
    db.get(selectQuery, (err2, task) => {
      if (err2) return callback(err2);
      callback(null, task);
    });
  });
}
```

**After (Modern):**

```typescript
async function createTask(data: TaskCreate): Promise<Task> {
  const result = await db.run(query);
  return await db.get(selectQuery, [result.lastID]);
}
```

### 4. Zod for Validation

**Before (Legacy):**

```javascript
app.post("/tasks", (req, res) => {
  var data = req.body; // No validation!
  taskService.createTask(data, (err, task) => {
    res.json(task);
  });
});
```

**After (Modern):**

```typescript
import { z } from "zod";

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().datetime().optional(),
  assigned_to: z.number().int().positive().optional(),
});

app.post("/tasks", async (req: Request, res: Response) => {
  const data = taskCreateSchema.parse(req.body);
  const task = await taskService.createTask(data);
  res.status(201).json(task);
});
```

### 5. Modern ES6+ Patterns

**Before (Legacy):**

```javascript
var express = require("express");
var router = express.Router();

router.get("/tasks", function (req, res) {
  var filters = {
    status: req.query.status,
    priority: req.query.priority,
  };
  // ...
});
```

**After (Modern):**

```typescript
import express, { Request, Response } from "express";
const router = express.Router();

router.get("/tasks", async (req: Request, res: Response) => {
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
  };
  // ...
});
```

### 6. Parameterized Queries

**Before (Legacy - SQL Injection!):**

```javascript
var query = "SELECT * FROM tasks WHERE id = " + id;
db.get(query, callback);
```

**After (Modern):**

```typescript
const query = "SELECT * FROM tasks WHERE id = ?";
const task = await db.get(query, [id]);
```

---

## General Standards (Both Languages)

### Error Handling

**Before (Legacy):**

```python
# No error handling, just crashes
task = get_task(id)
return task
```

**After (Modern):**

```python
try:
    task = await get_task(id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
except Exception as e:
    logger.error(f"Error fetching task {id}: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### HTTP Status Codes

Use proper status codes:

- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Consistent Naming

**Python:**

- `snake_case` for functions and variables
- `PascalCase` for classes
- `UPPER_CASE` for constants

**TypeScript/JavaScript:**

- `camelCase` for functions and variables
- `PascalCase` for classes and interfaces
- `UPPER_CASE` for constants

### Testing

Write tests for:

- Happy path (valid input)
- Validation errors (invalid input)
- Not found scenarios
- Edge cases (empty strings, null values, etc.)

---

## Migration Checklist Per File

When migrating a file, ensure:

- [ ] All functions have type hints/annotations
- [ ] Using modern validation (Pydantic/Zod)
- [ ] Using async/await (no callbacks or blocking calls)
- [ ] SQL queries are parameterized (no string concatenation)
- [ ] Proper error handling with appropriate status codes
- [ ] Environment variables instead of hardcoded values
- [ ] Tests updated and passing
- [ ] No security vulnerabilities

---

## File Migration Order

Always migrate in this order:

1. **Models** - Data structures and validation
2. **Services** - Business logic
3. **Routes** - API endpoints
4. **Infrastructure** - Database, config

This ensures dependencies flow correctly.

---

Use these standards during your migration.
