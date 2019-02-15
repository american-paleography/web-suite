ALTER TABLE cut_polygons
	ADD COLUMN is_phrase BOOLEAN,
	ADD COLUMN is_word BOOLEAN,
	ADD COLUMN is_letter BOOLEAN,
	ADD COLUMN is_abbrev BOOLEAN,
	ADD COLUMN is_letter_seq BOOLEAN
;
