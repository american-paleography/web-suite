'use strict';

$(function() {
	$.get('/dev/images/get-data', function(data) {
	});
})


const e = React.createElement;

$(function() {
	window.onerror = alert;
	$.get('ajax/lexicon', function(data) {
		var images = {
		}

		const domContainer = document.querySelector('#wordlist');
		$(domContainer).empty();

		ReactDOM.render(e(Lexicon, {words: data.words}), domContainer);

		return;

		data.forEach(word => {
			var li = $('<li>');
			var path = [word.line.projname, word.line.filename].join('/');

			if (!images[path]) {
				var tmp = new Image();
				tmp.crossOrigin = 'Anonymous';
				tmp.src = 'http://image-store.tpen-demo.americanpaleography.org/' + path;
				tmp.callbacks = [];
				tmp.onload = function() {
					var source = { canvas: $('<canvas>')[0] };
					source.ctx = source.canvas.getContext('2d');

					source.canvas.width = tmp.width;
					source.canvas.height = tmp.height;
					source.ctx.drawImage(tmp, 0, 0);

					var buffer = { canvas: $('<canvas>')[0] };
					buffer.ctx = buffer.canvas.getContext('2d');

					tmp.callbacks.forEach(cb => cb(source, buffer));
				}

				images[path] = tmp;
			}

			var text = [word.text, word.line.text, path].join(' : ');

			images[path].callbacks.push(function(source, buffer) {
				var canvas = $('<canvas>');

				var output = {canvas: canvas[0]};
				output.ctx = output.canvas.getContext('2d');

				cutPolygon(word.poly.points, source, buffer, output);

				li.append(canvas);
			})

			li.text(text);
			ul.append(li);
		})
	})

	function cutPolygon(points, source, buffer, output) {
		var rect = getBoundingBox(points);

		if (rect[2] == 0 || rect[3] == 0) {
			return false;
		}

		buffer.canvas.width = source.canvas.width;
		buffer.canvas.height = source.canvas.height;

		buffer.ctx = buffer.canvas.getContext('2d');
		buffer.ctx.globalCompositeOperation = 'source-over';

		buffer.ctx.putImageData(source.ctx.getImageData(...rect), rect[0], rect[1]);

		buffer.ctx.globalCompositeOperation = 'destination-in';
		buffer.ctx.beginPath();
		buffer.ctx.moveTo(...points[points.length-1]);
		points.forEach(point => {
			buffer.ctx.lineTo(...point);
		})

		buffer.ctx.fill();

		var clipped = buffer.ctx.getImageData(...rect);

		output.canvas.width = clipped.width;
		output.canvas.height = clipped.height;

		output.ctx.putImageData(clipped, 0, 0);

		return true;
	}

	function getBoundingBox(points) {
		var x = points.map(a => a[0]).sort((a,b) => a-b); // um, why is the default sort string-y?
		var y = points.map(a => a[1]).sort((a,b) => a-b);
		console.log(points, x, y);
		var left = x[0];
		var top = y[0];
		
		var width = x[x.length-1] - left;
		var height = y[y.length-1] - top;

		return [left, top, width, height];
	}
})

class Lexicon extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};

		this.processWords(this.props.words);
	}

	processWords(words) {
		var batches = {};

		var letters = [];
		for (var i = 0; i < 26; ++i) {
			letters.push(String.fromCharCode('a'.charCodeAt(0) + i));
		}
		words.forEach(word => {
			var char = word.text[0];
			var group = 'Symbols';
			if (letters.includes(char)) {
				group = `Letter '${char}'`;
			} else if (char.match(/[1-90]/)) {
				group = 'Numbers';
			}

			if (!batches[group]) {
				batches[group] = [];
			}
			batches[group].push(word);
		})

		this.state = { batches };
	}

	render() {
		var groups = Object.keys(this.state.batches).sort();
		groups = groups.map(groupName => {
			var words = this.state.batches[groupName];
			return (
				<AlphabetGroup folder={groupName} words={words} />
			)
		})
		return (
			<ul>
				{groups}
			</ul>
		)
	}
}

class AlphabetGroup extends React.Component {
	constructor(props) {
		super(props);

		this.state = { expand: false, };
	}

	render() {
		var showHide = this.state.expand ? '' : 'hidden';
		var words = this.props.words;
		return (
			<li>
				<span class="" onClick={e => this.setState({expand: !this.state.expand})}>
					{this.props.folder} ({words.length} entries)
				</span>
				<WordList class={showHide} words={words} />
			</li>
		)
	}
}

class WordList extends React.Component {
	constructor(props) {
		super(props);

		this.state = { words: this.props.words, };
	}

	render() {
		var items = this.state.words.map(word => {
			return (
				<li class="lexical-entry">
					<span class="headword">{word.text}</span>
					<span class="meta-info">{word.poly_count} polygons</span>
					<span class="meta-info">{word.full_count} occurrences</span>
				</li>
			)
		})
		return (
			<ul class={this.props.class}>
				{items}
			</ul>
		)
	}
}
