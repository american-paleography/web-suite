$.postJson = function(url, data, success) {
	if (typeof data != 'string') {
		data = JSON.stringify(data);
	}

	return $.ajax({
		type: "POST",
		url,
		data,
		success,
		dataType:"json",
		contentType:"application/json",
	})
}
