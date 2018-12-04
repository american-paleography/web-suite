const assert = require('assert');

var express = require('express');
var app = express();

var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);


var bodyParser = require('body-parser');

var fs = require('fs');

var mysql = require('mysql');

var CREDS = {
	mysql: JSON.parse(fs.readFileSync('conf/mysql.creds')),
	session: JSON.parse(fs.readFileSync('conf/session.creds')),
}

var SECRETS = {
	session: fs.readFileSync('conf/session.secret').toString().replace(/\s+/),
}

var sessionStore = new MySQLStore(CREDS.session);
app.use(session({
	key: 'concordance_plus_session',
	secret: SECRETS.session,
	store: sessionStore,
	resave: false,
	saveUninitialized: false,
}));

app.set('view engine', 'pug');

app.use(bodyParser());

app.use(express.static("public"));

app.use(function(req, res, next) {
	req.mysql = mysql.createConnection(CREDS.mysql);
	req.mysql.upsert = function(table, obj, callback) {
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
	next();
});

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/index', function(req, res) {
	res.render('index');
});

app.get('/update-file-metadata', function(req, res) {
	res.render('update-file-metadata');
})

app.get('/file-overview', function(req, res) {
	res.render('file-overview');
})

app.get('/line-count', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT COUNT(0) AS count FROM `lines`;', function(error, results, fields) {
		res.send(JSON.stringify(results[0].count, null, '  '));
	});

	req.mysql.end();
})

app.post('/error-debug', function(req, res) {
	var mongo = require('mongodb')
	mongo.MongoClient.connect('mongodb://localhost:27017', function(err, client) {
		var db = client.db('concordancePlus');
		console.log(JSON.stringify(req.body));
		console.log(Object.keys(req.body));
		db.collection('error_log').insertOne(req.body);

		res.send("ok");
	});
})

app.get('/dev/images/get-data', function(req, res) {
	req.mysql.connect();

	var query = 'SELECT x, y, w, h, trans.value AS text, trans_line.index_num AS line_num, file.name AS filename, proj.name AS proj_name FROM line_annos as trans LEFT JOIN `lines` AS trans_line ON trans_line.id = trans.line_id LEFT JOIN files AS file ON trans_line.file_id = file.id LEFT JOIN projects AS proj ON proj.id = file.project WHERE file.project = 5914 LIMIT 50;';
	
	req.mysql.query(query, [], function(err, results, fields) {
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

app.get('/dev-ui/images', function(req, res) {
	res.render('dev-ui_images');
});

app.get('/concordance', function(req, res) {
	res.render('concordance');
});

app.get('/image-slicing/classify-guesses', function(req, res) {
	req.mysql.connect();
	var locals = {};

	req.mysql.query("SELECT * FROM projects", function(err, results, fields) {
		locals.projects = results;
	})

	req.mysql.query("SELECT * FROM files", function(err, results, fields) {
		locals.files = results;
	})

	req.mysql.end(function() {
		res.render('image-slicing_classify-guesses', locals);
	})
})
app.get('/ajax/image-slicing/data/:file_id', function(req, res) {
	req.mysql.connect();

	var output = {};

	var file_id = req.params.file_id;

	req.mysql.query("SELECT x, y, w, h, `line`.id as line_id, `line`.index_num as line_num, trans.value as text FROM `lines` as `line` LEFT JOIN line_annos as trans ON trans.line_id = `line`.id WHERE `line`.file_id = ? AND trans.type_id = 1", [file_id], function(err, results, fields) {
		if (err) { console.log(err) }
		output.lines = results;
	});

	req.mysql.end(function() {
		res.set('Content-Type', 'application/json');
		res.send(JSON.stringify(output));
	})
})
app.post('/ajax/image-slicing/approve', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT is_admin FROM users WHERE id = ?', [req.session.user_id], function(err, results, fields) {
		try {
			assert.ok(results[0]);
			assert.equal(results[0].is_admin, true);
		} catch(e) {
			req.mysql.destroy();
		}
	})

	var path_component = encodeURIComponent([req.body.line_id, req.body.word_index, req.body.word].join("_")) + ".png";
	var path_base = "public/word_images/";

	var fields = {
		x: req.body.x,
		y: req.body.y,
		width: req.body.width,
		height: req.body.height,
		filepath: path_component,
		word: req.body.word,
		word_index_in_list: req.body.word_index,
		line_id: req.body.line_id,
	};
	var field_keys = Object.keys(fields);
	var insert_query = `INSERT INTO word_images (${field_keys.join(", ")}) VALUES (${field_keys.map(_ => "?").join(", ")})`;
	req.mysql.query(
		insert_query,
		field_keys.map(key => fields[key]),
		function (err, results, fields) {
			if (err) {
				console.log(err);
				res.send({ok:false});
				return;
			}
			var b64 = req.body.image_data_b64;
			b64 = b64.substr(b64.indexOf(','));
			var buffer = Buffer.from(b64, 'base64');
			fs.writeFile(path_base + path_component, buffer);
			res.send({ok:true});
		}
	)

	req.mysql.end();
});

app.get('/all-word-images', function(req, res) {
	req.mysql.connect();
	var locals = {};

	var path_base = "/word_images/";

	req.mysql.query("SELECT word AS text, filepath FROM word_images", function(err, results, fields) {
		results.forEach(r => r.src = path_base + r.filepath);
		locals.word_entries = results;
	})

	req.mysql.end(function() {
		res.render('all-word-images', locals);
	})
})

app.get('/lines/simple-search', function(req, res) {
	req.mysql.connect();

	var query = 'SELECT trans.value AS text, trans_line.index_num AS line_num, file.name AS filename, proj.name AS proj_name FROM line_annos as trans LEFT JOIN `lines` AS trans_line ON trans_line.id = trans.line_id LEFT JOIN files AS file ON trans_line.file_id = file.id LEFT JOIN projects AS proj ON proj.id = file.project WHERE ';
	var conditions = ['trans.type_id = 1'];
	var params = [];
	if (req.query.text) {
		req.query.text.split(",").forEach(term => {
			conditions.push('trans.value LIKE ?');
			params.push(`%${term}%`);
		});
	}
	if (req.query.short_tag) {
		req.query.short_tag.split(",").forEach(term => {
			conditions.push('trans.value LIKE ?');
			params.push(`%<${term}>%`);
		});
	}

	query += conditions.join(" AND ");
	query += ";";
	
	req.mysql.query(query, params, function(err, results, fields) {
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

app.get('/metadata-types', function(req, res) {
	req.mysql.connect();
	
	var payload = {types: ['line', 'file']};

	req.mysql.query('SELECT id, name FROM line_anno_types;', function(err, results, fields){
		payload.line_level = results;
	})
	req.mysql.query('SELECT id, name FROM file_meta_types;', function(err, results, fields){
		payload.file_level = results;
	})

	req.mysql.end(function(err) {
		res.send(payload);
	});
})

app.get('/file-list', function(req, res) {
	req.mysql.connect();
	
	var payload = {};

	req.mysql.query('SELECT id, name, project FROM files;', function(err, results, fields){
		payload.files = results;
	})

	req.mysql.end(function(err) {
		res.send(payload);
	});
});

app.post('/create-metadata-type', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT is_admin FROM users WHERE id = ?', [req.session.user_id], function(err, results, fields) {
		assert.ok(results[0]);
		assert.equal(results[0].is_admin, true);
	})

	var tableMap = {
		line: 'line_anno_types',
		file: 'file_meta_types',
	}
	var table = tableMap[req.body.type];
	req.mysql.query(`INSERT INTO ${table} (name) VALUES (?)`, [req.body.name], function(err, results, fields) {
		
	})

	req.mysql.end();
	res.send({});
})


app.get('/manage-inline-metadata', function(req, res) {
	res.render('manage-inline-metadata');
})
app.get('/inline-metadata-defs', function(req, res) {
	req.mysql.connect();
	
	var payload = {};

	req.mysql.query('SELECT name, short_name, self_closing FROM inline_metadata_defs;', function(err, results, fields){
		payload.inline_metadata_defs = results;
	})

	req.mysql.end(function(err) {
		res.send(payload);
	});
})

app.post('/create-inline-metadata-def', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT is_admin FROM users WHERE id = ?', [req.session.user_id], function(err, results, fields) {
		try {
			assert.ok(results[0]);
			assert.equal(results[0].is_admin, true);
		} catch(e) {
			req.mysql.destroy();
		}
	})

	req.mysql.query(
		'INSERT INTO inline_metadata_defs (name, short_name, self_closing) VALUES (?, ?, ?)', 
		[req.body.name, req.body.short_name, req.body.self_closing],
		function (err, results, fields) {
			if (err) {
				console.log(err);
			}
		}
	)

	req.mysql.end();
	res.send({ok:true});
})




app.get('/view-file/:file_id', function(req, res) {
	req.mysql.connect();

	var file_id = req.params.file_id;

	var data = {};

	req.mysql.query('SELECT id, name, project FROM files WHERE id = ?', [file_id], function(err, result) {
		data.file_main = result[0];
	})

	req.mysql.query('SELECT fm.file_id as file_id, fm.type_id as type_id, fm.value as value, t.name as type_name FROM file_metas as fm LEFT JOIN file_meta_types as t ON t.id = fm.type_id WHERE fm.file_id = ?', [file_id], function(err, result) {
		data.file_extra = result;
	});

	req.mysql.query('SELECT la.line_id as line_id, l.file_id as file_id, l.index_num as line_num, la.type_id as type_id, la.value as value, t.name as type_name FROM line_annos as la LEFT JOIN line_anno_types as t ON t.id = la.type_id LEFT JOIN `lines` as l ON l.id = la.line_id WHERE l.file_id = ?', [file_id], function(err, result) {
		data.lines = result;
	});

	req.mysql.end(function(err) {
		res.send(data);
	});
})

app.post('/update-metadata-content', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT is_admin FROM users WHERE id = ?', [req.session.user_id], function(err, results, fields) {
		assert.ok(results[0]);
		assert.equal(results[0].is_admin, true);
	})

	var tableMap = {
		line: 'line_annos',
		file: 'file_metas',
	}
	var table = tableMap[req.body.type];

	assert.ok(table); // avoids SQL injection if we interpolate `type` directly
	var fk_name = req.body.type + '_id';

	var type_id = req.body.type_id;
	var value = req.body.value;
	var fk = req.body.foreign_key;
	// value is NOT an int (should be a string), so 0 won't come up (and "0" is truthy)
	if (!value) {
		req.mysql.query(`DELETE FROM ${table} WHERE ${fk_name} = ? AND type_id = ?`, [fk, type_id], function(err, results) {
			// do nothing, for now
		});
	} else {
		req.mysql.upsert(table, {
			type_id,
			value,
			[fk_name]: fk,
		}, function(err, results) {
			// do nothing for now
		})
	}

	req.mysql.end();
})

require('./src/auth.js').use(app);

require('./src/image-browsing.js').use(app)

app.listen(43746, () => console.log("Listening on port 43746"));
