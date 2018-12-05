module.exports = {
	use: function(app) {
		function parseSearchToQuery(obj) {
			var conditions = [];
			var params = [];
			if (obj.text) {
				obj.text.split(",").forEach(term => {
					conditions.push('trans.value LIKE ?');
					params.push(`%${term}%`);
				});
			}
			if (obj.short_tag) {
				obj.short_tag.split(",").forEach(term => {
					conditions.push('trans.value LIKE ?');
					params.push(`%<${term}>%`);
				});
			}

			// so that it can be fed right into a `.selectLineData(clause, params, cb)`
			return [conditions.join(" AND "), params];
		}

		app.use(function(req, res, next) {
			req.mysql.selectLineData = function(whereClause, params, callback) {
				var base_query = 'SELECT x, y, w, h, trans.value AS text, trans_line.index_num AS line_num, file.name AS filename, proj.name AS proj_name FROM line_annos as trans LEFT JOIN `lines` AS trans_line ON trans_line.id = trans.line_id LEFT JOIN files AS file ON trans_line.file_id = file.id LEFT JOIN projects AS proj ON proj.id = file.project WHERE trans.type_id = 1 AND ';

				return req.mysql.query(base_query + whereClause, params, callback);
			}

			next();
		})

		app.get('/dev/images/get-data', function(req, res) {
			req.mysql.connect();

			req.mysql.selectLineData('file.project = 5914 LIMIT 50;', [], function(err, results, fields) {
				if (err) { console.log(err) }
				if (results) {
					res.set('Content-Type', 'application/json');
					res.send(JSON.stringify(results));
				} else {
					res.send([]);
				}
			});

			req.mysql.end()
		})

		app.post('/line-data/search', function(req, res) {
			req.mysql.connect();

			var search = req.body.search;

			var conditions = [];
			var params = [];
			if (search.substring) {
				conditions.push('text LIKE ?');
			}

			req.mysql.selectLineData(...parseSearchToQuery(req.body.search), function(err, results, fields) {
				if (err) {
					console.log(err);
					res.send({ok: false});
					return;
				}

				if (results) {
					res.send({ok: true, lines: results});
				} else {
					res.send({ok: true, lines:[]});
				}
			})

			req.mysql.end();
		})



		app.get('/lines/simple-search', function(req, res) {
			req.mysql.connect();

			req.mysql.selectLineData(...parseSearchToQuery(req.query), function(err, results, fields) {
				if (err) { console.log(err) }
				if (results) {
					res.set('Content-Type', 'text/plain');
					res.send(results.map(row => [row.text, row.line_num, row.filename].join(" % ")).join("\n"));
				} else {
					res.send([]);
				}
			});

			req.mysql.end()
		})

		app.post('/search', function(req, res) {
			req.mysql.connect();

			var search = req.body.search;

			var query = 'SELECT trans.value AS text FROM line_annos as trans LEFT JOIN `lines` AS trans_line ON trans_line.id = trans.line_id WHERE ';
			var conditions = ['trans.type_id = 1'];
			var params = [];
			if (search.lineIndices.length > 0) {
				conditions.push('trans_line.index_num IN (?)');
				params.push(search.lineIndices);
			}
			search.searchTextList.forEach(term => {
				conditions.push('trans.value LIKE ?');
				params.push(`%${term}%`);
			});

			query += conditions.join(" AND ");
			query += ";";
			
			console.log(query);

			req.mysql.query(query, params, function(err, results, fields) {
				if (err) { console.log(err) }
				if (results) {
					res.send(results.map(row => ({line_text: row.text})));
				} else {
					res.send([]);
				}
			});
			req.mysql.end();
			//res.send(JSON.stringify(JSON.parse(req.body)))
		});
	},
}
