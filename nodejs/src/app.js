var express = require('express');
var usersRouter = require('./routes/users');
var tasksRouter = require('./routes/tasks');
var db = require('./db');

var app = express();

// Enable pretty-printed JSON for development
app.set('json spaces', 2);

app.use(express.json());
app.use(usersRouter);
app.use(tasksRouter);

app.get('/', function(req, res) {
    res.json({ message: 'TaskFlow API - Legacy Version' });
});

app.get('/health', function(req, res) {
    res.json({ status: 'ok' });
});

var port = 5000;

db.initDB(function(err) {
    if (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
    console.log('Database initialized successfully');
    
    app.listen(port, function() {
        console.log('TaskFlow API server running on http://localhost:' + port);
    });
});

