DROP TABLE IF EXISTS words;
DROP TABLE IF EXISTS words_lines_join;

CREATE TABLE words (
	id INT NOT NULL AUTO_INCREMENT,
	lc_text VARCHAR(512) NOT NULL,

	UNIQUE KEY (lc_text),
	
	PRIMARY KEY (id)
) ENGINE=INNODB;

-- ephemeral table, that might end up being replaced by something else. But for now, it's useful
CREATE TABLE words_lines_join (
	word_id INT NOT NULL,
	line_id INT NOT NULL,
	tokenized_index INT NOT NULL, -- this is the (0-indexed) position in the tokenized line

	FOREIGN KEY (line_id)
		REFERENCES `lines`(id)
		ON DELETE CASCADE,
	FOREIGN KEY (word_id)
		REFERENCES `words`(id)
		ON DELETE CASCADE,
	
	PRIMARY KEY (word_id, line_id, tokenized_index) -- doing a composite primary key for as long as this is treated as ephemeral

) ENGINE=INNODB;


ALTER TABLE cut_polygons
	ADD COLUMN word_id INT,

	ADD CONSTRAINT 
		FOREIGN KEY (word_id)
			REFERENCES words(id)
;
