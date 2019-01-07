var dbUtils = require('../src/db_util.js');

var mysql = dbUtils.createConnection();

// probably horribly inefficient (and definitely doesn't close the connection...), so run this *manually* right now
mysql.query('SELECT id, text, word_id FROM cut_polygons WHERE text IS NOT NULL', function(err, results) {
	results.forEach(poly => {
		var norm_text = poly.text.toLowerCase();

		mysql.query('SELECT id FROM words WHERE lc_text = ?', [norm_text], function(err, results) {
			if (results[0]) {
				if (results[0].id != poly.word_id) {
					mysql.query('UPDATE cut_polygons SET word_id = ? WHERE id = ?', [results[0].id, poly.id], function(err, results) {
						console.log(['update', poly.id, poly.text, poly.word_id]); // progress marker
					});
				} else {
					console.log(['good', poly.id, poly.text, poly.word_id]); // progress marker
				}
			} else {
				// word not found!
				mysql.query('INSERT INTO words(lc_text) VALUES (?)', [norm_text], function(err, results) {
					// we don't really care about *this* result, since race conditions on insert don't matter much when there's a unique index
					mysql.query('SELECT id FROM words WHERE lc_text = ?', [norm_text], function(err, results) {
						mysql.query('UPDATE cut_polygons SET word_id = ? WHERE id = ?', [results[0].id, poly.id], function(err, results) {
							console.log(['missing', poly.id, poly.text, poly.word_id]); // progress marker
						});
					})
				})
			}
		})
	})
})
