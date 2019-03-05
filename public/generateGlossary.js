$.fn.appendText = function(text) {
	return this.each(function() {
		$(this).append(document.createTextNode(text));
	})
}

var settings = {
	variants: {},
};

function saveSettings() {
	localStorage.setItem('extractionSettings', JSON.stringify(settings));
}
function loadSettings() {
	if (!localStorage) { return; }
	var tmp = localStorage.getItem('extractionSettings');
	if (!tmp) {
		return;
	}
	tmp = JSON.parse(tmp);

	for (var key in tmp) {
		settings[key] = tmp[key];
	}
}

$(function() {
	loadSettings();
});

$(function() {
	$('#clear_variants').on('click', function() {
		settings.variants = {};
		saveSettings();
		location.reload();
	});
});

function reloadGlossaryData(source_data) {
	// data used by various parts of this closure
	var annotationData = {
		lines: [],
		words: {},
		linesWithMetadata: [],
	};
	var scratch = {
		varLists: {},
	}


	var t_start = Date.now();
	// kick off the actual work
	source_data.forEach(extractOneLine);
	console.log('parsed, ' + (Date.now() - t_start) + 'ms');
	displayVariantsInDom();
	setVariantForms();
	showGlossary();
	console.log('rendered, ' + (Date.now() - t_start) + 'ms');


	$('#add_variant').on('click', function() {
		var base = $('[name=base_word]').val();
		var alt = $('[name=alt_word]').val();

		if (!settings.variants[base]) {
			settings.variants[base] = [];
		}
		settings.variants[base].push(alt);

		showSingleVariantInDom(base, alt);

		saveSettings();

		showGlossary();
	});

	function displayVariantsInDom() {
		Object.keys(settings.variants).sort().forEach(key => {
			settings.variants[key].forEach(variant => {
				showSingleVariantInDom(key, variant);
			});
		})
	}

	function showSingleVariantInDom(base, alt) {
		if (!scratch.varLists[base]) {
			var li =  $('<li>');
			var span = $('<span>');
			span.text(base);
			var ul = $('<ul>');
			li.append(span);
			li.append(ul);
			scratch.varLists[base] = ul;
			$('#variants_listing').append(li);
		}

		var item = $('<li>');
		item.text(alt);
		var clearButton = $('<button>');
		clearButton.text('remove');
		clearButton.on('click', function() {
			settings.variants[base] = settings.variants[base].filter(x => x != alt);
			item.remove();
			if (settings.variants[base].length == 0) {
				scratch.varLists[base].parent().remove();
				delete scratch.varLists[base];
				delete settings.variants[base];
			}
			saveSettings();
		});
		item.append(clearButton);
		scratch.varLists[base].append(item);
	}


	// various workhorse functions below 
	
	function setVariantForms() {
		$('.variant_form[data-variant-of]').each(function(i, el) {
			var mainForm = el.data('variantOf');
			var altForm = el.data('variant');
			
			var varData = settings.variants;
			if (!varData[mainForm]) {
				varData[mainForm] = [];
			}
			varData[mainForm].push(altForm);
		})
	}

	function showGlossary() {
		var splitHeight = window.innerHeight + "px";
		var dict = annotationData.words;
		var mainList = $('#glossaryDiv');
		mainList.empty();
		Object.keys(dict).sort().filter(x => x).forEach(word => {
			var data = dict[word];
			
			var item = $('<li>');
			var keyword = $('<strong>');
			keyword.text(word);
			item.append(keyword);

			if (data.length == 1) {
				var separator = $('<span>');
				separator.text(": ");
				item.append(separator);
				markupWordOccurrence(item, data[0]);
			} else {
				var sublist = $('<ul>');
				data.forEach(line => {
					var subitem = $('<li>');
					markupWordOccurrence(subitem, line);
					sublist.append(subitem);
				})
				item.append(sublist);
			}
			mainList.append(item);
		});

		var variantList = $('#glossaryVariantForms');
		var variants = settings.variants;
		variantList.empty();
		Object.keys(variants).sort().forEach(baseWord => {
			var forms = variants[baseWord];
			var data = [].concat(dict[baseWord] || [], ...forms.map(form => dict[form] || []));

			var item = $('<li>');
			var keyword = $('<strong>');
			keyword.text(baseWord);
			item.append(keyword);

			if (data.length == 1) {
				var separator = $('<span>');
				separator.text(": ");
				item.append(separator);
				markupWordOccurrence(item, data[0]);
			} else {
				var sublist = $('<ul>');
				data.forEach(line => {
					var subitem = $('<li>');
					markupWordOccurrence(subitem, line);
					sublist.append(subitem);
				})
				item.append(sublist);
			}
			variantList.append(item);
		});
		

		function markupWordOccurrence(container, data) {
			var start = data.word_offset;
			var end = data.word_offset + data.word_length;

			var pre = data.line_text.substring(0, start)
			var mid = data.line_text.substring(start, end)
			var post = data.line_text.substring(end)

			var line_num = data.line_index_in_file;
			var page_name = data.page_name;
			var folio = data.folio_index;
			var aabb = data.aabb;

			var tmp = $('<div>');
			tmp[0].innerHTML = emitWordHtml({before: pre, word: mid, after: post, line_num, page_name, folio, aabb});
			container.append(tmp);
		}

		var jsonVersion = JSON.stringify(dict, null, '  ')
		var csvVersion = generateCSV(dict);
		$('a#download-json').attr('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonVersion))
		$('a#download-csv').attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvVersion))

		$('.show-line-image').on('click', function() {
			if (this.imageEl) {
				this.imageEl.remove();
				this.imageEl = null;
			} else {
				var path = "/imageResize?folioNum=" + $(this).data('folio_index') + "&height=2000";
				var holder = $(this).parent();
				var dataEl = $(this);
				var aabb = dataEl.data('aabb');
				var [x, y, w, h] = aabb.split(',').map(x => parseInt(x));
				var vert_scale = parseFloat($('[name=line-height]').val() || 1)
				var horiz_scale = parseFloat($('[name=line-width]').val() || 1)
				y -= (vert_scale - 1)/2 * h;
				h *= vert_scale
				x -= (horiz_scale - 1)/2 * w;
				w *= horiz_scale;
				var scale = 2; // is this correct for all images...?
				var canvas = $('<canvas>');
				var img = new Image();
				img.onload = function() {
					canvas.attr('width', w);
					canvas.attr('height', h);
					var ctx = canvas[0].getContext('2d');
					ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, w, h);
					holder.append(canvas);
				};
				img.src = path;

				this.imageEl = canvas;
			}
		});
		$('#debug').text(csvVersion);

		$('#do-search').on('click', function() { searchLines(annotationData.linesWithMetadata)});
	}

	function generateCSV(words) {
		var header = 'row_num,word,line_text,word_offset,line_index_in_file,file_index';
		var csv_lines = [header];
		var count = 0;
		for (var word in words) {
			words[word].forEach(data => {
				count += 1;
				csv_lines.push([
					count,
					word,
					data.line_text,
					data.word_offset,
					data.line_index_in_file,
					data.file_index,
				].map(x => `"${x}"`))
			});
		}

		return csv_lines.join("\n");
	}


	function extractOneLine(row) {
		var file_id = row.file_id;
		var folio = null;
		var line = row.text;
		annotationData.lines.push(line);
		var aabb = 'xywh'.split('').map(k => row[k]).join(',');
		var pageName = row.filename;
		addWords(line, annotationData.lines.length-1, file_id, row.line_num, folio, aabb, pageName, 'temp');
	}

	function addWords(line, lookupIndex, fileIndex, lineIndexInFile, folio, aabb, page_name, on) {
		annotationData.linesWithMetadata.push({

			line_index: lookupIndex,
			line_text: line,
			file_index: fileIndex,
			line_index_in_file: lineIndexInFile,
			folio_index: folio,
			aabb: aabb,
			page_name,
			on,
		});

		var words = line.split(/\s+/);
		var pos = 0;
		var dict = annotationData.words;
		words.forEach(rawWord => {
			var offset = rawWord.length + 1;
			var word = rawWord.replace(/\W/g, ''); // strip punctuation
			word = word.toLowerCase(); // normalize case (might want to do this as an optional thing)

			// only add it in if it's non-empty (but we still need to increment if it IS empty)
			if (word) {
				if (!dict[word]) {
					dict[word] = [];
				}
				var obj = {
					line_index: lookupIndex,
					line_text: line,
					word_offset: pos,
					word_length: rawWord.length,
					file_index: fileIndex,
					line_index_in_file: lineIndexInFile, 
					folio_index: folio,
					aabb: aabb,
					page_name,
					on,
				};
				dict[word].push(obj)
			}

			pos += offset;
		});
	}
}

/*
$(function() {
	// WHY isn't this built-in. Anyway, strip off the '?', then get the right parameter
	var projectId = location.search.substring(1).split("&").map(comp => comp.split("=")).filter(comp => comp[0] == 'projectID')[0][1];
	$.get('/getProjectTPENServlet?projectID=' + projectId, function(payload) {
		reloadGlossaryData(JSON.parse(payload.manifest));
	});

});
*/
