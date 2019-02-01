ALTER TABLE files
	ADD COLUMN year INT,
	ADD COLUMN author_name VARCHAR(255),
	ADD COLUMN author_gender CHAR(1),
	ADD COLUMN location VARCHAR(255)
;
