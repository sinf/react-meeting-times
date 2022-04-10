-- vim: set syntax=sql:

-- which database, domain, ... ?

DROP TABLE IF EXISTS one;
DROP TABLE IF EXISTS user_availab;
DROP TABLE IF EXISTS meetings;

CREATE TABLE one ( id INT PRIMARY KEY );
INSERT INTO one (id) VALUES (1);

CREATE TABLE meetings (
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	title VARCHAR(80) NOT NULL,
	descr VARCHAR(300),
	ts_from TIMESTAMP NOT NULL,
	ts_to TIMESTAMP NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE user_availab (
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	meeting BIGINT NOT NULL,
	ts_from TIMESTAMP NOT NULL,
	ts_to TIMESTAMP NOT NULL,
	username VARCHAR(28) NOT NULL,
	status SMALLINT NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT fk_mid
		FOREIGN KEY(meeting)
		REFERENCES meetings(id)
		ON DELETE CASCADE
);

INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous1', 'blahblahblah', '2018-02-01', '2018-03-01');
INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous2', 'blehBlehbleh', '2018-03-01', '2018-03-15');
INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous3', 'bhtan.,huaou', '2018-03-05', '2018-03-06');

INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T16:00Z', '2018-02-01T18:00Z', 'testuser', 1);
INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T12:00Z', '2018-02-01T21:00Z', 'user2', 1);
INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T08:00Z', '2018-02-01T13:00Z', 'user3', 1);

INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (2, '2018-02-01T08:00Z', '2018-02-01T13:00Z', 'testuser', 1);


