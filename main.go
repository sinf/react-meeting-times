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
	st_ua *sql.Stmt
	st_get_m *sql.Stmt
	st_get_ua *sql.Stmt
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

	a.st_ua, err = db.Prepare(`SELECT * FROM "modify_user_ts"($1, $2, $3, $4, $5)`)
	checkErr(err)

	a.st_get_m, err = db.Prepare("SELECT * FROM meetings WHERE id = $1 LIMIT 1")
	checkErr(err)

	a.st_get_ua, err = db.Prepare("SELECT * FROM user_availab WHERE meeting = $1")
	checkErr(err)

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
	Id int64 `json:"id"`
	Title string `json:"Title"`
	Descr string `json:"Descr"`
	Ts_from time.Time `json:"Ts_from"`
	Ts_to time.Time `json:"Ts_to"`
}

type UserAvailab struct {
	Meeting int64 `json:"meeting"`
	Ts_from time.Time `json:"Ts_from"`
	Ts_to time.Time `json:"Ts_to"`
	Username string `json:"username"`
	Status int `json:"status"`
}

type MeetingResponse struct {
	Meeting Meeting `json:"meeting"`
	User_availab [] UserAvailab `json:"user_availab"`
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
	rows,err := a.st_get_m.Query(id)
	checkErr(err)

	mr := MeetingResponse{}

	for rows.Next() {
		var m Meeting
		err = rows.Scan(&m.Id, &m.Title, &m.Descr, &m.Ts_from, &m.Ts_to)
		checkErr(err)

		rows2,err2 := a.st_get_ua.Query(id)
		checkErr(err2)

		mr.Meeting = m

		for rows2.Next() {
			var id int64
			var ua UserAvailab
			err = rows2.Scan(&id, &ua.Meeting, &ua.Ts_from, &ua.Ts_to, &ua.Username, &ua.Status)
			checkErr(err)
			mr.User_availab = append(mr.User_availab, ua)
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
	if err != nil || id < 0 {
		http.Error(w, "you idiot! id is not valid", 404)
		return
	}

	mr := a.GetMeeting(id)
	if (mr != nil) {
		json.NewEncoder(w).Encode(mr)
	} else {
		http.Error(w, "meeting does not exist", 404)
	}
}

func (a *App) CreateMeeting(Title, Descr, Ts_from, Ts_to string) int64 {
	var id int64
	err := a.db.QueryRow("INSERT INTO meetings (Title, Descr, Ts_from, Ts_to) VALUES ($1,$2,$3,$4) returning id;", Title, Descr, Ts_from, Ts_to).Scan(&id)
	checkErr(err)
	return id
}

func (a *App) CreateMeetingR(w http.ResponseWriter, r *http.Request) {
	Title := r.FormValue("Title")
	if Title == "" {
		http.Error(w, "you idiot! fill in Title", 404)
		return
	}

	Descr := r.FormValue("Descr")
	Ts_from := r.FormValue("Ts_from")
	Ts_to := r.FormValue("Ts_to")

	// todo check date
	id := a.CreateMeeting(Title, Descr, Ts_from, Ts_to)

	// return 500 if sql error

	var m Meeting
	var err error
	m.Id = id
	m.Title = Title
	m.Descr = Descr
	m.Ts_from, err = time.Parse(time.RFC3339, Ts_from)
	checkErr(err)
	m.Ts_to, err = time.Parse(time.RFC3339, Ts_to)
	checkErr(err)

	json.NewEncoder(w).Encode(m)
}

func (a* App) SetUserAvail(meeting int64, ua *UserAvailab) {
	_, err := a.st_ua.Exec(meeting, ua.Ts_from, ua.Ts_to, ua.Username, ua.Status)
	checkErr(err)
}

func (a* App) SetUserAvailR(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	id_s := params["id"]
	id,err := strconv.ParseInt(id_s, 10, 64)
	if err != nil || id < 0 {
		http.Error(w, "you idiot! id is not valid", 404)
		return
	}

	var ua UserAvailab
	j := json.NewDecoder(r.Body)
	err = j.Decode(&ua)

	if err != nil {
		http.Error(w, "you idiot! POST body json can't be parsed!", 404)
		return
	}

	a.SetUserAvail(id, &ua)
}

