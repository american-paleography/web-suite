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

app.listen(43746, () => console.log("Listening on port 43746"));
