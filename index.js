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

app.listen(43746, () => console.log("Listening on port 43746"));
