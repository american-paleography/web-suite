var fs = require('fs');

var Airtable = require('airtable');
var base = new Airtable({apiKey: fs.readFileSync('conf/airtable_key.secret').toString().replace(/\n/, '')}).base('appLItEQIfF1Z8lEU');

var table_defs = JSON.parse(fs.readFileSync('conf/airtable-tables.json').toString());

function iterateAllRecords(table, callback) {
	return base.table(table).select({}).eachPage(function(records, fetchNextPage) {
		records.forEach(callback);
		fetchNextPage();
	});
}

function processData(table, callback) {
	return iterateAllRecords(table, function(record) {
		callback(record._rawJson);
	})
}

function exportTable(table, callback) {
	var records = [];
	processData(table, function(json) { records.push(json); }).then(function() { callback(records) });
}

module.exports = {
	base,
	tables: table_defs,
	processData,
	exportTable,
}
