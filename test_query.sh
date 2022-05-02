#!/bin/sh

url="http://localhost:9080/meeting/1"

curl -X OPTIONS -v \
	-H "Origin: http://localhost:3000" \
	-H "Access-Control-Request-Method: GET" \
	-H "Access-Control-Headers: X-Requested-With" \
	-H "Accept: */*" \
	"$url"

curl -v \
	-H "Accept: */*" \
	"$url"


