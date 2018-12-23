const assert = require('assert').strict;
var fs = require('fs');

module.exports = {
	use: function(app) {
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
			
			req.mysql.query('SELECT points, line_id FROM cut_polygons WHERE file_id = ?', [req.params.file_id], function(err, results) {
				console.log(err);
				var polygons = results.map(row => {
					return { points: JSON.parse(row.points), line_id: row.line_id };
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
