var sha = require('sha256-file')
var dbUtils = require('../src/db_util.js');

var mysql = dbUtils.createConnection();

var imagestore = '/imagestore/main';

mysql.query('SELECT f.id AS id, f.name AS filename, p.name AS projname FROM files f INNER JOIN projects p ON p.id = f.project WHERE f.sha256 IS NULL', function(err, results) {
	if (err) {
		console.log(err);
		return;
	}

	results.forEach(file => {
		var {projname, filename} = file;
		var source_path = `${imagestore}/${projname}/${filename}`;

		sha(source_path, function(err, value) {
			console.log(`${file.id} / ${value}`)
			if (err) {
				console.log(err);
				return;
			}

			mysql.query('UPDATE files SET sha256 = ? WHERE id = ?', [value, file.id], function(err, results) {
				if (err) {
					console.log(err);
				}
			})
		})
	})
})
