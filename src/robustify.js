function robustify(wrapper) {
	var prom = new Promise((resolve, reject) => {
		wrapper(function(err, rest) {
			try {
				if (err) {
					reject(err);
				} else {
					resolve(rest);
				}
			} catch(e) {
				reject(e);
			}
		});
	});

	return prom;
}

module.exports = {
	robustify,
}
