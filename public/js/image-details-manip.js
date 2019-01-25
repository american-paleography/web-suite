$(function() {
	var alreadyCutWords = {};

	const puncStripRegex = /[^\w'&i<>-]/g;

	var DRAGGABLE_DEFAULT_CANCEL = "input,textarea,button,select,option"
	$('.draggable').draggable({cancel: DRAGGABLE_DEFAULT_CANCEL + "," + '.nodrag'})
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

	$(document).on('selectionchange', function(evt) {
		var selection = getSelection();
		try {
			if (selection.anchorNode && selection.anchorNode.parentNode.id != 'freetext') {
				return;
			}

			if (selection.rangeCount == 0) {
				return;
			}

			var range = selection.getRangeAt(0);
			var start = range.startOffset;
			var end = range.endOffset;
		} catch(e) {
			// TODO log errors so that I can fix them
			// (but any errors are, probably, non-fatal)

			return;
		}

		if (start === undefined || end === undefined) {
			return;
		}

		var obj = $('#freetext').data('props');
		obj.start = start;
		obj.end = end;

		updateTextReadout();
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

	// LOAD ORDER:
	// 1. page ID
	// 2. polygon data (it gets referenced in line-data and in cutter canvas)
	// 3. ajax for line data, and init cutter
	$('#source').on('load', function() {
		$.get('/ajax/page-id-for/' + image_path, function(data) {
			if (data.ok) {
				$('button').attr('disabled', null);

				$('#cutter').show();
				$('#file_id_readout').text('File ID: ' + data.id);
				FILE_ID = data.id;

				$.get('/ajax/polygons-for-file/' + FILE_ID, function(data) {
					precuts = data.polygons;

					precuts.forEach(poly => {
						if (poly.text) {
							alreadyCutWords[poly.text.toLowerCase().replace(puncStripRegex, '')] = true;
						}
					})

					$.get('/ajax/lines-for-file/' + FILE_ID, function(data) {
						useLines(data.lines);
					});
					initCutter();
				})
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
		} else if (mode == 'single-word') {
			var sel = $('[name=word]:checked');
			ret.text = sel.data('text');
			if ($('[name=strip-punctuation').is(':checked')) {
				ret.text = ret.text.replace(puncStripRegex, '');
			}

			// uhhh... should I update these for punctuation omission...? hrm.
			ret.start = sel.data('start');
			ret.end = sel.data('end');
			if (inc) {
				nextWord();
			}
		} else if (word = 'freetext') {
			ret = $('#freetext').data('props');
			ret.text = $('#freetext').text().substring(ret.start, ret.end);
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
		data.transcription = getCurrentText(false); // I originally had this incrementing the word/line, but that caused issues when canceling a save
		data.transcription.line_id = active_line.line_id;

		data.notes = $('[name=notes]').val();

		$.post('/ajax/save-cut-polygon', data, function(res) {
			if (res.ok) {
				var text = "Saved polygon for page " + FILE_ID + ", and text \"" + data.transcription.text + "\""
				// this does introduce an assumption that id != 0
				if (res.id) {
					var keep = confirm(text + "\n\nKeep saved polygon?");
					if (keep) {
						initCutter();
						getCurrentText(true); // okay, let's increment HERE
						$('[name=notes]').val('');
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
						getCurrentText(true); // and I guess also increment here?
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

		var cont = $('#tools');
		if (line_sel.width() > cont.width()) {
			cont.width(line_sel.width());
		}
		
		updateCurrentLine();
		showHideWordArea();
	}

	$('.mode-sel').on('change', showHideWordArea);
	function showHideWordArea() {
		var mode = $('[name=mode]:checked').val();

		if (mode == 'single-word') {
			$('#word-mode').show();
		} else {
			$('#word-mode').hide();
		}

		if (mode == 'freetext') {
			$('#freetext-mode').show();
		} else {
			$('#freetext-mode').hide();
		}
	}

	$('#text-selector-area').on('change', '', updateTextReadout);

	function updateTextReadout() {
		var text = getCurrentText().text;
		$('#current-text').text(text);

		var wi = $('#same-word-images');
		wi.empty();

		// only skip the word images if we're taking a full line (freetext substrings might be common phrases)
		var mode = $('[name=mode]:checked').val();
		if (mode == "line") {
			wi.text('not applicable');
		} else {
			wi.text('loading...');
			var word = text.replace(/<[^>]*>/g, '');
			// TODO make this not linked to a single exhibit
			$.get('/winterthur/ajax/polygons-for/' + word, function(data) {
				wi.empty();
				wi.text(`"${word}":`);
				var holder = $('<div class="imagebox">');
				wi.append(holder);
				data.polygons.forEach(poly => {
					var img = $('<img>');
					img.attr('src', '/poly-images/' + poly.id);
					holder.append(img);
				})
			});
		}
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
			if (alreadyCutWords[word.toLowerCase().replace(puncStripRegex, '')]) {
				label.addClass('already-cut');
			}
			label.text(word);
			var cell = $('<td>');
			cell.append(opt);
			cell.append($('<br>'));
			cell.append(label);
			into.append(cell);

			first = false;
		}

		$('#freetext').text(active_line.text);
		$('#freetext').data('props', {start: 0, end: 0});
		
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
