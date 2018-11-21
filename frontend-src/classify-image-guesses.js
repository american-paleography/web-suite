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

		loadLineImage(line.path, line.data, $(tmp), function() {
			console.log("split line into word images");
			react_el.setState(function() { return {text: line.data.text, source: tmp} });
		})
	}
})

const e = React.createElement;

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
					<input type="text" value={word}></input>
					<hr/>
					<img class="word-image" />
				</td>
				<td>
					<button class="reject">Reject</button>
				</td>
			</tr>
		))

		var sourceCanvas = this.state.source;

		setTimeout(function() {
			var splitter = new LineSplitter(sourceCanvas);
			var items = splitter.map_to_words(words);
			console.log(items);
			items.forEach((data, i) => {
				var copyTo = $('.word-holder-'+i+' img')[0];
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
