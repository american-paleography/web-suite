const assert = require('assert').strict;

var bcrypt = require('bcrypt');
const bcrypt_salt_rounds = 12;

module.exports = {
	use: function(app) {
		app.post('/create-user', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT COUNT(0) AS count FROM users WHERE username = ?', [req.body.username], function(err, results, fields) {
				if (!err && results[0].count === 0) {
					bcrypt.hash(req.body.password, bcrypt_salt_rounds).then(function(hash) {
						req.mysql.query('INSERT INTO users (username, pw_hash) VALUES (?, ?);', [req.body.username, hash], function(err, results, fields) {
							if (!err) {
								res.send({ok:true});
							} else {
								res.send({ok:false, msg:"error occurred"});
								console.log(err);
							}
						})
						req.mysql.end();
					})
				} else {
					res.send({ok:false})
					req.mysql.end();
				}
			})
		});

		app.post('/login', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT id, pw_hash FROM users WHERE username = ?', [req.body.username], function(err, results, fields) {
				var hash = results[0].pw_hash;
				bcrypt.compare(req.body.password, hash).then(function(valid) {
					if (valid) {
						req.session.user_id = results[0].id;
						res.send({ok:true});
					} else {
						res.send({ok:false});
					}
				})
			});

			req.mysql.end();
		});
	}
}
