package main

import (
   "database/sql"
   "encoding/json"
   "fmt"
   "time"
   "log"
   "net/http"
   "strconv"

   "github.com/gorilla/mux"
   _ "github.com/lib/pq"
)

type App struct {
	r *mux.Router
	db *sql.DB
}

func (a *App) init(db_user, db_name string) {
	//dbinfo := fmt.Sprintf("user=%s password=%s dbname=%s sslmode=disable", db_user, db_password, db_name)
	dbinfo := fmt.Sprintf("user=%s dbname=%s sslmode=disable", db_user, db_name)
	db, err := sql.Open("postgres", dbinfo)
	checkErr(err)

	// make sure that a basic query works
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

	a.db = db
	a.r = mux.NewRouter()
	a.r.HandleFunc("/c", a.CreateMeetingR).Methods("POST")
	a.r.HandleFunc("/m/{id}", a.GetMeetingR).Methods("GET")
	a.r.HandleFunc("/m/{id}", a.SetUserAvailR).Methods("POST")
}

func (a *App) run() {
	fmt.Println("Server at 9080")
	log.Fatal(http.ListenAndServe(":9080", a.r))
}

type Meeting struct {
	id int64 `json:"id"`
	title string `json:"title"`
	descr string `json:"descr"`
	ts_from time.Time `json:"ts_from"`
	ts_to time.Time `json:"ts_to"`
}

type UserAvailab struct {
	meeting int64 `json:"meeting"`
	ts_from time.Time `json:"ts_from"`
	ts_to time.Time `json:"ts_to"`
	username string `json:"username"`
	status int `json:"status"`
}

type MeetingResponse struct {
	meeting Meeting `json:"meeting"`
	user_availab [] UserAvailab `json:"user_availab"`
}

func main() {
	const (
    	DB_USER     = "postgres" // os.Getenv("DB_USER")
    	DB_NAME     = "meetings_app" //os.Getenv("DB_NAME")
	)
	a := App{}
	a.init(DB_USER, DB_NAME)
	a.run()
}

func checkErr(err error) {
   if err != nil {
      panic(err)
   }
}

func (a *App) GetMeeting(id int64) *MeetingResponse {
	rows,err := a.db.Query("SELECT * FROM meetings WHERE id = $1 LIMIT 1", id)
	checkErr(err)

	mr := MeetingResponse{}

	for rows.Next() {
		var m Meeting
		err = rows.Scan(&m.id, &m.title, &m.descr, &m.ts_from, &m.ts_to)
		checkErr(err)

		rows2,err2 := a.db.Query("SELECT * FROM user_availab WHERE meeting = $1", id)
		checkErr(err2)

		mr.meeting = m

		for rows2.Next() {
			var id int64
			var ua UserAvailab
			err = rows2.Scan(&id, &ua.meeting, &ua.ts_from, &ua.ts_to, &ua.username, &ua.status)
			checkErr(err)
			mr.user_availab = append(mr.user_availab, ua)
		}

		return &mr
	}

	return nil
}

func (a *App) GetMeetingR(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	id_s := params["id"]
	if id_s == "" {
		http.Error(w, "you idiot! id is empty", 404)
		return
	}

	id,err := strconv.ParseInt(id_s, 10, 64)
	checkErr(err)

	mr := a.GetMeeting(id)
	if (mr != nil) {
		fmt.Printf("mr.meeting.id=%d user_availab=%d\n", mr.meeting.id, len(mr.user_availab));
		json.NewEncoder(w).Encode(mr)
	} else {
		http.Error(w, "meeting does not exist", 404)
	}
}

func (a *App) CreateMeeting(title, descr, ts_from, ts_to string) int64 {
	var id int64
	err := a.db.QueryRow("INSERT INTO meetings (title, descr, ts_from, ts_to) VALUES ($1,$2,$3,$4) returning id;", title, descr, ts_from, ts_to).Scan(&id)
	checkErr(err)
	return id
}

func (a *App) CreateMeetingR(w http.ResponseWriter, r *http.Request) {
	title := r.FormValue("title")
	if title == "" {
		http.Error(w, "you idiot! fill in title", 404)
		return
	}

	descr := r.FormValue("descr")
	ts_from := r.FormValue("ts_from")
	ts_to := r.FormValue("ts_to")

	// todo check date
	id := a.CreateMeeting(title, descr, ts_from, ts_to)

	// return 500 if sql error

	var m Meeting
	var err error
	m.id = id
	m.title = title
	m.descr = descr
	m.ts_from, err = time.Parse(time.RFC3339, ts_from)
	checkErr(err)
	m.ts_to, err = time.Parse(time.RFC3339, ts_to)
	checkErr(err)

	json.NewEncoder(w).Encode(m)
}

func (a* App) SetUserAvail(meeting int64, ts_from, ts_to, username string, status int) {
	// todo
}

func (a* App) SetUserAvailR(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "unimpl", 501)
}

