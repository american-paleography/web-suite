function normalizeHeadword(word) {
	word = word.toLowerCase();
	word = word.replace(/<[^>]*>/g, '');
}

module.exports = {
	normalizeHeadword,
}
