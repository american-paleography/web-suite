$(function() {
	const ajax_path = $('[name=ajax-path]').val();
	const out = $('#gallery-output');

	$('#letters > .navbubble').on('click', function() {
		$('.navbubble.active').removeClass('active');
		$(this).addClass('active');
		out.empty();
		$.get('/winterthur/ajax/polygon-list/' + ajax_path + '?begins_with=' + $(this).data('letter'), function(data) {
			out[0].innerHTML = makeGallery({polygons: data.polygons, base_path: "http://webtools.americanpaleography.org/poly-images/"});
		})
	})

	$('.navbubble[data-letter=a]').click();
})

function lazyLoad(el) {
	const out = $('#gallery-output');
	$(el).removeClass('loading');
	$(el).addClass('loaded');
	var count = $('.loading').length
	var add = 10 - count;

	var onload = $(el).attr('onload');

	if (add > 0) {
		$('.waiting').each((i, el) => {
			$(el).attr('onload', onload)
			if (i >= add) {
				return;
			}

			$(el).removeClass('waiting');
			$(el).addClass('loading');
			el.src = $(el).data('path');
		})
	}
}
