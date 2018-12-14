ALTER TABLE cut_polygons
	ADD COLUMN line_id INT,
	ADD COLUMN text TEXT,
	ADD COLUMN trans_start INT,
	ADD COLUMN trans_end INT,

	ADD CONSTRAINT 
		FOREIGN KEY (line_id)
			REFERENCES `lines`(id)
			ON DELETE CASCADE
;
