CREATE TABLE domains (
	id INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(255) NOT NULL,

	PRIMARY KEY (id)
) ENGINE=INNODB;


ALTER TABLE projects
	ADD COLUMN domain_id INT,

	ADD CONSTRAINT 
		FOREIGN KEY (domain_id)
			REFERENCES domains(id)
;
