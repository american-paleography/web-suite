$(function() {
	$('.page-selector').on('click', function() {
		activatePage($(this).data('index'))
	})

	function activatePage(index) {
		$('.page-selector,.toggle').removeClass('active').addClass('inactive');
		$('[data-index=' + index + ']').addClass('active').removeClass('inactive');
	}

	activatePage(0);
})
