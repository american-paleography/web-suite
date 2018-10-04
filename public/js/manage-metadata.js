$(function() {
	$.get('/metadata-types', function(data) {
		var output = $('#output');
		var select = $('#type_selector')
		data.types.forEach(type => {
			var p = $('<p>');
			var h = $('<h4>');
			h.text(type);
			p.append(h);

			var ul = $('<ul class="type-list">');
			ul.attr('id', `output_${type}`);

			p.append(ul);
			output.append(p)

			data[`${type}_level`].forEach(item => {
				addLineItem(type, item);
			});

			var opt = $('<option>');
			opt.val(type);
			opt.text(type);
			select.append(opt);
		})
	});

	function addLineItem(type, item) {
		var search = `#output_${type}`
		var ul = $(search);

		var id = item.id; // ignore this for now

		var name = item.name;

		var li = $('<li>');
		li.text(name);
		ul.append(li);
	}
})

function createType() {
	var type = $('#type_selector').val();
	var name = $('#field_name').val();

	$.post('/create-metadata-type', {type, name});
}
