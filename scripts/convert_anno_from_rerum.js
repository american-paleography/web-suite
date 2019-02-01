var mongo = require('mongodb')
var mysql = require('mysql');
var mysqlUtilities = require('mysql-utilities');
mongo.MongoClient.connect('mongodb://localhost:27017', function(err, client) {
	if (err) { throw err; }
	var rerum = client.db('annotationStore');

	var us = client.db('concordancePlus');

	var sql_conn = mysql.createConnection({
		host: "localhost",
		user: "root",
		database: "concordance_plus",
	});
	//mysqlUtilities.upgrade(sql_conn);
	sql_conn.connect();

	sql_conn.upsert = function(table, obj, callback) {
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
	
	sql_conn.query('SELECT id FROM projects', function(err, results) {
		var project_ids = results.map(r => r.id);

		rerum.collection('annotation').find({"@type": "sc:AnnotationList"}).toArray().then(function(docs) {
			
			docs.forEach((doc,i) => {
				var proj = parseInt(doc.proj);
				var file_name = doc.on.split('/').pop();

				if (file_name == 'paleography.org') {
					console.log('Skipping file with blank name');
				} else if (!project_ids.includes(proj)) {
					console.log('Skipping project #' + proj);
				} else {
					console.log(`Parsing file #${i}: /${doc.on.split('/').pop()}`);
					loadIntoMysql(doc, sql_conn);
				}
			})
		}).then(function() {
			client.close();
			sql_conn.end();
		})
	})
})

function parseId(id) {
	return id.split('/').pop();
}

function loadIntoMysql(doc, sql_conn) {
	var file_id = parseId(doc['@id']);
	var proj = parseInt(doc.proj);
	var file_name = doc.on.split('/').pop();

	sql_conn.upsert('files', {id_ext: file_id, project:proj, name: file_name}, function(error, results, fields) { if (error) { console.log(error) } });
	doc.resources.forEach((res, line_num) => {
		if (!res['@id']) { return; }
		var line_id = parseId(res['@id']);
		var xywh = res.on.match(/#xywh=(.*)/)[1];
		var coords = xywh.split(',').map(x => parseInt(x)).map(x => isNaN(x) ? null : x);
		var line_obj = {
			id_ext: line_id,
			file_id: {toSqlString: () => `(SELECT id FROM files WHERE files.id_ext = "${file_id.replace(/\W/g, '')}")`},
			index_num: line_num,
			x: coords[0],
			y: coords[1],
			w: coords[2],
			h: coords[3],
		};

		sql_conn.upsert('`lines`', line_obj, function(error, results, fields) { if (error) {console.log(error)}});

		var anno_obj = {
			line_id: {toSqlString: () => `(SELECT id FROM \`lines\` WHERE lines.id_ext = "${line_id.replace(/\W/g, '')}")`},
			type_id: 1,
			value:res.resource['cnt:chars'],
		}
		if (!anno_obj.value) { return; }
		sql_conn.upsert('line_annos', anno_obj, function (error, results, fields) { if(error) { console.log(error)}});
	});

}

function loadIntoMongo(doc, us) {
	var file_id = parseId(doc['@id']);
	var proj = doc.proj;
	us.collection('files').update({file_id:file_id},
		{
			file_id: file_id,
			proj:doc.proj,
			filename: doc.on.split('/').pop(),
			rerumCreationTime: doc.addedTime,
		},
		{upsert:true}
	);

	doc.resources.forEach(res => {
		if (!res['@id']) { return; }
		var line_id = parseId(res['@id']);
		var xywh = res.on.match(/#xywh=(.*)/)[1];
		var coords = xywh.split(',').map(x => parseInt(x));
		us.collection('lines').update({line_id:line_id},
			{
				line_id,
				file_id,
				proj, // denormalized
				x: coords[0],
				y: coords[1],
				w: coords[2],
				h: coords[3],
				xywh,
			},
			{upsert:true}
		);
		us.collection('annotations').update({line_id:line_id, anno_type:"transcription"},
			{
				line_id,
				file_id, // denormalized
				proj, // denormalized
				anno_type:"transcription",
				text:res.resource['cnt:chars'],
			},
			{upsert:true},
		);
	});
}
