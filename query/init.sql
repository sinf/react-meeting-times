-- vim: set syntax=sql:

-- which database, domain, ... ?

DROP TABLE IF EXISTS one;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS user_availab;

CREATE TABLE one ( id INT PRIMARY KEY );
INSERT INTO one (id) VALUES (1);

CREATE TABLE meetings (
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	title CHAR(80) NOT NULL,
	descr CHAR(300),
	ts_from TIMESTAMP NOT NULL,
	ts_to TIMESTAMP NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE user_availab (
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	meeting BIGINT NOT NULL,
	ts_from TIMESTAMP NOT NULL,
	ts_to TIMESTAMP NOT NULL,
	username CHAR(28) NOT NULL,
	status SMALLINT NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT fk_mid
		FOREIGN KEY(meeting)
		REFERENCES meetings(id)
		ON DELETE CASCADE
);

