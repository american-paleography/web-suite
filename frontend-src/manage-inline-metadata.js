'use strict';

$(function() {
	$.get('/inline-metadata-defs', function(data) {
		const domContainer = document.querySelector('#existing_defs');
		$(domContainer).empty();
		ReactDOM.render(e(InlineAnnoTable, {defs: data.inline_metadata_defs}), domContainer)
		$('#loading').hide();
	})


	// because I don't recall a way to embed booleans into HTML forms directly
	function parseBool(val) {
		if (val == 'yes') {
			return 1;
		} else if (val == 'no') {
			return 0;
		} else {
			var err = `Form error - tried to pass a value "${val}" as a boolean`;
			alert(err);
			throw new Error(err);
		}
	}

	$('#create-def').on('click', function() {
		var name = $('[name=name]').val();
		var short_name = $('[name=short_name]').val();
		var self_closing = parseBool($('[name=self_closing]').val());

		$.post('/create-inline-metadata-def', {name, short_name, self_closing});
	})
})


const e = React.createElement;

class InlineAnnoTable extends React.Component {
	render() {
		const rows = this.props.defs.map(def => 
			<tr>
				<td>{def.name}</td>
				<td>{def.short_name}</td>
				<td>{def.self_closing ? "single point" : "range"}</td>
			</tr>
		);
		return (
			<table class="tabular">
				<tr>
					<th>Name</th>
					<th>Short Form</th>
					<th>spans a...</th>
				</tr>
				{rows}
			</table>
		);
	}
}

