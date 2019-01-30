const assert = require('assert');

var fs = require('fs');

var mysql = require('mysql');

var CREDS = {
	mysql: JSON.parse(fs.readFileSync('conf/mysql.creds')),
}

var {robustify} = require('./robustify.js');

function createConnection() {
	var sess = mysql.createConnection(CREDS.mysql);

	sess.promQuery = function(...args) {
		return robustify(cb => this.query(...args, cb));
	}

	sess.upsert = function(table, obj, callback) {
		var field_names = Object.keys(obj);
		var values = field_names.map(f => obj[f]);
		var sql = `
			INSERT INTO ${table}(${field_names.join(",")})
			VALUES (${field_names.map(x => "?").join(",")})
			ON DUPLICATE KEY UPDATE ${field_names.map(f => `${f} = values(${f})`).join(',')}
			;
		`;

		this.query(sql, values, callback);
	}

	sess.unroll = function(nameToFieldMapping) {
		return Object.keys(nameToFieldMapping).map(n => `${nameToFieldMapping[n]} AS ${n}`).join(',');
	}



	sess.getWords = function(filter, options, callback) {
		sess.query('SELECT id, points, line_id, text FROM cut_polygons WHERE line_id IS NOT NULL;', function(err, poly_results, fields) {
			// need: text, line, file, is-winterthur

			var fields = {
				text: 't.value',
				line_id: 'l.id',
				file_id: 'f.id',
				filename: 'f.name',
				projname: 'pr.name',
			}

			

			var line_q = `SELECT ${sess.unroll(fields)} FROM line_annos AS t LEFT JOIN \`lines\` AS l ON l.id = t.line_id LEFT JOIN files AS f ON f.id = l.file_id LEFT JOIN projects AS pr ON pr.id = f.project WHERE t.type_id = 1 AND EXISTS (SELECT po.id FROM cut_polygons AS po WHERE po.line_id = l.id);`

			sess.query(line_q, function(err, line_results, fields) {
				if (err) {
					console.log(err);
				}

				// this step is vitally important, and needs to be revisited (currently it's just a simple "poly? poly == word" thing)
				
				poly_results.forEach(p => p.points = JSON.parse(p.points));
				var words = poly_results.map(p => ({text: p.text, line_id: p.line_id, poly_id: p.id, poly: p}));

				words.forEach(w => {
					w.line = line_results.filter(l => l.line_id == w.line_id)[0];
				})

				callback(words);
			})
		});
	}

	sess.getWordId = function(text, callback) {
		this.query('SELECT id FROM words WHERE lc_text = ?', [text], function(err, results) {
			if (results && results[0]) {
				callback(results[0].id);
			} else {
				sess.query('INSERT INTO words(lc_text) VALUES (?)', [text], function(err, results) {
					sess.query('SELECT id FROM words WHERE lc_text = ?', [text], function(err, results) {
						callback(results[0].id);
					})
				})
			}
		})
	}

	sess.promSearchPolygonsByWord = function(condition, params) {
		var query = `
			SELECT
				po.id as id,
				po.text as text,
				f.name as filename,
				pr.name as projname,
				f.author_name as author_name,
				f.author_gender as author_gender,
				f.year as year,
				f.location as location,
				po.notes_public as notes_public
			FROM
					words as w
				INNER JOIN
					cut_polygons as po
				ON
					po.word_id = w.id
				LEFT JOIN
					files as f
				ON
					f.id = po.file_id
				LEFT JOIN
					projects as pr
				ON
					pr.id = f.project
			WHERE
				${condition}
			;
		`;

		return sess.promQuery(query, params);
	}

	return sess;
}




module.exports = {
	createConnection,
}
