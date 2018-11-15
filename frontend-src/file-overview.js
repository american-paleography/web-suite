'use strict';

$(function() {
	$.get('/file-list', function(data) {
		var sel = $('#file-chooser');
		data.files.forEach(file => {
			var opt = $('<option>');
			opt.val(file.id);
			opt.text(`(proj ${file.project}): ${file.name}`);
			sel.append(opt);
		})
	})

	$('#file-chooser').on('change', function() {
		var file_id = parseInt(this.value);
		
		$.get('/view-file/' + file_id, function(data) {
			$('#debug').text(JSON.stringify(data, null, '  '));

			const domContainer = document.querySelector('#transcription');
			$(domContainer).empty();
			ReactDOM.render(e(TranscriptionOutput, {data: data}), domContainer);
		});
	});
})


const e = React.createElement;

class TranscriptionOutput extends React.Component {
	constructor(props) {
		super(props);
		this.lines = this.props.data.lines.filter(x => x.type_name == 'transcription')
	}

	render() {
		const items = this.lines.map(line => 
			<li>{line.value}</li>
		);
		return (
			<ul>
				{items}
			</ul>
		);
	}
}

