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

		function makePolygonList(sql_cond, path, friendly_path, page_name) {
			router.get('/ajax/polygon-list/' + path, function(req, res) {
				req.mysql.connect();

				var conditions = [
					sql_cond
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

			router.get('/gallery/cutouts/' + friendly_path, function(req, res) {
				var pug = require('pug');
				res.render("exhibit-gallery", {ajax_path:path, page_display_name: page_name, pug_file: pug.compileFileClient('./views/gallery-clip.pug', {name:"makeGallery"})});
			})
		}

		makePolygonList('is_word = true', 'single-word', 'word', 'Words');
		makePolygonList('is_letter = true', 'letter', 'letter', 'Letters (alphabet)');
		makePolygonList('is_phrase = true', 'phrase', 'phrase', 'Phrases');
		makePolygonList('is_abbrev = true', 'abbreviation', 'abbreviation', 'Abbreviations');
		makePolygonList('is_letter_seq = true', 'letter-sequence', 'letter-sequence', 'Letter Sequences');


		router.get('/browse-pagesets', function(req, res) {
			req.mysql.promQuery('SELECT id, name FROM docsets')
			.then(results => res.locals.sets = results)
			.then(_ => res.render('pageset-exhibit-browsing'))
			.then(_ => req.mysql.end());
		})

		router.get('/pageset-exhibit/:set_id', function(req, res) {
			Promise.all([
				req.mysql.promQuery(`
					SELECT
						f.id as file_id,
						a.value as text,
						l.index_num as line_num,
						f.name as filename,
						p.name as projname
					FROM
						files f
					INNER JOIN
						projects p ON p.id = f.project
					INNER JOIN
						\`lines\` l ON l.file_id = f.id
					INNER JOIN
						line_annos a ON a.type_id = 1 AND a.line_id = l.id
					WHERE file_id IN (SELECT file_id FROM docsets_files_join WHERE docset_id = ?)
					ORDER BY
						filename ASC,
						line_num ASC
					;

				`, [req.params.set_id]).then(results => {
					var files = {}
					results.forEach(line => {
						var fid = line.file_id;
						if (!files[fid]) {
							files[fid] = {
								lines: [],
								id: line.file_id,
								filename: line.filename,
								projname: line.projname,
								src: `http://image-store.tpen-demo.americanpaleography.org/${line.projname}/${line.filename}`,
							}
						}
						var file = files[fid];
						file.lines.push({
							text: line.text,
							num: line.line_num,
						})
					})

					res.locals.files = Object.keys(files).map(k => files[k])
				}),
				req.mysql.promQuery('SELECT name FROM docsets WHERE id = ?', [req.params.set_id]).then(results => {
					res.locals.title = `Document set '${results[0].name}'`;
				})
			]).then(_ => res.render('pageset-exhibit', {main_class:"document"}))
			.then(_ => req.mysql.end())
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
					WHERE
						w.lc_text IS NOT NULL AND w.lc_text != ''
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
