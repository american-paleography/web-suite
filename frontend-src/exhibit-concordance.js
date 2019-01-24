'use strict';

const e = React.createElement;

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

$(function() {
	window.onerror = alert;
	$.get('ajax/lexicon', function(data) {
		var images = {
		}

		const domContainer = document.querySelector('#wordlist');
		$(domContainer).empty();

		ReactDOM.render(e(Lexicon, {words: data.words}), domContainer);

		return;
	})

	window.IS_EDITOR = !!parseInt($('[name=edit_privs]').val());
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

		this.state = { words: this.props.words, showImage: false };
	}

	render() {
		var items = this.state.words.map(word => {
			return (
				<WordEntry word={word} />
			)
		})
		return (
			<ul class={this.props.class}>
				{items}
			</ul>
		)
	}
}

class WordEntry extends React.Component {
	constructor(props) {
		super(props);

		this.state = { word: this.props.word, showImage: false };
	}

	render() {
		var word = this.state.word;
		var image = this.state.showImage ? (
			<WordImageList show={this.state.showImage} text={word.text} />
		) : '';
		return (
			<li class="lexical-entry">
				<span onClick={e => this.setState({word: this.props.word, showImage: !this.state.showImage})}>
					<span class="headword">{word.text}</span>
					<span class="meta-info">{word.poly_count} polygons</span>
					<span class="meta-info">{word.full_count} occurrences</span>
				</span>
				{image}
			</li>
		)
	}
}

class WordImageList extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			loaded: false,
			polygons: null,
		}
	}

	componentDidMount() {
		var comp = this;
		$.get('ajax/polygons-for/' + this.props.text, data => {
			comp.setState({
				loaded: true,
				polygons: data.polygons,
			})

			return;
		})
	}

	render() {
		return this.props.show ?
			(
				!this.state.loaded ?
					(
						<div>
							loading polygon definitions...
						</div>
					)
				:
					this.renderImageList()
			)
		:
			''
		;
	}

	renderImageList() {
		var {polygons} = this.state;

		var images = polygons.map(p => {
			return (
				<AnnotatedWordImage polygon={p} />
			)
		})

		var header = AnnotatedWordImage.headerRow()

		return (
			<table class="bordered">
				{header}
				{images}
			</table>
		)
	}
}

class AnnotatedWordImage extends React.Component {
	static headerRow() {
		return (
			<tr>
				{['Image', 'Year', 'Author Name', 'Author Gender', 'Location'].map(label => (
					<th>{label}</th>
				))}
			</tr>
		)
	}

	render() {
		var poly = this.props.polygon;
		var src = `/poly-images/${poly.id}`
		
		var img = IS_EDITOR ? (
			<a href={"/polygon/"+poly.id}>
				<img src={src} />
			</a>
		) : (
			<img src={src} />
		)

		return (
			<tr>
				<td>
					{img}
				</td>
				<td>
					{poly.year}
				</td>
				<td>
					{poly.author_name}
				</td>
				<td>
					{poly.author_gender}
				</td>
				<td>
					{poly.location}
				</td>
			</tr>
		)
	}
}

class WordImage extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			
		}
	}

	componentDidMount() {
		const {canvas, img} = this.refs;
		const points = this.props.points;

		const ctx = canvas.getContext('2d');

		img.onload = function() {
			var source = { canvas: $('<canvas>')[0] };
			source.ctx = source.canvas.getContext('2d');

			source.canvas.width = img.width;
			source.canvas.height = img.height;
			source.ctx.drawImage(img, 0, 0);

			var buffer = { canvas: $('<canvas>')[0] };
			buffer.ctx = buffer.canvas.getContext('2d');

			var output = {
				canvas: canvas,
				ctx: ctx,
			}

			cutPolygon(points, source, buffer, output);
		}
	}

	render() {
		var path = this.props.path;
		var src = 'http://image-store.tpen-demo.americanpaleography.org/' + path;
		return (
			<div>
				<canvas ref="canvas" />
				<img ref="img" src={src} crossOrigin="Anonymous" class="hidden" />
			</div>
		)
	}
}
