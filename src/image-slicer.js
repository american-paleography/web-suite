var {Canvas, Image} = require('canvas');
var fs = require('fs');

var imagestore = '/imagestore/main';

function slice_polygon(id, path, callback) {
	console.log(id);
	var mysql = require('./db_util.js').createConnection();

	mysql.connect();

	mysql.query('SELECT po.points, f.name as filename, pr.name as projname FROM  cut_polygons po LEFT JOIN files f ON f.id = po.file_id LEFT JOIN projects pr ON pr.id = f.project WHERE po.id = ?', [id], function(err, results) {
		if (err) {
			console.log(err);
		} else {
			console.log("got polygon");
		}

		var {points, filename, projname} = results[0];
		points = JSON.parse(points);

		var source_path = `${imagestore}/${projname}/${filename}`;

		var img = new Image();

		img.onload = function() {
			console.log("Image loaded");
			var source = { canvas: new Canvas(img.width, img.height) };
			source.ctx = source.canvas.getContext('2d');

			source.ctx.drawImage(img, 0, 0);

			var buffer = { canvas: new Canvas() };
			buffer.ctx = buffer.canvas.getContext('2d');

			var output = { canvas: new Canvas() };
			output.ctx = output.canvas.getContext('2d');

			cutPolygon(points, source, buffer, output);
			
			fs.writeFile(path, output.canvas.toBuffer(), function(err) {
				if (err) {
					console.log(err);
				}
				callback();
			})
		}

		img.src = source_path;
		console.log(img.src);
	})

	mysql.end();
}


function cutPolygon(points, source, buffer, output) {
	var rect = getBoundingBox(points);

	if (rect[2] == 0 || rect[3] == 0) {
		return false;
	}

	buffer.canvas.width = source.canvas.width;
	buffer.canvas.height = source.canvas.height;

	buffer.ctx = buffer.canvas.getContext('2d');
	buffer.ctx.globalCompositeOperation = 'source-over';

	buffer.ctx.putImageData(source.ctx.getImageData(...rect), rect[0], rect[1]);

	buffer.ctx.globalCompositeOperation = 'destination-in';
	buffer.ctx.beginPath();
	buffer.ctx.moveTo(...points[points.length-1]);
	points.forEach(point => {
		buffer.ctx.lineTo(...point);
	})

	buffer.ctx.fill();

	var clipped = buffer.ctx.getImageData(...rect);

	output.canvas.width = clipped.width;
	output.canvas.height = clipped.height;

	output.ctx.putImageData(clipped, 0, 0);

	return true;
}

function getBoundingBox(points) {
	var x = points.map(a => a[0]).sort((a,b) => a-b); // um, why is the default sort string-y?
	var y = points.map(a => a[1]).sort((a,b) => a-b);
	console.log(points, x, y);
	var left = x[0];
	var top = y[0];
	
	var width = x[x.length-1] - left;
	var height = y[y.length-1] - top;

	return [left, top, width, height];
}


ImageSlicer = {
	slice_polygon,
}

module.exports = ImageSlicer;
