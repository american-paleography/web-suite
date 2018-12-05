'use strict';

$(function() {
	const domContainer = document.querySelector('#concordance-output');
	$(domContainer).empty();
	window.react_concordance_el = ReactDOM.render(e(ConcordanceSet, {lines: []}), domContainer);
})


const e = React.createElement;

