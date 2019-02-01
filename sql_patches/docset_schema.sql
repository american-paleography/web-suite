DROP TABLE IF EXISTS docset;
DROP TABLE IF EXISTS docsets;

CREATE TABLE docsets (
	id INT NOT NULL AUTO_INCREMENT,

	name VARCHAR(255),
	creator_id INT NOT NULL,

	FOREIGN KEY (creator_id)
		REfERENCES users(id),

	PRIMARY KEY (id)
) ENGINE=INNODB;

CREATE TABLE docsets_files_join (
	docset_id INT NOT NULL,
	file_id INT NOT NULL,

	FOREIGN KEY (docset_id)
		REFERENCES docsets(id),
	FOREIGN KEY (file_id)
		REFERENCES files(id),

	PRIMARY KEY (docset_id, file_id)
) ENGINE=INNODB;
