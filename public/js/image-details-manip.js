$(function() {
	var image_path = $('#source').attr("src").match(/\/([^\/]*\/[^\/]*)$/)[1];
	var FILE_ID = -1;
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
		var polyGetter = setupPolygonCutter('#cutter', '#source');
		$('#save-polygon').data('getterthing', polyGetter);
	});

	$('#do-subimage-cut').on('click', function() {
		setupPolygonCutter('#cutter', '#output-canvas');
	})

	$('#save-polygon').on('click', function() {
		var data = $(this).data('getterthing')();
		data.file_id = FILE_ID;
		$.post('/ajax/save-cut-polygon', data, function(res) {
			if (res.ok) {
				alert("Saved polygon for page " + FILE_ID);
			} else {
				alert("Failed to save polygon!");
			}
		})
	})
})
