'use strict';

$(function() {
	$.get('/dev/images/get-data', function(data) {
		const domContainer = document.querySelector('#concordance-output');
		$(domContainer).empty();
		ReactDOM.render(e(ConcordanceSet, {lines: data}), domContainer);
	});
})


const e = React.createElement;

