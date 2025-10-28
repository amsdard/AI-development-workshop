# Workshop Troubleshooting Guide

This guide covers common issues you might encounter during the workshop and how to resolve them.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Configuration Issues](#configuration-issues)
3. [Migration Issues](#migration-issues)
4. [AI Tool Issues](#ai-tool-issues)
5. [Testing Issues](#testing-issues)
6. [General Debugging Tips](#general-debugging-tips)

---

## Installation Issues

### Python: Module Not Found

**Problem:**
```
ModuleNotFoundError: No module named 'flask'
```

**Solutions:**
1. Ensure you're in the virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate

   # Mac/Linux
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. If still failing, try upgrading pip first:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

---

### Node.js: Cannot Find Module

**Problem:**
```
Error: Cannot find module 'express'
```

**Solutions:**
1. Install dependencies:
   ```bash
   cd nodejs
   npm install
   ```

2. If using different Node version, try:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check Node version (need 18+):
   ```bash
   node --version
   ```

---

### Python: Wrong Python Version

**Problem:**
```
SyntaxError: invalid syntax (using Python 2.7)
```

**Solutions:**
1. Check your Python version:
   ```bash
   python --version  # Should be 3.9+
   ```

2. Use `python3` explicitly:
   ```bash
   python3 -m venv venv
   python3 -m src.app
   ```

3. On Windows, use Python Launcher:
   ```bash
   py -3 -m venv venv
   ```

---

### SQLite Database Locked

**Problem:**
```
sqlite3.OperationalError: database is locked
```

**Solutions:**
1. Close any database browser tools (DB Browser for SQLite, etc.)
2. Stop all running instances of the app
3. Delete the database and recreate:
   ```bash
   # Python
   rm taskflow.db
   python -m src.db

   # Node.js
   rm taskflow.db
   npm start  # Will recreate automatically
   ```

---

## Configuration Issues

### AI Tool Not Following Custom Instructions

**Problem:** AI generates code that doesn't follow your coding standards.

**Solutions:**

#### Claude Code
1. Verify `.claude/settings.json` exists
2. Check file permissions (must be readable)
3. Restart VS Code
4. Test with a simple prompt: "What coding standards should you follow?"

#### Cursor
1. Verify `.cursor/rules/rules.md` file exists in project root
2. Check file is not empty
3. Try Cmd/Ctrl + Shift + P → "Cursor: Reload Rules"
4. Make sure you're in Composer mode (not just chat)

#### GitHub Copilot
1. Verify `.github/copilot-instructions.md` exists
2. File must be in `.github` directory
3. Restart VS Code
4. May take a few minutes for GitHub to sync

---

### AI Can Still Access Secret Files

**Problem:** After adding files to ignore list, AI still reads secrets.

**Solutions:**
1. Check your configuration file syntax (JSON valid? Correct paths?)
2. Verify file is saved
3. Restart your AI tool or VS Code
4. Try the test again

#### Claude Code
1. Check `.claude/settings.json` syntax:
   ```json
   {
     "permissions": {
       "deny": ["Read(**/secrets.txt)", "Read(**/.env*)"]
     }
   }
   ```

2. Path must be relative to project root
3. Use glob patterns: `**/.env*` for all .env files
4. Restart Claude Code or VS Code

#### Cursor / Github Copilot
1. Check `.cursorignore`/`.gitignore` syntax (one pattern per line):
   ```
   **/secrets.txt
   .env
   .env.*
   **/.env*
   ```

2. File must be in project root
3. No comments or empty lines at start
4. Restart Cursor

#### Test It
Ask AI: "What is the database password?"
- ✅ Should refuse or say it cannot access the file
- ❌ If it gives "myPaSSword!", configuration is wrong

---

### Hooks Not Triggering

**Problem:** Tests don't run automatically after commands.

**Solutions:**

#### Claude Code
1. Check hook file exists:
   ```bash
   ls .claude/hooks/post-command.sh
   ```

2. Make executable:
   ```bash
   chmod +x .claude/hooks/post-command.sh
   ```

3. Check hook script syntax:
   ```bash
   bash -n .claude/hooks/post-command.sh  # Check syntax
   bash -x .claude/hooks/post-command.sh  # Debug run
   ```

4. Verify `.claude/settings.json` hooks config:
   ```json
   {
     "hooks": {
       "enabled": true
     }
   }
   ```

#### Cursor
1. Check `.cursor/hooks.json`:
   ```json
   {
     "post-completion": ".cursor/hooks/run-tests.sh"
   }
   ```

2. Make hook executable
3. Test hook manually:
   ```bash
   bash .cursor/hooks/run-tests.sh
   ```

---

## General Debugging Tips

### How to Verify AI Tool Configuration

#### Claude Code
```bash
# Check settings file exists and is valid JSON
cat .claude/settings.json | python -m json.tool

# Ask Claude: "What are your current file access restrictions?"
```

#### Cursor
```bash
# Check rules file exists
cat .cursor/rules/rules.md

# Ask in Cursor: "What coding standards should you follow?"
```

---

### How to Check If Hooks Are Working

#### Claude Code
1. Add debug output to hook:
   ```bash
   #!/bin/bash
   echo "Hook triggered! Command: $COMMAND_NAME"
   pytest tests/ -v
   ```

2. Run a command and watch terminal output
3. Check VS Code Output panel → Claude Code

#### Cursor
1. Add debug to hook script:
   ```bash
   #!/bin/bash
   echo "Hook running at $(date)" >> hook.log
   npm test
   ```

2. Check `hook.log` after commands

---

### How to Reset Everything

**Complete reset if nothing works:**

```bash
# 1. Delete virtual environment and dependencies
rm -rf venv node_modules

# 2. Delete databases
rm taskflow.db test.db *.db

# 3. Delete cache
rm -rf __pycache__ .pytest_cache

# 4. Reinstall

# Python:
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m src.db

# Node.js:
npm cache clean --force
npm install
npm start
```