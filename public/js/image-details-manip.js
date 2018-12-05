$(function() {
	$('#init-cutter').on('click', function() {
		setupPolygonCutter('#cutter', '#source');
	});

	$('#do-subimage-cut').on('click', function() {
		setupPolygonCutter('#cutter', '#output-canvas');
	})
})
