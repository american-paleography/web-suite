$(function() {
	window.onerror = alert;
	$.get('/dev/images/get-data', function(data) {
		holder = $('#output');
		alert("running");
		data.forEach(line => {
			payload = $('<p>');

			for (var prop of ['text']) {
				var obj = $('<span>');
				obj.text(line[prop]);
				payload.append(obj);
				payload.append($('<br>'));
			}

			var canvas = $('<canvas>');
			payload.append(canvas);

			var path = 'http://image-store.tpen-demo.americanpaleography.org/' + line.proj_name + '/' + line.filename;

			loadLineImage(path, line, canvas);


			var link = $('<a>');
			link.attr('href', path);
			link.text(path);
			payload.append(link);


			payload.append($('<hr>'));
			holder.append(payload);
		})
	})
})

function loadLineImage(path, {x,y,w,h},  canvas, callback=null) {
		var vert_scale = parseFloat($('[name=line-height]').val() || 1)
		var horiz_scale = parseFloat($('[name=line-width]').val() || 1)
		y -= (vert_scale - 1)/2 * h;
		h *= vert_scale
		x -= (horiz_scale - 1)/2 * w;
		w *= horiz_scale;
		var scale = 4.5; // is this correct for all images...?
		var img = new Image();
		img.onload = function() {
			canvas.attr('width', w);
			canvas.attr('height', h);
			var ctx = canvas[0].getContext('2d');
			ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, w, h);
			if (callback) {
				callback();
			}
		};
		img.src = path;
}
