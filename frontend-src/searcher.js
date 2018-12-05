function searchLines(formSelector, callback) {
	var params = {
		text: $(formSelector).find('[name=line-text]').val(),
	}

	$.post('/line-data/search', {search: params}, callback);
}
