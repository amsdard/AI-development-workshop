var express = require('express');
var router = express.Router();
var taskService = require('../services/task_service');

router.get('/tasks', function(req, res) {
    var filters = {
        status: req.query.status,
        priority: req.query.priority,
        assigned_to: req.query.assigned_to,
        user_id: req.query.assigned_to
    };
    
    taskService.getTasks(filters, function(err, tasks) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        res.json({ tasks: tasks });
    });
});

router.get('/tasks/:id', function(req, res) {
    var taskId = parseInt(req.params.id);
    taskService.getTask(taskId, function(err, task) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        if (!task) {
            return res.json(null);
        }
        res.json(task);
    });
});

router.post('/tasks', function(req, res) {
    var data = req.body;
    taskService.createTask(data, function(err, task) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        res.json(task);
    });
});

router.put('/tasks/:id', function(req, res) {
    var taskId = parseInt(req.params.id);
    var data = req.body;
    
    taskService.updateTask(taskId, data, function(err, task) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        if (!task) {
            return res.json(null);
        }
        res.json(task);
    });
});

router.delete('/tasks/:id', function(req, res) {
    var taskId = parseInt(req.params.id);
    
    taskService.deleteTask(taskId, function(err, success) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        res.json({ deleted: success });
    });
});

module.exports = router;

