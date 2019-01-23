var dbUtils = require('../src/db_util.js');

var mysql = dbUtils.createConnection();

var q = 'SELECT p.id, p.text, p.trans_start, p.trans_end, a.value as full_text FROM cut_polygons p INNER JOIN line_annos a ON p.line_id = a.line_id WHERE a.type_id = 1';

Promise.all([
mysql.promQuery(q).then(results => {
	var bad = 
		results
		.map(r => [r.id, r.text, r.text.toUpperCase(), r.full_text.substring(r.trans_start, r.trans_end).toUpperCase(), r.full_text])
		.filter(r => r[2] != r[3])
		.filter(r => r[3].replace(/[^\w'&i<>-]/g, '') != r[2])
	;

	console.log(bad);
	console.log(bad.length);
})
]).then(_ => mysql.end())
