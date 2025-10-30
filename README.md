# 🚀 AI Coding Tools Workshop: TaskFlow API

TaskFlow is a simple task management API that allows teams to create, assign, and track tasks. Your task is to migrate from legacy to new, modern implementation and add new feature to TaskFlow.

## 🎯 What You'll Do

### Task 1: Legacy Code Migration (75 min)

Transform a poorly-written legacy codebase into modern, secure code:

**Current Problems:**

- 🔴 SQL injection vulnerabilities
- 🔴 No input validation
- 🔴 No type safety
- 🔴 Old-fashioned patterns (callbacks, string concatenation)

**Your Goal:**

- ✅ Fix all security issues
- ✅ Add type safety (TypeScript or Python type hints)
- ✅ Add input validation (Zod or Pydantic)
- ✅ Modernize code patterns (async/await)
- ✅ Test application

### Task 2: Build a New Feature (45 min)

Add a new `/tasks/overdue` endpoint that:

- Returns all tasks past their due date
- Calculates how many days overdue
- Supports pagination and filtering
- Follows the modern patterns you just learned

All of tasks shoul be implemented with AI.

## 🎓 Learning Outcomes

After completing this workshop, you'll be able to:

- Use AI tools effectively for code migration
- Implement automated quality checks
- Build features with AI assistance
- Create repeatable development workflows
- Understand modern API design patterns
- Apply security best practices

## Requirements

- One of these AI coding tools installed and active:
  - Cursor
  - Claude Code
  - GitHub Copilot
  - Windsurf
  - Or similar
- Git
- Either Node.js (v18+) or Python (v3.9+)

## 🆘 Getting Help

During the Workshop:

1. Check `TROUBLESHOOTING.md` for common issues
2. Ask your AI assistant (e.g., "Why is this test failing?")
3. Ask the workshop instructor

## 📚 Key Files to Know

- `WORKSHOP_TASKS.md` - Your step-by-step tasks guide
- `CODING_STANDARDS.md` - Good practices and before/after examples, used as AI rules to follow
- `TROUBLESHOOTING.md` - Help when you're stuck

## 🚀 Getting Started

1. **Choose your language** (Python or Node.js) and remove the other one
2. **Navigate to the appropriate directory and install dependencies:**

   <details>
   <summary><strong>Python</strong></summary>

   ```
   cd python
   python -m venv venv
   .\venv\Scripts\activate (Windows) OR source venv/bin/activate (Linux)
   pip install -r requirements.txt
   python src/app.py
   ```

   </details>

   <details>
   <summary><strong>Node.js</strong></summary>

   ```
   cd nodejs
   npm install
   npm start
   ```

   </details>

3. **Verify app is working:** Visit http://localhost:5000/tasks - you should see sample tasks.

4. **Configure your AI tool rules:** Ask you agent to create rules with specific command (`/init` for Claude Code and `/Generate Cursor Rules` for Cursor) using `CODING_STANDARDS.md` file.
In case of Github Copilot or other tool you can copy content of `CODING_STANDARDS.md` into new file: `.github/copilot-instructions.md` or appropraite for you tool.

## 🚦 Ready to Start?

- ✅ Installed dependencies in your chosen directory?
- ✅ Configured your AI tool rules?
- ✅ Verified the app runs?

Great! Open `WORKSHOP_TASKS.md` and start with Task 1, Part A.

---

**Happy coding with AI! 🤖✨**


