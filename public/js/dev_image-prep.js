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

			loadLineImage(path, line, canvas, function() {
				setTimeout(function() {
					render_debug_info_for_line(canvas[0]);
				}, 200);
			});


			var link = $('<a>');
			link.attr('href', path);
			link.text(path);
			payload.append(link);


			payload.append($('<hr>'));
			holder.append(payload);
		})
	})
})
