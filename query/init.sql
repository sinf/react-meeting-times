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
	INSERT INTO user_availab (meeting, ts_from, ts_to, username, status) VALUES (i, a, b, n, z);
$$ LANGUAGE SQL;


