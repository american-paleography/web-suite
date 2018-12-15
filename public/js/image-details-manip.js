$(function() {
	var image_path = $('#source').attr("src").match(/\/([^\/]*\/[^\/]*)$/)[1];
	var FILE_ID = -1;

	$(document).on('keydown', handleHotkeys);

	function handleHotkeys(e) {
		if (e.ctrlKey) {
			var hotkeys = {
				s: savePolygon,
				i: initCutter,
				z: undoSegment,
				n: nextWord,
				m: nextWord,
				ArrowLeft: nudgeLeft,
				ArrowRight: nudgeRight,
				ArrowUp: nudgeUp,
				ArrowDown: nudgeDown,
			}

			if (e.key in hotkeys) {
				hotkeys[e.key]();
				e.preventDefault();
			}
		}
	}

	function nudgeLeft() {
		nudge(-1);
	}
	function nudgeRight() {
		nudge(1);
	}

	function nudgeDown() {
		vNudge(1);
	}
	function nudgeUp() {
		vNudge(-1);
	}

	function nudge(amount) {
		var el = $('.embed-pane');
		var w = $(window).width();
		var newVal = el.scrollLeft() + (w * amount / 4)
		el.scrollLeft(newVal);
	}

	function vNudge(amount) {
		var el = $('.embed-pane');
		var h = $(window).height();
		var newVal = el.scrollTop() + (h * amount / 4)
		el.scrollTop(newVal);
	}

	$.get('/ajax/page-id-for/' + image_path, function(data) {
		if (data.ok) {
			$('#cutter').show();
			$('#file_id_readout').text('file ID: ' + data.id);
			FILE_ID = data.id;

			$.get('/ajax/lines-for-file/' + data.id, function(data) {
				useLines(data.lines);
			});
		}
	})

	$('#source').on('load', function() {
		$('button').attr('disabled', null);
	})
	
	$('#init-cutter').on('click', function() {
		initCutter();
	});

	$('#do-subimage-cut').on('click', function() {
		setupPolygonCutter('#cutter', '#output-canvas');
	})

	$('#save-polygon').on('click', function() {
		savePolygon();
	})


	function initCutter() {
		var {getter, undo} = setupPolygonCutter('#cutter', '#source');
		$('#save-polygon').data('getterthing', getter);
		$('#undo-segment').data('func', undo);
	}

	function undoSegment() {
		var func = $('#undo-segment').data('func');
		func();
	}

	var valid_lines;
	var active_line;

	function savePolygon() {
		var data = $('#save-polygon').data('getterthing')();
		data.file_id = FILE_ID;
		data.transcription = {
			line_id: active_line.line_id,
		}
		var mode = $('[name=mode]:checked').val();
		if (mode == 'line') {
			data.transcription.text = active_line.text;
			data.transcription.start = 0;
			data.transcription.end = active_line.text.length;
			nextLine();
		} else {
			var sel = $('[name=word]:checked');
			data.transcription.text = sel.data('text');
			data.transcription.start = sel.data('start');
			data.transcription.end = sel.data('end');
			nextWord();
		}

		$.post('/ajax/save-cut-polygon', data, function(res) {
			if (res.ok) {
				alert("Saved polygon for page " + FILE_ID + ", and text \"" + data.transcription.text + "\"");
			} else {
				alert("Failed to save polygon!");
			}
		})
	}


	function useLines(lines) {
		valid_lines = lines;
		var line_sel = $('#line-selector');
		line_sel.empty();

		valid_lines.forEach((line,i) => {
			var opt = $('<option>');
			opt.attr('value', i);
			opt.text(`[${line.line_num + 1}]: ${line.text}`);
			line_sel.append(opt);
		});
		
		updateCurrentLine();
	}

	$('#line-selector').on('change', updateCurrentLine);

	function updateCurrentLine() {
		var id = $('#line-selector').val();

		active_line = valid_lines[id];

		var into = $('#word-selector-area');
		into.empty();
		var regex = /\S+/g;
		var match;
		var first = true;
		while (match = regex.exec(active_line.text)) {
			var start = match.index
			var word = match[0];
			var end = start + word.length;

			var opt = $('<input name="word" type="radio">');
			if (first) {
				opt.attr('checked', 'checked');
			}

			opt.data('text', word);
			opt.data('start', start);
			opt.data('end', end);

			var label = $('<label>');
			label.text(word);
			var cell = $('<td>');
			cell.append(opt);
			cell.append($('<br>'));
			cell.append(label);
			into.append(cell);

			first = false;
		}
	}

	function nextWord() {
		var next = $('[name=word]:checked').parent().next().find('[name=word]')
		if (next.length > 0) {
			next.prop('checked', true);
		} else {
			nextLine();
		}
	}

	function nextLine() {
		$('#line-selector option:selected').next().prop('selected', true)
		updateCurrentLine()
	}
})
