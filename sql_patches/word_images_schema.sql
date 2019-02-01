DROP TABLE IF EXISTS word_images;

CREATE TABLE word_images (
	id INT NOT NULL AUTO_INCREMENT,

	x INT NOT NULL,
	y INT NOT NULL,
	width INT,
	height INT,
	filepath VARCHAR(255) NOT NULL,

	word VARCHAR(255) NOT NULL,
	word_index_in_list INT NOT NULL,

	line_id INT NOT NULL,

	FOREIGN KEY (line_id)
		REFERENCES `lines`(id)
		ON DELETE CASCADE,

	PRIMARY KEY (id)
) ENGINE=INNODB;
