'use strict';

$(function() {
	$('.select-page').hide();

	$('.select-project').on('change', function() {
		var proj = this.value;
		$('.select-page[data-project!=' + proj + ']').hide();
		$('.select-page[data-project=' + proj + ']').show();
	})

	var current_line = 0;
	var li_lines = [];

	$('.select-page').on('change', function() {
		var page_id = this.value;

		var src = $(this).find(":selected").data('file-path')
		//$('#main-image').attr('src', src);

		$.get('/ajax/image-slicing/data/' + page_id, function(data) {
			current_line = 0;
			li_lines = [];

			var sidebar = $('ul#line-list');
			sidebar.empty();
			data.lines.forEach(line => {
				var entry = $('<li>');
				entry.text(line.text);
				entry.data('index', li_lines.length);
				li_lines.push({el: entry, data: line, path: src});
				sidebar.append(entry);
			})

			selectCurrentLine();
		})
	})

	$(document).on('keydown', function(evt) {
		const UP = 38;
		const DOWN = 40;
		const LEFT = 37;
		const RIGHT = 39;
	})

	$('#words-output').on('click', 'button.accept', function() {
		var img = $(this).closest('tr').find('img')[0];
		var word = $(this).closest('tr').find('input[type=text]').val();
		var word_index = $(this).closest('tr').find('input.word_index').val();
		var line_id = $(this).closest('tr').find('input.line_id').val();
		var payload = {
			x: img.dataset.left,
			y: img.dataset.top,
			width: img.width,
			height: img.height,
			image_data_b64: img.src,
			word: word,
			word_index: word_index,
			line_id: line_id,
		}
		$.post('/ajax/image-slicing/approve', payload, function(data) {
			alert(JSON.stringify(data));
		})
	});

	$('#line-list').on('click', 'li', function() {
		var i = $(this).data('index');
		current_line = i;
		selectCurrentLine();
	})

	const domContainer = document.querySelector('#words-output');
	window.react_el = ReactDOM.render(e(WordsInLineWidget), domContainer); 

	function selectCurrentLine() {
		var line = li_lines[current_line]
		var tmp = $("<canvas>")[0];

		$('.selected-line').removeClass('selected-line');
		$(line.el).addClass('selected-line');

		react_el.setState({});

		//$(domContainer).empty();

		loadLineImage(line.path, line.data, $(tmp), function(left, top) {
			console.log("split line into word images");
			react_el.setState(function() {
				return {
					offset: {x: left, y: top},
					text: line.data.text,
					source: tmp,
					line_id: line.data.line_id,
				};
			});
		})
	}
})

const e = React.createElement;

class SimpleTextInput extends React.Component {
	constructor(props) {
		super(props);
		this.state = { value: this.props.value };
	}

	render() {
		return (
			<input type="text" value={this.state.value} onChange={e => this.setState({value: e.target.value})} />
		)
	}
}

class WordsInLineWidget extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		console.log(this.state);
		if (!this.state.source) {
			return (
				<table class="image-grid"></table>
			);
		}

		var words = this.state.text.split(/\s+/);

		var rows = words.map((word,i) => (
			<tr class="trans-word">
				<td>
					<button class="accept">Accept</button>

				</td>
				<td class={"word-holder-" + i}>
					<input type="hidden" class="word_index" value={i} />
					<input type="hidden" class="line_id" value={this.state.line_id} />
					<SimpleTextInput value={word} />
					<hr/>
					<img class="word-image" />
				</td>
				<td>
					<button class="reject" disabled="disabled">Reject</button>
				</td>
			</tr>
		))

		var sourceCanvas = this.state.source;

		setTimeout(() => {
			var splitter = new LineSplitter(sourceCanvas);
			var items = splitter.map_to_words(words);
			console.log(items);
			items.forEach((data, i) => {
				var copyTo = $('.word-holder-'+i+' img')[0];
				copyTo.dataset.left = data.chunk.x + this.state.offset.x;
				copyTo.dataset.top = data.chunk.y + this.state.offset.y;
				copyTo.src = data.chunk.canvas.toDataURL();
			})
		}, 200);

		return (
			<table class="image-grid">
				{rows}
			</table>
		)
	}
}
