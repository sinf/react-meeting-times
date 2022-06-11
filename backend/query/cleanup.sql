
DELETE FROM meetings WHERE ts_to < current_date - interval '1 week';
DELETE FROM meetings WHERE ts_from > current_date + interval '10 year';
DELETE FROM meetings WHERE ts_from >= ts_to;
DELETE FROM user_availab WHERE ts_from >= ts_to;

