# REST endpoint server for a meeting scheduling app

Implemented in go using postgresql

## How to start this thing

Somehow install go and compile the program
```shell
go build
```

## Set up postgresql

Install and start postgresql (no instructions here) natively or in docker or whatever.  

Create database and populate it  
```shell
$ postgres -U postgres
...
postgres=# CREATE DATABASE meetings_app;
CREATE DATABASE
postgres=# \c meetings_app;
You are now connected to database "meetings_app" as user "postgres".
meetings_app=# \i query/init.sql
psql:query/init.sql:3: NOTICE:  table "one" does not exist, skipping
DROP TABLE
psql:query/init.sql:4: NOTICE:  table "user_availab" does not exist, skipping
DROP TABLE
psql:query/init.sql:5: NOTICE:  table "meetings" does not exist, skipping
DROP TABLE
CREATE TABLE
INSERT 0 1
CREATE TABLE
CREATE TABLE
CREATE INDEX
meetings_app=#
```

## Start the server

```shell
./meetings_pq
```

