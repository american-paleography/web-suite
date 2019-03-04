const assert = require('assert').strict;

var bcrypt = require('bcrypt');
const bcrypt_salt_rounds = 12;

module.exports = {
	use: function(app) {
		app.get('/login', function(req, res) {
			var fs = require('fs');
			fs.readFile('public/user.html', function(err, data) {
				res.send(data.toString());
			})
		})

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
					res.send({ok:false, err: "That user already exists"})
					req.mysql.end();
				}
			})
		});

		
		// note: DOES leak information about user-existence. This is okay; user existence is not secret,
		//       and some of the endusers do benefit from knowing if they've entered their username correctly
		app.post('/login', function(req, res) {
			var username = req.body.username;

			// specific case that a lot of people accidentally do
			if (req.body.username.toLowerCase() == 'demo-priv') {
				res.send({
					ok: false,
					err: `The username '${username}' is used for T-Pen, which currently has a separate login system.\n\nif you need to log in here, either register a new username, or use whatever credentials you created for *this* subdomain.`,
				});
				return;
			}

			req.mysql.connect();

			req.mysql.query('SELECT id, pw_hash FROM users WHERE username = ?', [username], function(err, results, fields) {
				if (!results[0]) {
					res.send({ok:false, err: `User "${username}" does not exist in this system.`});
					return false;
				}
				var hash = results[0].pw_hash;
				bcrypt.compare(req.body.password, hash).then(function(valid) {
					if (valid) {
						req.session.user_id = results[0].id;
						req.session.username = req.body.username;
						res.send({ok:true});
					} else {
						res.send({ok:false, err: `Wrong password for user "${username}".`});
					}
				})
			});

			req.mysql.end();
		});
	}
}
