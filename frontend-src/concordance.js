'use strict';

$(function() {
	$.get('/dev/images/get-data', function(data) {
		const domContainer = document.querySelector('#concordance-output');
		$(domContainer).empty();
		ReactDOM.render(e(ConcordanceSet, {lines: data}), domContainer);
	});
})


const e = React.createElement;

class ConcordanceSet extends React.Component {
	render() {
		const items = this.props.lines.map(line => 
			<ConcordanceLine line={line}></ConcordanceLine>
		);
		return (
			<ul>
				{items}
			</ul>
		)
	}
}

class ConcordanceLine extends React.Component {
	render() {
		const line = this.props.line;
		return (
			<li>
				<span>{line.text}</span>
				<LineSource line={line} />
			</li>
		);
	}
}

class LineSource extends React.Component {
	render() {
		const line = this.props.line;
		return (
			<span class="source-line-indicator">[ line #{line.line_num+1} of page <PageLink name={line.filename} dir={line.proj_name} /> ]</span>
		);
	}
}

class PageLink extends React.Component {
	render() {
		return <a href={`http://image-store.tpen-demo.americanpaleography.org/${this.props.dir}/${this.props.name}`}>{this.props.name}</a>
	}
}
