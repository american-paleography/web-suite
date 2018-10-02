var express = require('express');
var app = express();

var bodyParser = require('body-parser');

var fs = require('fs');

var mysql = require('mysql');

var CREDS = {
	mysql: JSON.parse(fs.readFileSync('conf/mysql.creds')),
}


app.use(bodyParser());

app.use(express.static("public"));

app.use(function(req, res, next) {
	req.mysql = mysql.createConnection(CREDS.mysql);
	next();
});

app.get('/line-count', function(req, res) {
	req.mysql.connect();

	req.mysql.query('SELECT COUNT(0) AS count FROM `lines`;', function(error, results, fields) {
		res.send(JSON.stringify(results[0].count, null, '  '));
	});

	req.mysql.end();
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

app.listen(43746, () => console.log("Listening on port 43746"));
