var Task = require('../models/task');

function getTasks(filters, callback) {
    if (!filters) filters = {};
    
    Task.findAll(filters, function(err, tasks) {
        if (err) return callback(err);
        
        var result = [];
        for (var i = 0; i < tasks.length; i++) {
            result.push(tasks[i].toDict());
        }
        
        callback(null, result);
    });
}

function getTask(taskId, callback) {
    Task.findById(taskId, function(err, task) {
        if (err) return callback(err);
        
        if (task) {
            callback(null, task.toDict());
        } else {
            callback(null, null);
        }
    });
}

function createTask(data, callback) {
    var task = new Task();
    task.title = data.title;
    task.description = data.description || '';
    task.status = data.status || 'pending';
    task.priority = data.priority || 'medium';
    task.user_id = data.user_id || null;
    
    if (data.due_date) {
        task.due_date = new Date(data.due_date);
    }
    
    task.save(function(err) {
        if (err) return callback(err);
        callback(null, task.toDict());
    });
}

function updateTask(taskId, data, callback) {
    Task.findById(taskId, function(err, task) {
        if (err) return callback(err);
        
        if (!task) {
            return callback(null, null);
        }
        
        if (data.title !== undefined) task.title = data.title;
        if (data.description !== undefined) task.description = data.description;
        if (data.status !== undefined) task.status = data.status;
        if (data.priority !== undefined) task.priority = data.priority;
        if (data.user_id !== undefined) task.user_id = data.user_id;
        
        if (data.due_date !== undefined) {
            task.due_date = data.due_date ? new Date(data.due_date) : null;
        }
        
        task.save(function(err) {
            if (err) return callback(err);
            callback(null, task.toDict());
        });
    });
}

function deleteTask(taskId, callback) {
    Task.findById(taskId, function(err, task) {
        if (err) return callback(err);
        
        if (!task) {
            return callback(null, false);
        }
        
        task.delete(function(err) {
            if (err) return callback(err);
            callback(null, true);
        });
    });
}

module.exports = {
    getTasks: getTasks,
    getTask: getTask,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask
};

