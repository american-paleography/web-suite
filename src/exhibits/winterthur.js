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

		router.get('/ajax/polygon-list/single-word', function(req, res) {
			req.mysql.connect();

			var conditions = [
				"w.lc_text NOT LIKE '% %' AND CHAR_LENGTH(w.lc_text) > 1"
			];
			var sqlParams = [];

			if (req.query.begins_with) {
				conditions.push("w.lc_text LIKE ?");
				sqlParams.push(req.query.begins_with + '%');
			}


			res.set('Content-Type', 'application/json');

			req.mysql.promQuery(`
				SELECT
					p.id AS src, -- since that's basically our img src there
					p.text AS text,
					w.lc_text AS lex_entry,
					f.name AS comes_from -- this is where the image comes from
				FROM cut_polygons p
				INNER JOIN words w ON w.id = p.word_id
				INNER JOIN files f ON f.id = p.file_id
				WHERE
					${conditions.map(c => `(${c})`).join(" AND ")}
				ORDER BY
					lex_entry ASC
				;
			`, sqlParams)
			.then(polygons => res.send({polygons}))
			.then(req.mysql.end());
		})

		router.get('/gallery/cutouts/word', function(req, res) {
			var pug = require('pug');
			res.render("exhibit-gallery", {pug_file: pug.compileFileClient('./views/gallery-clip.pug', {name:"makeGallery"})});
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

			req.mysql.connect();
			req.mysql.promSearchPolygonsByWord('w.lc_text = ?', [word]).then(results => {
				res.send({polygons: results});
			})

			req.mysql.end();
		})
	},
}
