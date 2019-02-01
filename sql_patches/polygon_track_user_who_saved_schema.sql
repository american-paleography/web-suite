ALTER TABLE cut_polygons
	ADD COLUMN creator_id INT,
	ADD CONSTRAINT 
		FOREIGN KEY (creator_id)
			REFERENCES users(id)
			ON DELETE CASCADE
;
