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
		}
	})

		//app.post('/ajax/save-cut-polygon', function(req, res) {
		//app.get('/ajax/page-id-for/:proj_name/:page_name', function(req, res) {
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

	function savePolygon() {
		var data = $('#save-polygon').data('getterthing')();
		data.file_id = FILE_ID;
		$.post('/ajax/save-cut-polygon', data, function(res) {
			if (res.ok) {
				alert("Saved polygon for page " + FILE_ID);
			} else {
				alert("Failed to save polygon!");
			}
		})
	}
})
