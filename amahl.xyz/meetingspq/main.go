package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"

    "github.com/gorilla/mux"
    _ "github.com/lib/pq"
)

const (
    DB_USER     = "postgres"
    DB_PASSWORD = ""
    DB_NAME     = "meetings_app"
)

func setupDB() *sql.DB {
    //dbinfo := fmt.Sprintf("user=%s password=%s dbname=%s sslmode=disable", DB_USER, DB_PASSWORD, DB_NAME)
    dbinfo := fmt.Sprintf("user=%s dbname=%s sslmode=disable", DB_USER, DB_NAME)
    db, err := sql.Open("postgres", dbinfo)
    checkErr(err)
    return db
}

func testDB() {
	db := setupDB()
	rows,err := db.Query("SELECT id FROM one LIMIT 1")
	checkErr(err)
	for rows.Next() {
		var id int
		err = rows.Scan(&id)
		checkErr(err)
		if id != 1 {
			panic("test query fail")
		}
	}
}

type Meeting struct {
	id int64 `json:"id"`
	title string `json:"title"`
	descr string `json:"descr"`
	ts_from string `json:"ts_from"`
	ts_to string `json:"ts_to"`
}

type UserAvailab struct {
	meeting int64 `json:"meeting"`
	ts_from string `json:"ts_from"`
	ts_to string `json:"ts_to"`
	username string `json:"username"`
	status int `json:"status"`
}

type MeetingResponse struct {
	meeting Meeting `json:"meeting"`
	user_availab [] UserAvailab `json:"user_availab"`
}

func main() {
	testDB()
	router := mux.NewRouter()
	router.HandleFunc("/c", CreateMeeting).Methods("POST")
	router.HandleFunc("/m/{id}", GetMeeting).Methods("GET")
	router.HandleFunc("/m/{id}", SetUserAvail).Methods("POST")
	fmt.Println("Server at 9080")
	log.Fatal(http.ListenAndServe(":9080", router))
}

func checkErr(err error) {
    if err != nil {
        panic(err)
    }
}

func GetMeeting(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	id := params["id"]
	if id == "" {
		http.Error(w, "you idiot! id is empty", 404)
		return
	}

	db := setupDB()
	rows,err := db.Query("SELECT * FROM meetings WHERE id = $1 LIMIT 1", id)
	checkErr(err)
	for rows.Next() {
		var m Meeting
		err = rows.Scan(&m.id, &m.title, &m.descr, &m.ts_from, &m.ts_to)
		checkErr(err)

		rows,err = db.Query("SELECT * FROM user_availab WHERE meeting = $1", id)

		var mr MeetingResponse
		mr.meeting = m

		for rows.Next() {
			var id int64
			var ua UserAvailab
			err = rows.Scan(&id, &ua.meeting, &ua.ts_from, &ua.ts_to, &ua.username, &ua.status)
			checkErr(err)
			mr.user_availab = append(mr.user_availab, ua)
		}

		fmt.Printf("mr.meeting.id=%s\n", mr.meeting.id);

		json.NewEncoder(w).Encode(mr)
		return
	}

	http.Error(w, "meeting does not exist", 404)
}


func CreateMeeting(w http.ResponseWriter, r *http.Request) {
	var m Meeting
	m.title = r.FormValue("title")
	if m.title == "" {
		http.Error(w, "you idiot! fill in title", 404)
		return
	}

	m.descr = r.FormValue("descr")
	m.ts_from = r.FormValue("ts_from")
	m.ts_to = r.FormValue("ts_to")

	// todo check date

	db := setupDB()
	err := db.QueryRow("INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ($1,$2,$3,$4) returning id;", m.title, m.descr, m.ts_from, m.ts_to).Scan(&m.id)
	checkErr(err)

	json.NewEncoder(w).Encode(m)
}

func SetUserAvail(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "unimpl", 501)
}

