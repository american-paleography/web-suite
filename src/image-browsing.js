const assert = require('assert').strict;
var fs = require('fs');

module.exports = {
	use: function(app) {
		app.get('/page-batches/list', function(req, res) {
			req.mysql.connect();

			req.mysql.query('SELECT name FROM projects ORDER BY id DESC;', function(err, results, fields) {
				res.render('page-batches/list', { projects: results });
			});

			req.mysql.end();
		})

		app.get('/page-batches/:proj_name/files', function(req, res) {
			var proj = req.params.proj_name;
			var path = process.env.HOME + "/paleo-glue/public/" + proj;
			fs.readdir(path, function(err, results) {
				var filenames = results.filter(f => f.match(/\.jpe?g$/i));
				res.render('page-batches/files', { files: filenames, proj, }) 
			})
		})

		app.get('/page-batches/:proj/details/:page', function(req, res) {
			var { proj, page } = req.params;

			req.mysql.connect();

			var locals = { proj, page };

			req.mysql.end(function() {
				res.render('page-batches/details', locals);
			});
		})
	},
}
