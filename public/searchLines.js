function searchLines(lines) {
	$('#search-output').empty();

	var lineTmp = $('#search-line-index').val().split(',').filter(x => x);
	var lineIndices = [];
	lineTmp.forEach(val => {
		if (val.includes('-')) {
			var [lower, upper] = val.split('-').map(x => parseInt(x));
			for (var i = lower; i <= upper; ++i) {
				lineIndices.push(i);
			}
		} else {
			lineIndices.push(parseInt(val));
		}
	});
	var searchTextList = Array.from($('.search-text').map(function() { return $(this).val().toLowerCase(); })).filter(x => x);
	
	var overall_container = $('#search-output');

	var subset = lines.filter(line => {
		if (lineIndices.length > 0 && !lineIndices.includes(line.line_index_in_file)) {
			return false;
		}

		// cannot use a forEach() callback, since to return
		var text = line.line_text.toLowerCase();
		for (var searchText of searchTextList) {
			if (!text.includes(searchText)) {
				return false;
			}
		}

		return true;
	});
	subset.forEach(l => {
		var para = $('<p>');
		overall_container.append(para);
		renderLine(l, para)
	});

	


	function renderLine(line, container) {
		var path = "/imageResize?folioNum=" + line.folio_index + "&height=2000";
		var aabb = line.aabb;
		var [x, y, w, h] = aabb.split(',').map(x => parseInt(x));
		var vert_scale = parseFloat($('[name=line-height]').val() || 1)
		y -= (vert_scale - 1)/2 * h;
		h *= vert_scale
		var scale = 2; // is this correct for all images...?
		var img = new Image();
		img.onload = function() {
			var canvas = $('<canvas>');
			canvas.attr('width', w);
			canvas.attr('height', h);
			var ctx = canvas[0].getContext('2d');
			ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, w, h);
			container.prepend(canvas);
		};
		img.src = path;

		var span = $('<span>');
		span.text(line.line_text);
		container.append(span);
	}
}

$(function() {
	$('#add-search-text').on('click', function() {
		$(this).parent().append('<input type="text" class="search-text">');
	});
})
