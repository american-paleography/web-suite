const assert = require('assert').strict;
var fs = require('fs');

class PolygonList {
	constructor(path, description, where) {
		this.path = path;
		this.description = description;
		this.sql = "SELECT id, text, file_id FROM cut_polygons WHERE " + where + " ORDER BY id ASC";
	}
}

module.exports = {
	use: function(app) {
		var express = require('express');
		var router = new express.Router();

		var polygon_lists = [
			new PolygonList('/notes-internal', 'internal-only notes', "notes_internal IS NOT NULL AND notes_internal != '' AND (notes_public IS NULL OR notes_public = '')"),
			new PolygonList('/no-notes', 'no notes', "(notes_internal IS NULL OR notes_internal = '') AND (notes_public IS NULL OR notes_public = '')"),
			new PolygonList('/all', 'all polygons', "1 = 1"),
		]

		app.use('/editor', router);

		router.get('/index', function(req, res) {
			res.render("editor-index", {
				polygon_lists,
			});
		})


		polygon_lists.forEach(list => {
			router.get('/polygon-list' + list.path, function(req, res) {
				req.mysql.promQuery(list.sql)
				.then(polygons => res.render('polygon-list', {polygons, desc: list.description}))
				.then(_ => req.mysql.end())
			})
		})

		router.get('/transcription-progress/:domain', function(req, res) {
			req.mysql.connect();

			var tmp = {}
			req.mysql.promQuery('select id from domains where name = ?', [req.params.domain])
			.then(r => tmp.domain = r[0].id)
			.then(_ => {
				return req.mysql.promQuery("SELECT l.id AS line_id, f.name AS filename, l.index_num AS line_num, p.name AS projname FROM `lines` l LEFT JOIN files f ON f.id = l.file_id LEFT JOIN projects p ON p.id = f.project LEFT JOIN line_annos a ON a.type_id = 1 AND a.line_id = l.id WHERE p.domain_id = ? AND (a.value IS NULL OR a.value = '')", [tmp.domain])
			}).then(data => {
				res.locals.empty_lines = data
			})
			.then(_ => res.render('transcription-progress'))
			.then(_ => req.mysql.end())
		})
	},
}
