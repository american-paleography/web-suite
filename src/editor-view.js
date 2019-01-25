const assert = require('assert').strict;
var fs = require('fs');

class PolygonList {
	constructor(path, description, where) {
		this.path = path;
		this.description = description;
		this.sql = "SELECT id FROM cut_polygons WHERE " + where + " ORDER BY id ASC";
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
	},
}
