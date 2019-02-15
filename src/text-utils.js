function stripWhitespace(word) {
	return word.replace(/^\s+|\s+$/, '');
}

function normalizeHeadword(word) {
	word = word.toLowerCase();
	word = word.replace(/<[^>]*>/g, '');

	return word;
}

function hasMultipleAlphanum(text) {
	return text.match(/[a-zA-Z0-9].*?[a-zA-Z0-9]/);
}

// these three *probably* go into a SQL statement, so we actually need to be strict on boolean typing
function isPhrase(text) {
	return !!( text.match(/\s/) && hasMultipleAlphanum(text) );
}
function isLetter(text) {
	return !!( text.replace(/[^a-zA-Z]/g, '').length == 1 );
}
function isWord(text) {
	return !!( !(text.match(/\s/)) && hasMultipleAlphanum(text) );
}

module.exports = {
	normalizeHeadword,
	stripWhitespace,
	isPhrase,
	isLetter,
	isWord,
}
