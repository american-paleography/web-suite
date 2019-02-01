$(function() {
	$(document).on('keyup', 'textarea', handleTypedWord)
	$(document).on('focus', 'textarea', handleTypedWord)

	var lastWord;

	function handleTypedWord(evt) {
		var str = $(this).val();

		var word = str.split(/\s/).pop();
		word = word.replace(/[^\w'&i<>-]/g, '').replace(/<[^>]*>/g, '')

		lastWord = word;

		$.get('http://webtools.americanpaleography.org/ajax/search-polygons/by-initial-substring/' + encodeURIComponent(word), function(data) {
			// abort if we have multiple requests in-flight
			if (lastWord != word) {
				return;
			}

			var output = $('#polygonOutput');
			output.empty();

			data.polygons.forEach(polygon => {
				var img = $('<img>');
				img.attr('src', 'http://webtools.americanpaleography.org/poly-images/' + polygon.id);
				img.css('max-width', $('#polygonOutput').css('width'));
				output.append(img);
			})
		})
	}
})
