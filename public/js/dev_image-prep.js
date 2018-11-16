$(function() {
	window.onerror = alert;
	$.get('/dev/images/get-data', function(data) {
		holder = $('#output');
		data.forEach(line => {
			var payload = $('<p>');

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
					var chunks = render_debug_info_for_line(canvas[0]);
					var words = line.text.split(/\s+/);

					// VERY naive attempt at matching images to words
					if (chunks.length > words.length) {
						// naive approach: discard the narrowest images, since they're probably a mistaken crop
						var widths = chunks.map(c => c.canvas.width).sort((a,b) => a-b);
						var excess = chunks.length - words.length;
						var trimThreshold = widths[excess];
						chunks = chunks.filter(c => c.canvas.width >= trimThreshold);
					}
					
					var guessHolder = $('<ul>');
					for (var i = 0; i < words.length; ++i) {
						var guess = $('<li>');
						guess.text(words[i]);
						if (chunks[i]) {
							var newImg = $('<img>');
							var oldCanvas = chunks[i].canvas;
							guess.text(words[i] + `(${chunks[i].canvas.width})`);
							newImg.attr('src', oldCanvas.toDataURL());
							guess.append(newImg);
						}
						guessHolder.append(guess);
					}
					payload.append(guessHolder);
					if (trimThreshold) {
						var tmp = $('<span>');
						tmp.text([widths[0], trimThreshold, widths[widths.length-1]].join(', '));
						payload.append(tmp);
					}
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
