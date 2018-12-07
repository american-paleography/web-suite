'use strict';

$(function () {
	$.get('/dev/images/get-data', function (data) {
		var domContainer = document.querySelector('#concordance-output');
		$(domContainer).empty();
		ReactDOM.render(e(ConcordanceSet, { lines: data }), domContainer);
	});
});

var e = React.createElement;