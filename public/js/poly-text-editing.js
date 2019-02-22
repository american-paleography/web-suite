const puncStripRegex = /[^\w'&i<>-]/g;

var valid_lines;
var active_line;

var alreadyCutWords = {};


function getCurrentText(inc=false) {
	var mode = $('[name=mode]:checked').val();
	var ret = {};
	if (mode == 'line') {
		ret.text = active_line.text;
		ret.start = 0;
		ret.end = active_line.text.length;
		if (inc) {
			nextLine();
		}
	} else if (mode == 'single-word') {
		var sel = $('[name=word]:checked');
		ret.text = sel.data('text');
		if ($('[name=strip-punctuation').is(':checked')) {
			ret.text = ret.text.replace(puncStripRegex, '');
		}

		// uhhh... should I update these for punctuation omission...? hrm.
		ret.start = sel.data('start');
		ret.end = sel.data('end');
		if (inc) {
			nextWord();
		}
	} else if (word = 'freetext') {
		ret = $('#freetext').data('props');
		ret.text = $('#freetext').text().substring(ret.start, ret.end);
	}

	[
		'is_abbrev',
		'is_letter_seq',
	].forEach(name => {
		ret[name] = $('[name=' + name + ']').is(':checked')
	})

	return ret;
}

function useLines(lines) {
	valid_lines = lines;
	var line_sel = $('#line-selector');
	line_sel.empty();
	var preselect_line = $('[name=preselected_line]').val()

	valid_lines.forEach((line,i) => {
		var opt = $('<option>');
		opt.attr('value', i);
		opt.text(`[${line.line_num + 1}]: ${line.text}`);
		if (preselect_line == line.line_num + 1) {
			opt.attr('selected', 'selected');
		}
		line_sel.append(opt);
	});

	var cont = $('#tools');
	if (line_sel.width() > cont.width()) {
		cont.width(line_sel.width());
	}
	
	updateCurrentLine();
	showHideWordArea();
}

function showHideWordArea() {
	var mode = $('[name=mode]:checked').val();

	if (mode == 'single-word') {
		$('#word-mode').show();
	} else {
		$('#word-mode').hide();
	}

	if (mode == 'freetext') {
		$('#freetext-mode').show();
	} else {
		$('#freetext-mode').hide();
	}
}

function updateTextReadout() {
	var text = getCurrentText().text;
	$('#current-text').text(text);

	var wi = $('#same-word-images');
	wi.empty();

	// only skip the word images if we're taking a full line (freetext substrings might be common phrases)
	var mode = $('[name=mode]:checked').val();
	if (mode == "line") {
		wi.text('not applicable');
	} else {
		wi.text('loading...');
		var word = text.replace(/<[^>]*>/g, '');
		// TODO make this not linked to a single exhibit
		$.get('/winterthur/ajax/polygons-for/' + word, function(data) {
			wi.empty();
			wi.text(`"${word}":`);
			var holder = $('<div class="imagebox">');
			wi.append(holder);
			data.polygons.forEach(poly => {
				var img = $('<img>');
				img.attr('src', '/poly-images/' + poly.id);
				holder.append(img);
			})
		});
	}
}

function updateCurrentLine() {
	var id = $('#line-selector').val();

	active_line = valid_lines[id];

	var into = $('#word-selector-area');
	into.empty();
	var regex = /\S+/g;
	var match;
	var first = true;
	while (match = regex.exec(active_line.text)) {
		var start = match.index
		var word = match[0];
		var end = start + word.length;

		var opt = $('<input name="word" type="radio">');
		if (first) {
			opt.attr('checked', 'checked');
		}

		opt.data('text', word);
		opt.data('start', start);
		opt.data('end', end);

		var label = $('<label>');
		if (alreadyCutWords[word.toLowerCase().replace(puncStripRegex, '')]) {
			label.addClass('already-cut');
		}
		label.text(word);
		var cell = $('<td>');
		cell.append(opt);
		cell.append($('<br>'));
		cell.append(label);
		into.append(cell);

		first = false;
	}

	$('#freetext').text(active_line.text);
	$('#freetext').data('props', {start: 0, end: 0});
	
	updateTextReadout();
}

function nextWord() {
	var next = $('[name=word]:checked').parent().next().find('[name=word]')
	if (next.length > 0) {
		next.prop('checked', true);
	} else {
		nextLine();
	}
	updateTextReadout();
}

function nextLine() {
	$('#line-selector option:selected').next().prop('selected', true)
	updateCurrentLine()
}



$(function() {
	$(document).on('selectionchange', function(evt) {
		var selection = getSelection();
		try {
			if (selection.anchorNode && selection.anchorNode.parentNode.id != 'freetext') {
				return;
			}

			if (selection.rangeCount == 0) {
				return;
			}

			var range = selection.getRangeAt(0);
			var start = range.startOffset;
			var end = range.endOffset;
		} catch(e) {
			// TODO log errors so that I can fix them
			// (but any errors are, probably, non-fatal)

			return;
		}

		if (start === undefined || end === undefined) {
			return;
		}

		var obj = $('#freetext').data('props');
		obj.start = start;
		obj.end = end;

		updateTextReadout();
	})

	$('.mode-sel').on('change', showHideWordArea);

	$('#text-selector-area').on('change', '', updateTextReadout);

	$('#line-selector').on('change', updateCurrentLine);
})
