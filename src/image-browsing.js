const assert = require('assert').strict;
var fs = require('fs');
var polygonImageDir = './data/polygon-images';
var ImageSlicer = require('./image-slicer.js');
var textUtils = require('./text-utils.js');

var {robustify} = require('./robustify.js');

module.exports = {
	use: function(app) {
		app.get('/poly-images/:poly_id', function(req, res) {
			var poly_id = req.params.poly_id;
			var path = `${polygonImageDir}/${poly_id}.png`;
			fs.exists(path, function(exists) {
				if (exists) {
					res.sendFile(path, {root:'.'});
				} else {
					ImageSlicer.slice_polygon(poly_id, path, function() {
						res.sendFile(path, {root:"."});
					})
				}
			})
		})

		app.get('/prototype/composite-poly-line/:line_id', function(req, res) {
			var line_id = req.params.line_id;
			var note = '[automatic: composite line image]' 
			
			req.mysql.promQuery("SELECT id FROM cut_polygons WHERE notes_internal = ? AND line_id = ?", [note, line_id])
			.then(results => {
				if (results[0] && results[0].id) {
					finish(results[0].id);
				} else {
					return req.mysql.promQuery("SELECT file_id, points FROM cut_polygons WHERE line_id = ?", [line_id])
					.then(polygons => {
						var file_id = polygons[0].file_id;
						var points = polygons.map(p => JSON.parse(p.points)).reduce((acc, item) => acc.concat(item), []);

						var minX = Math.min(...points.map(p => p[0]));
						var maxX = Math.max(...points.map(p => p[0]));
						var minY = Math.min(...points.map(p => p[1]));
						var maxY = Math.max(...points.map(p => p[1]));

						var path = [
							[minX, minY],
							[maxX, minY],
							[maxX, maxY],
							[minX, maxY],
						];

						return {file_id, path};
					}).then(({file_id, path}) => {
						return req.mysql.promQuery('INSERT INTO cut_polygons(file_id, line_id, points, notes_internal) VALUES (?, ?, ?, ?)', [file_id, line_id, JSON.stringify(path), note])
					}).then(_ => req.mysql.promQuery('SELECT LAST_INSERT_ID() AS id'))
					.then(results => finish(results[0].id))
				}
			})
			.then(_ => req.mysql.end());

			function finish(poly_id) {
				var path = `${polygonImageDir}/${poly_id}.png`;
				fs.exists(path, function(exists) {
					if (exists) {
						res.sendFile(path, {root:'.'});
					} else {
						ImageSlicer.slice_polygon(poly_id, path, function() {
							res.sendFile(path, {root:"."});
						})
					}
				})
			}
		})

		app.get('/editor/docsets', function(req, res) {
			req.mysql.connect();

			req.mysql.promQuery('SELECT ds.id AS id, ds.name AS set_name, u.username AS creator_name FROM docsets ds LEFT JOIN users u ON u.id = ds.creator_id')
			.then(results => res.locals.docsets = results);

			req.mysql.end(function() {
				res.render('docsets');
			})
		})

		app.post('/editor/ajax/create-docset', function(req, res) {
			req.mysql.connect()

			req.mysql.query('INSERT INTO docsets(name, creator_id) VALUES (?, ?)', [req.body.name, req.session.user_id]);

			req.mysql.end();
		})

		app.get('/editor/docset/:id', function(req, res) {
			var set_id = req.params.id;
		})

		app.get('/ajax/search-polygons/by-initial-substring/:word', function(req, res) {
			var word = req.params.word;

			req.mysql.connect();
			req.mysql.promSearchPolygonsByWord('w.lc_text like ?', [word + '%']).then(results => {
				res.send({polygons: results});
			})

			req.mysql.end();
		})

		app.post('/ajax/polygon/:poly_id/update-notes', function (req, res) {
			var {poly_id} = req.params;

			var {internal, public} = req.body.notes;

			req.mysql.promQuery('UPDATE cut_polygons SET notes_internal = ?, notes_public = ? WHERE id = ?', [internal, public, poly_id]).then(function(results) {
				res.send({ok: true});
			}).catch(err => {
				res.send({ok: false});

				console.error(err);
			})

			req.mysql.end();
		})

		app.get('/polygon/:poly_id', function(req, res) {
			var {poly_id} = req.params;

			req.mysql.connect()

			Promise.all([
				req.mysql.promQuery('SELECT p.text as text, p.trans_start as start, p.trans_end as end, a.value as full_text, p.notes_internal AS notes_internal, p.notes_public AS notes_public FROM cut_polygons p LEFT JOIN line_annos a ON a.line_id = p.line_id AND a.type_id = 1 WHERE p.id = ?', [poly_id]).then(results => {
					if (results[0]) {
						res.locals.poly_text = results[0].text;
						res.locals.line_text = results[0].full_text;
						res.locals.notes = {
							internal: results[0].notes_internal,
							public: results[0].notes_public,
						};
						var full_text = results[0].full_text || '';
						res.locals.annotated = {
							before: full_text.substring(0, results[0].start),
							mid: full_text.substring(results[0].start, results[0].end),
							after: full_text.substring(results[0].end),
						}
					}
				}),

				req.mysql.promQuery('SELECT p.file_id AS file_id FROM cut_polygons p WHERE p.id = ?', [poly_id])
				.then(function(file_res) {
					var {file_id} = file_res[0];
					res.locals.file_id = file_id;

					return req.mysql.promQuery('SELECT l.index_num as line_num, a.value as line_text FROM line_annos a INNER JOIN `lines` l ON a.line_id = l.id INNER JOIN files f ON f.id = l.file_id WHERE a.type_id = 1 AND f.id = ? ORDER BY line_num ASC', [file_id]).then(results => {
						res.locals.file_text = results.map(l => l.line_text).join('\n');
					})
				})
			]).then(_ => {
				req.mysql.end(function() {
					res.render('manage-polygon', {poly_id});
				})
			})
		})

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
			locals.omit_style = true

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

		app.post('/ajax/update-polygon-text', function(req, res) {
			var {poly_id, transcription} = req.body;
			var {line_id, text, start, end} = transcription
			text = textUtils.stripWhitespace(row.text);
	
			var norm_text = textUtils.normalizeHeadword(text);

			req.mysql.getWordId(norm_text, function(word_id) {
				var phr = textUtils.isPhrase(text);
				var wrd = textUtils.isWord(text);
				var ltr = textUtils.isLetter(text);
				req.mysql.promQuery('UPDATE cut_polygons SET line_id = ?, text = ?, trans_start = ?, trans_end = ?, word_id = ?, is_phrase = ?, is_word = ?, is_letter = ? WHERE id = ?', [line_id, text, start, end, word_id, phr, wrd, ltr, poly_id])
				.then(function(results) {
					res.send({ok:true});
				}).catch(_ => res.send({ok:false}));
				req.mysql.end();
			})
		})

		app.post('/ajax/save-cut-polygon', function(req, res) {
			var {file_id, points, undo_indices, transcription, notes} = req.body;
			var {line_id, text, start, end} = transcription

			text = textUtils.stripWhitespace(text);

			var norm_text = textUtils.normalizeHeadword(text);

			var creator_id = req.session.user_id;
			if (!creator_id || typeof creator_id != 'number') {
				creator_id = null;
			}

			req.mysql.getWordId(norm_text, function(word_id) {
				var saveData = {
					file_id,
					points: JSON.stringify(points),
					undo_point_indices: JSON.stringify(undo_indices),
					line_id,
					text,
					trans_start: start,
					trans_end: end,
					creator_id,
					word_id,
					notes_internal: notes,

					is_phrase: textUtils.isPhrase(text),
					is_word: textUtils.isWord(text),
					is_letter: textUtils.isLetter(text),
				}

				req.mysql.promInsertOne('cut_polygons', saveData)
				.then(function(results) {
					return req.mysql.promQuery('SELECT LAST_INSERT_ID() AS id')
					.then(function(results) {
						res.send({ok:true, id: results[0].id});
					})
					.catch(err => res.send({ok:true})) // no ID, but that's fine here
				})
				.catch(err => res.send({ok:false}))
				.finally(_ => req.mysql.end());
			})
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
