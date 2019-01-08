function normalizeHeadword(word) {
	word = word.toLowerCase();
	word = word.replace(/<[^>]*>/g, '');

	return word;
}

module.exports = {
	normalizeHeadword,
}
