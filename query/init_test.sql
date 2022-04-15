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

CREATE OR REPLACE FUNCTION
join_user_ts(i BIGINT, n VARCHAR(28)) RETURNS VOID AS $body$

	UPDATE user_availab SET ts_to = u2.ts_to
		FROM user_availab u1 INNER JOIN user_availab u2
		ON (u1.ts_to = u2.ts_from AND u1.status = u2.status)
		WHERE u1.meeting = i AND u1.username = n AND u2.meeting = i AND u2.username = n;

	DELETE FROM user_availab WHERE id IN (
		SELECT u2.id
		FROM user_availab u1 INNER JOIN user_availab u2
		ON (u1.ts_to = u2.ts_to AND u1.status = u2.status)
		WHERE u1.meeting = i AND u1.username = n AND u2.meeting = i AND u2.username = n
			AND u2.ts_from > u1.ts_from);

$body$ LANGUAGE SQL;


-- modify_user_ts(meeting id, from, to, username, status)
CREATE OR REPLACE FUNCTION
modify_user_ts(
	i BIGINT,
	a TIMESTAMP WITH TIME ZONE,
	b TIMESTAMP WITH TIME ZONE,
	n VARCHAR(28),
	z INTEGER)
RETURNS VOID AS $body$

	-- clamp partially overlapping intervals out of the way
	UPDATE user_availab SET ts_to = a WHERE meeting = i AND username = n AND ts_to >= a AND ts_to <= b;
	UPDATE user_availab SET ts_from = b WHERE meeting = i AND username = n AND ts_from >= a AND ts_from <= b;

	-- if trying to put a small interval within a big interval: split big interval in 2 and make a gap between them
	INSERT INTO user_availab (meeting, ts_from, ts_to, username, status)
		(SELECT meeting, b, ts_to, username, status FROM user_availab
		WHERE meeting = i AND username = n AND ts_from <= a AND ts_to >= b);
	UPDATE user_availab SET ts_to = a
		WHERE meeting = i AND username = n AND ts_from <= a AND ts_to >= b;

	-- delete invalid intervals potentially caused by statements above
	DELETE FROM user_availab WHERE meeting = i AND username = n AND ts_from >= ts_to;

	-- if inserting big interval over a small one, delete the small interval
	DELETE FROM user_availab WHERE meeting = i AND username = n AND ts_from >= a AND ts_to <= b;

	-- finally insert the new interval
	INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (i, a, b, n, z);

	-- try to join adjacent pieces
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);
	SELECT * FROM "join_user_ts"(i,n); SELECT * FROM "join_user_ts"(i,n);

$body$ LANGUAGE SQL;

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

SELECT * FROM "modify_user_ts"(1, '2018-02-01T08:00+0200', '2018-02-01T23:00+0200', 'testuser', 1);
-- 8-23

SELECT * FROM "modify_user_ts"(1, '2018-02-01T14:00+0200', '2018-02-01T14:30+0200', 'testuser', 2);

