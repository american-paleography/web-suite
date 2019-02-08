$(function() {
	var DRAGGABLE_DEFAULT_CANCEL = "input,textarea,button,select,option"
	$('.draggable').draggable({cancel: DRAGGABLE_DEFAULT_CANCEL + "," + '.nodrag'});
	setTimeout(function() {
		var left = 5;
		var top = 5;
		$('.draggable').each((i, el) => {
			$(el).offset({left, top});
			left += $(el).outerWidth() + 5;
			console.log(left);
		})
	}, 2000);
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


})
