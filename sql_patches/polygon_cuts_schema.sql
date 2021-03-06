DROP TABLE IF EXISTS cut_polygons;

CREATE TABLE cut_polygons (
	id INT NOT NULL AUTO_INCREMENT,

	file_id INT NOT NULL,

	points TEXT NOT NULL,

	FOREIGN KEY (file_id)
		REFERENCES files(id)
		ON DELETE CASCADE,

	PRIMARY KEY (id)
) ENGINE=INNODB;
