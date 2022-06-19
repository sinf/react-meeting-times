FROM alpine:latest
WORKDIR /app
RUN apk update
RUN apk add go

COPY go.mod .
COPY go.sum .
RUN go get database/sql encoding/json fmt github.com/gorilla/handlers github.com/gorilla/mux github.com/lib/pq log net/http os strconv time

COPY main.go .
RUN go build

FROM alpine:latest
WORKDIR /app
COPY --from=0 /app/meetingspq .
COPY server-config.docker.json server-config.json
EXPOSE 9080
CMD ./meetingspq

