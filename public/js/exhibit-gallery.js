$(function() {
	const ajax_path = $('[name=ajax-path]').val();
	$('#letters > .navbubble').on('click', function() {
		var out = $('#gallery-output');
		out.empty();
		$.get('/winterthur/ajax/polygon-list/' + ajax_path + '?begins_with=' + $(this).data('letter'), function(data) {
			out[0].innerHTML = makeGallery({polygons: data.polygons, base_path: "http://webtools.americanpaleography.org/poly-images/"});
		})
	})
})
