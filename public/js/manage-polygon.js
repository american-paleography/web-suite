$(function() {
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

		$.post('/ajax/polygon/' + poly_id + '/update-notes', {notes}, function(res) {
			if (res.ok) {
				alert("Updated notes");
			} else {
				alert("FAILURE: Couldn't update notes");
			}
		});
	})
})
