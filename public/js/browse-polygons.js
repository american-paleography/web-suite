$(function() {
	window.onerror = alert;
	$("#page-selector").on('change', function() {
		$('#polygon-output').empty();
		const file_id = this.value;
		$.get('/ajax/info-for-file/' + file_id, function(data) {
			$('#project-out').text(data.project_name);
			$('#file-out').text(data.file_name);


			var img = new Image();
			img.crossOrigin = 'Anonymous';
			img.onload = function() {
				var source = { canvas: $('<canvas>')[0] };
				source.ctx = source.canvas.getContext('2d');

				source.canvas.width = img.width;
				source.canvas.height = img.height;
				source.ctx.drawImage(img, 0, 0);

				var buffer = { canvas: $('<canvas>')[0] };
				buffer.ctx = buffer.canvas.getContext('2d');

				var polyOut = $('#polygon-output');

				$.get('/ajax/polygons-for-file/' + file_id, function(data) {
					data.polygons.forEach(poly => {
						var output = {
							canvas: $('<canvas>')[0],
						}
						output.ctx = output.canvas.getContext('2d');
						cutPolygon(poly.points, source, buffer, output);
						polyOut.append(output.canvas);
					});
				})
			}
			img.src = data.href;
		});
	})




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
})
