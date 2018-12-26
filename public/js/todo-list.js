$(function() {
	$('.resolve').on('click', function() {
		$.post('/internal/resolve-todo/' + $(this).data('id'));
	})
})
