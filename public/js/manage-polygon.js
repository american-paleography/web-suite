$(function() {
	const FILE_ID = $('[name=file_id]').val();

	$('#delete-polygon').on('click', function() {
		var poly_id = $('[name=poly_id]').val();
		var confirmed = confirm(`Really delete polygon ${poly_id}?`);

		if (confirmed) {
			$.post('/ajax/delete-polygon/' + poly_id, function(res) {
				if (res.ok) {
					alert("Deleted polygon");
				} else {
					alert("FAILURE: Couldn't delete polygon");
				}
			});
		}
	})

	$('#update-notes').on('click', function() {
		var poly_id = $('[name=poly_id]').val();

		var notes = {
			internal: $('[name=notes_internal]').val(),
			public: $('[name=notes_public]').val(),
		}

		$.postJson('/ajax/polygon/' + poly_id + '/update-notes', {notes}, function(res) {
			if (res.ok) {
				alert("Updated notes");
			} else {
				alert("FAILURE: Couldn't update notes");
			}
		});
	})

	$('#update-text').on('click', function() {
		var data = {};
		data.poly_id = $('[name=poly_id]').val();
		data.transcription = getCurrentText(false);
		data.transcription.line_id = active_line.line_id;

		$.postJson('/ajax/update-polygon-text', data, function(res) {
			if (res.ok) {
				alert("Updated transcribed text linkage");
			} else {
				alert("FAILURE: Couldn't update transcribed text linkage");
			}
		})
	})

	$.get('/ajax/lines-for-file/' + FILE_ID, function(data) {
		useLines(data.lines);
	});
})
