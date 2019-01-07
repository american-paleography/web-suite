var dbUtils = require('../src/db_util.js');

var mysql = dbUtils.createConnection();

// probably horribly inefficient (and definitely doesn't close the connection...), so run this *manually* right now
mysql.query('SELECT t.value as text, l.id as line_id FROM line_annos as t LEFT JOIN `lines` AS l ON l.id = t.line_id WHERE t.type_id = 1', function(err, results) {
	console.log(err);
	results.forEach(line => {
		line.text.split(/\s+/).forEach((token, index) => {
			var norm_text = token.toLowerCase();

			mysql.query('SELECT id FROM words WHERE lc_text = ?', [norm_text], function(err, results) {
				function setLink(word_id) {
					var def = {
						word_id,
						line_id: line.line_id,
						tokenized_index: index,
					}
					console.log([line.line_id, token, index, word_id]);
					mysql.upsert('words_lines_join', def, function() {
					})
				}

				if (!results[0]) {
					mysql.query('INSERT INTO words(lc_text) VALUES (?)', [norm_text], function(err, results) {
						// we don't really care about *this* result, since race conditions on insert don't matter much when there's a unique index
						mysql.query('SELECT id FROM words WHERE lc_text = ?', [norm_text], function(err, results) {
							setLink(results[0].id);
						})
					})
				} else {
					setLink(results[0].id);
				}
			})
		})
	})
})
