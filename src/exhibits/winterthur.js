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

		router.use(function(req, res, next) {
			req.mysql.getWords = function(filter, options, callback) {
				req.mysql.query('SELECT id, points, line_id, text FROM cut_polygons WHERE line_id IS NOT NULL;', function(err, poly_results, fields) {
					// need: text, line, file, is-winterthur

					var fields = {
						text: 't.value',
						line_id: 'l.id',
						file_id: 'f.id',
						filename: 'f.name',
						projname: 'pr.name',
					}

					

					var line_q = `SELECT ${req.mysql.unroll(fields)} FROM line_annos AS t LEFT JOIN \`lines\` AS l ON l.id = t.line_id LEFT JOIN files AS f ON f.id = l.file_id LEFT JOIN projects AS pr ON pr.id = f.project WHERE t.type_id = 1 AND EXISTS (SELECT po.id FROM cut_polygons AS po WHERE po.line_id = l.id);`

					req.mysql.query(line_q, function(err, line_results, fields) {
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


			next();
		})

		router.get('/', function(req, res) {
			res.render("landing_page");
		})

		router.get('/concordance', function(req, res) {
			res.render('exhibit-concordance');
		});

		router.get('/ajax/word-concordance', function(req, res) {
			req.mysql.connect();

			req.mysql.getWords(null, null, function(words) {
				res.set('Content-Type', 'application/json');
				res.send(words);

				req.mysql.end();
			})
		})

		return;

		app.get('/page-batches/list', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT name FROM projects ORDER BY id DESC;', function(err, results, fields) {
				res.render('page-batches/list', { projects: results });
			});

			req.mysql.end();
		})

		app.get('/page-batches/:proj_name/files', function(req, res) {
			var proj = req.params.proj_name;
			var path = "/imagestore/main/" + proj;
			fs.readdir(path, function(err, results) {
				var filenames = results.filter(f => f.match(/\.jpe?g$/i));
				res.render('page-batches/files', { files: filenames, proj, }) 
			})
		})

		app.get('/page-batches/:proj/details/:page', function(req, res) {
			var { proj, page } = req.params;

			req.mysql.connect();

			var locals = { proj, page };

			req.mysql.end(function() {
				res.render('page-batches/details', locals);
			});
		})

		app.get('/ajax/page-id-for/:proj_name/:page_name', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT f.id as file_id FROM files AS f LEFT JOIN projects AS p ON p.id = f.project WHERE p.name = ? AND f.name = ?', [req.params.proj_name, req.params.page_name], function(err, results) {
				if (err || results.length == 0) {
					res.send({ok:false});
				} else {
					res.send({ok:true, id: results[0].file_id})
				}
			})

			req.mysql.end();
		})

		app.post('/ajax/save-cut-polygon', function(req, res) {
			var {file_id, points, undo_indices, transcription} = req.body;
			var {line_id, text, start, end} = transcription

			var creator_id = req.session.user_id;
			if (!creator_id || typeof creator_id != 'number') {
				creator_id = null;
			}

			req.mysql.query('INSERT INTO cut_polygons (file_id, points, undo_point_indices, line_id, text, trans_start, trans_end, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [file_id, JSON.stringify(points), JSON.stringify(undo_indices), line_id, text, start, end, creator_id], function(err, results) {
				if (err) {
					console.log(err);
					res.send({ok:false});
				} else {
					req.mysql.query('SELECT LAST_INSERT_ID() AS id', function(err, results) {
						if (err) {
							console.log(err);
							res.send({ok:true});
						} else {
							console.log(results);
							res.send({ok:true, id: results[0].id});
						}
					})
				}

				req.mysql.end();
			});
		})

		app.post('/ajax/delete-polygon/:polygon_id', function(req, res) {
			var {polygon_id} = req.params;

			req.mysql.query('DELETE FROM cut_polygons WHERE id = ?', [polygon_id], function(err, results) {
				if (err) {
					console.log(err);
					res.send({ok:false});
				} else {
					res.send({ok:true});
				}
			});

			req.mysql.end();
		})

		app.get('/ajax/lines-for-file/:file_id', function(req, res) {
			req.mysql.connect()

			var payload = {};

			req.mysql.query('SELECT trans_line.id AS line_id, trans.value AS text, trans_line.index_num AS line_num FROM line_annos as trans LEFT JOIN `lines` AS trans_line ON trans_line.id = trans.line_id WHERE trans.type_id = 1 AND trans_line.file_id = ? ORDER BY trans_line.index_num ASC', [req.params.file_id], function(err, results) {
				payload.lines = results;
			})

			req.mysql.end(function() {
				res.send(payload);
			});
		})

		app.get('/ajax/info-for-file/:file_id', function(req, res) {
			req.mysql.connect()
			
			req.mysql.query('SELECT f.name AS file_name, p.name AS project_name FROM files AS f LEFT JOIN projects AS p ON f.project = p.id WHERE f.id = ?', [req.params.file_id], function(err, results) {
				var host = "http://image-store.tpen-demo.americanpaleography.org";
				results.forEach(row => {
					row.path = `/${row.project_name}/${row.file_name}`;
					row.href = host + row.path;
				});
				
				res.send(results[0]);
			});
			req.mysql.end();
		})

		app.get('/ajax/polygons-for-file/:file_id', function(req, res) {
			req.mysql.connect()
			
			req.mysql.query('SELECT points, line_id, text FROM cut_polygons WHERE file_id = ?', [req.params.file_id], function(err, results) {
				console.log(err);
				var polygons = results.map(row => {
					return { points: JSON.parse(row.points), line_id: row.line_id, text: row.text };
				});
				
				res.send({polygons});
			});
			req.mysql.end();
		})

		app.get('/polygons/browse', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT file_id FROM cut_polygons GROUP BY file_id', function(err, results) {
				var ids = results.map(r => r.file_id);
				res.render('browse-polygons', {file_ids: ids});
			});

			req.mysql.end();
		})
	},
}
