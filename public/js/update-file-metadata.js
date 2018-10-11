$(function() {
	var metadata_types = {};
	$.get('/metadata-types', function(data) {
		metadata_types = data;
		$.get('/file-list', function(data) {
			var sel = $('#file-chooser');
			data.files.forEach(file => {
				var opt = $('<option>');
				opt.val(file.id);
				opt.text(`(proj ${file.project}): ${file.name}`);
				sel.append(opt);
			})
		})
	});

	$('#file-chooser').on('change', function() {
		var file_id = parseInt(this.value);

		$('#loading').show();
		var ul = $('#field_list');
		ul.empty();

		$.get('/view-file/' + file_id, function(data) {
			var present = {};
			data.file_extra.forEach(meta => {
				present[meta.type_name] = meta.value;
			});
			metadata_types.file_level.forEach(type => {
				var li = $('<li>');
				var label = $('<label>');
				label.text(type.name);
				li.append(label);
				var input = $('<input>');
				if (present[type.name]) {
					input.val(present[type.name]);
				}
				input.data('payload', {type: 'file', foreign_key: file_id, type_id: type.id});
				li.append(input);

				ul.append(li);
			});

			$('#loading').hide();
		});
	});

	$('#field_list').on('change', 'li input', function() {
		var payload = $(this).data('payload');

		payload.value = this.value;

		$.post('/update-metadata-content', payload);
	})
})
