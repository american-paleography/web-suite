$(function() {
	$('.draggable').draggable()
	var lastScrollPos = { top: 0, left: 0};
	$(document).on('scroll', function() {
		var tpos = document.body.scrollTop;
		var lpos = document.body.scrollLeft;

		var tdiff = tpos - lastScrollPos.top;
		var ldiff = lpos - lastScrollPos.left;

		$('.draggable').each((i, el) => {
			var toolbox = $(el);
			var offset = toolbox.offset();
			offset.top += tdiff;
			offset.left += ldiff;
			toolbox.offset(offset);
		})


		lastScrollPos = {top: tpos, left: lpos};
	})

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
				',': function() {
					$('#cutter').data('inc-scale')(-0.1);
				},
				'.': function() {
					$('#cutter').data('inc-scale')(+0.1);
				},
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

	$('#source').on('load', function() {
		$.get('/ajax/page-id-for/' + image_path, function(data) {
			if (data.ok) {
				$('button').attr('disabled', null);

				$('#cutter').show();
				$('#file_id_readout').text('file ID: ' + data.id);
				FILE_ID = data.id;

				$.get('/ajax/lines-for-file/' + data.id, function(data) {
					useLines(data.lines);
				});
				initCutter();
			} else {
				alert("Couldn't get page metadata");
			}
		})
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


	var precuts;

	function initCutter() {
		// I... should probably restructure so that there's less encapsulation. That .data(...) thing is awkward, and is the reason why I'm creating an anonymous directly-evaluated function *solely* to have a throwaway variable.
		var scale = (function() {
			var get = $('#cutter').data('get-scale');
			if (get) {
				return get();
			} else {
				return 1;
			}
		})();

		var {getter, undo, setPrecuts, incScale, getScale} = setupPolygonCutter('#cutter', '#source', scale);
		$('#save-polygon').data('getterthing', getter);
		$('#undo-segment').data('func', undo);
		$('#cutter').data('inc-scale', incScale);
		$('#cutter').data('get-scale', getScale);

		if (precuts) {
			setPrecuts(precuts);
		} else {
			$.get('/ajax/polygons-for-file/' + FILE_ID, function(data) {
				precuts = data.polygons;
				setPrecuts(precuts);
			})
		}
	}

	function undoSegment() {
		var func = $('#undo-segment').data('func');
		func();
	}

	var valid_lines;
	var active_line;

	function getCurrentText(inc=false) {
		var mode = $('[name=mode]:checked').val();
		var ret = {};
		if (mode == 'line') {
			ret.text = active_line.text;
			ret.start = 0;
			ret.end = active_line.text.length;
			if (inc) {
				nextLine();
			}
		} else {
			var sel = $('[name=word]:checked');
			ret.text = sel.data('text');
			ret.start = sel.data('start');
			ret.end = sel.data('end');
			if (inc) {
				nextWord();
			}
		}

		return ret;
	}

	function savePolygon() {
		var data = $('#save-polygon').data('getterthing')();

		if (data.points.length <= 2) {
			alert("Need at least 3 points before a polygon can be saved");
			return;
		}

		data.file_id = FILE_ID;
		data.transcription = getCurrentText(true);
		data.transcription.line_id = active_line.line_id;

		$.post('/ajax/save-cut-polygon', data, function(res) {
			if (res.ok) {
				var text = "Saved polygon for page " + FILE_ID + ", and text \"" + data.transcription.text + "\""
				// this does introduce an assumption that id != 0
				if (res.id) {
					var keep = confirm(text + "\n\nKeep saved polygon?");
					if (keep) {
						initCutter();
					} else {
						$.post('/ajax/delete-polygon/' + res.id, function(res) {
							if (res.ok) {
								alert("Deleted polygon");
							} else {
								alert("Couldn't delete polygon");
							}
						});
					}
				} else {
					alert(text + "\n\nHowever, couldn't find ID for new polygon.");
					initCutter();
				}
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

	$('#text-selector-area').on('change', '', updateTextReadout);

	function updateTextReadout() {
		$('#current-text').text(getCurrentText().text);
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
		
		updateTextReadout();
	}

	function nextWord() {
		var next = $('[name=word]:checked').parent().next().find('[name=word]')
		if (next.length > 0) {
			next.prop('checked', true);
		} else {
			nextLine();
		}
		updateTextReadout();
	}

	function nextLine() {
		$('#line-selector option:selected').next().prop('selected', true)
		updateCurrentLine()
	}
})
