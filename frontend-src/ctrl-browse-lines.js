'use strict';

window.onerror = alert;
$(function() {
	const domContainer = document.querySelector('#concordance-output');
	$(domContainer).empty();
	ReactDOM.render(e(ConcordanceSet, {lines: []}), domContainer);

	$('#do-search').on('click', function() {
		searchLines('#search-fields', function(data) {
			ReactDOM.render(e(ConcordanceSet, {lines: data.lines}), domContainer);
		});
	})
})


const e = React.createElement;

