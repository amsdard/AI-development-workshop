var User = require('../models/user');

function getUsers(callback) {
    User.findAll(function(err, users) {
        if (err) return callback(err);
        
        var usersList = [];
        for (var i = 0; i < users.length; i++) {
            usersList.push(users[i].toDict());
        }
        
        callback(null, usersList);
    });
}

function getUser(userId, callback) {
    User.findById(userId, function(err, user) {
        if (err) return callback(err);
        
        if (user) {
            callback(null, user.toDict());
        } else {
            callback(null, null);
        }
    });
}

function createUser(data, callback) {
    var user = new User();
    user.username = data.username;
    user.email = data.email;
    user.first_name = data.first_name || '';
    user.last_name = data.last_name || '';
    user.is_active = data.is_active !== undefined ? data.is_active : true;
    
    if (data.password) {
        user.setPassword(data.password);
    }
    
    user.save(function(err) {
        if (err) return callback(err);
        callback(null, user.toDict());
    });
}

module.exports = {
    getUsers: getUsers,
    getUser: getUser,
    createUser: createUser
};

