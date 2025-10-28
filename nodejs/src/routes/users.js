var express = require('express');
var router = express.Router();
var userService = require('../services/user_service');

router.get('/users', function(req, res) {
    userService.getUsers(function(err, users) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        res.json({ users: users });
    });
});

router.get('/users/:id', function(req, res) {
    var userId = parseInt(req.params.id);
    userService.getUser(userId, function(err, user) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        if (!user) {
            return res.json(null);
        }
        res.json(user);
    });
});

router.post('/users', function(req, res) {
    var data = req.body;
    userService.createUser(data, function(err, user) {
        if (err) {
            return res.json({ error: 'Internal server error' });
        }
        res.json(user);
    });
});

module.exports = router;

