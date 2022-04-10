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
	ts_from TIMESTAMP WITH TIME ZONE NOT NULL,
	ts_to TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE user_availab (
	id BIGINT GENERATED ALWAYS AS IDENTITY,
	meeting BIGINT NOT NULL,
	ts_from TIMESTAMP WITH TIME ZONE NOT NULL,
	ts_to TIMESTAMP WITH TIME ZONE NOT NULL,
	username VARCHAR(28) NOT NULL,
	status SMALLINT NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT fk_mid
		FOREIGN KEY(meeting)
		REFERENCES meetings(id)
		ON DELETE CASCADE
);

CREATE INDEX user_availab_idx1 ON user_availab (meeting);

-- modify_user_ts(meeting id, from, to, username, status)
CREATE OR REPLACE FUNCTION
modify_user_ts(
	i BIGINT,
	a TIMESTAMP WITH TIME ZONE,
	b TIMESTAMP WITH TIME ZONE,
	n VARCHAR(28),
	z INTEGER)
RETURNS VOID AS $$
	UPDATE user_availab SET ts_to = a WHERE ts_to >= a AND ts_to <= b AND meeting = i AND username = n;
	UPDATE user_availab SET ts_from = b WHERE ts_from >= a AND ts_from <= b AND meeting = i AND username = n;
	DELETE FROM user_availab WHERE ts_from >= a AND ts_to <= b AND meeting = i AND username = n;
	DELETE FROM user_availab WHERE ts_from >= ts_to AND meeting = i AND username = n;
	INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (i, a, b, n, z);
$$ LANGUAGE SQL;

INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous1', 'blahblahblah', '2018-02-01+0200', '2018-03-01+0200');
INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous2', 'blehBlehbleh', '2018-03-01+0200', '2018-03-15+0200');
INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ('kokous3', 'bhtan.,huaou', '2018-03-05+0200', '2018-03-06+0200');

INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T16:00+0200', '2018-02-01T18:00+0200', 'testuser', 1);
INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T12:00+0200', '2018-02-01T21:00+0200', 'user2', 1);
INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (1, '2018-02-01T08:00+0200', '2018-02-01T13:00+0200', 'user3', 1);

INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (2, '2018-02-01T08:00+0200', '2018-02-01T13:00+0200', 'testuser', 1);

-- initially 16-18
SELECT * FROM "modify_user_ts"(1, '2018-02-01T14:00+0200', '2018-02-01T16:00+0200', 'testuser', 1);
-- 14-16, 16-18
SELECT * FROM "modify_user_ts"(1, '2018-02-01T17:00+0200', '2018-02-01T20:00+0200', 'testuser', 1);
-- 14-16, 16-17, 17-20

SELECT * FROM "modify_user_ts"(1, '2018-02-01T15:00+0200', '2018-02-01T22:00+0200', 'testuser', 1);
-- 14-15, 15-22

