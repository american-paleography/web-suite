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
})
