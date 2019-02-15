var dbUtils = require('../src/db_util.js');

var textUtils = require('../src/text-utils.js')

var mysql = dbUtils.createConnection();

mysql.promQuery('SELECT id, text FROM cut_polygons WHERE text IS NOT NULL AND is_word IS NULL')
.then(results => {
	return Promise.all(results.map(row => {
		var text = textUtils.stripWhitespace(row.text);
	
		return mysql.promGetWordId(textUtils.normalizeHeadword(row.text))
		.then(wordId => {
			var phr = textUtils.isPhrase(text);
			var wrd = textUtils.isWord(text);
			var ltr = textUtils.isLetter(text);
			console.log(text, [phr, wrd, ltr]);
			return mysql.promQuery(`
				UPDATE cut_polygons
				SET
					text = ?,
					word_id = ?,
					is_phrase = ?,
					is_word = ?,
					is_letter = ?
				WHERE
					id = ?
				;
			`, [
				text,
				wordId,
				phr,
				wrd,
				ltr,
				row.id,
			])
		});
	}))
}).then(_ => mysql.end())
