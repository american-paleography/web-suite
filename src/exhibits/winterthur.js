const assert = require('assert').strict;
var fs = require('fs');

module.exports = {
	use: function(app) {
		var express = require('express');
		var router = new express.Router();

		app.use('/winterthur', router);

		router.use(function(req, res, next) {
			res.locals.institution = 'Winterthur';
			res.locals.base_path += 'winterthur/';
			next();
		})

		router.get('/', function(req, res) {
			res.render("landing_page");
		})

		router.get('/concordance', function(req, res) {
			req.mysql.connect();

			if (req.session.user_id) {
				req.mysql.query('SELECT is_admin FROM users WHERE id = ?', [req.session.user_id], function(err, results) {
					res.locals.has_edit_privs = results && results[0] && results[0].is_admin;
				})
			}

			req.mysql.end(function() {
				res.render('exhibit-concordance');
			});

		});

		router.get('/ajax/word-concordance', function(req, res) {
			req.mysql.connect();

			req.mysql.getWords(null, null, function(words) {
				res.set('Content-Type', 'application/json');
				res.send(words);

				req.mysql.end();
			})
		})

		router.get('/ajax/lexicon', function(req, res) {
			req.mysql.connect();

			var query = `
				SELECT
					*
				FROM (
					SELECT
						w.lc_text AS text,
						(SELECT count(*) FROM cut_polygons p WHERE p.word_id = w.id) AS poly_count,
						(SELECT count(*) FROM words_lines_join j WHERE j.word_id = w.id) AS full_count
					FROM
						words w
					ORDER BY w.lc_text ASC
				) AS lexicon
				WHERE poly_count > 0
				;
			`;

			req.mysql.query(query, function(err, results) {
				if (err) {
					console.log(err);
				}
				res.send({words: results});
			});
			
			req.mysql.end();
		})

		router.get('/ajax/polygons-for/:word', function(req, res) {
			var word = req.params.word;

			var query = `
				SELECT
					po.id as id,
					f.name as filename,
					pr.name as projname,
					f.author_name as author_name,
					f.author_gender as author_gender,
					f.year as year,
					f.location as location,
					po.notes_public as notes_public
				FROM
						words as w
					LEFT JOIN
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
					w.lc_text = ?
				;
			`;

			req.mysql.connect();
			req.mysql.promQuery(query, [word]).then(results => {
				res.send({polygons: results});
			})

			req.mysql.end();
		})
	},
}
