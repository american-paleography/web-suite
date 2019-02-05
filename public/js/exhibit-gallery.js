$(function() {
	$('#letters > .letter').on('click', function() {
		var out = $('#gallery-output');
		out.empty();
		$.get('/winterthur/ajax/polygon-list/single-word?begins_with=' + $(this).data('letter'), function(data) {
			out[0].innerHTML = makeGallery({polygons: data.polygons, base_path: "http://webtools.americanpaleography.org/poly-images/"});
		})
	})
})
