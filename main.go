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
	st_get_m *sql.Stmt
	st_get_ua *sql.Stmt
}

type Meeting struct {
	Id int64 `json:"id"`
	Title string `json:"title"`
	Descr string `json:"descr"`
	Ts_from time.Time `json:"ts_from"`
	Ts_to time.Time `json:"ts_to"`
}

type UserAvailabT struct {
	Status int `json:"status"`
	Ts_from time.Time `json:"ts_from"`
	Ts_to time.Time `json:"ts_to"`
}

type UserAvailab struct {
	Meeting int64 `json:"meeting"`
	Username string `json:"username"`
	T [] UserAvailabT `json:"t"`
}

type MeetingResponse struct {
	Meeting Meeting `json:"meeting"`
	Users [] UserAvailab `json:"users"`
}

func checkErr(err error) {
   if err != nil {
      panic(err)
   }
}

func (a *App) run() {
	fmt.Println("Server at 9080")
	log.Fatal(http.ListenAndServe(":9080", a.r))
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

	a.st_get_m, err = db.Prepare("SELECT * FROM meetings WHERE id = $1 LIMIT 1")
	checkErr(err)

	a.st_get_ua, err = db.Prepare("SELECT * FROM user_availab WHERE meeting = $1")
	checkErr(err)

	a.r = mux.NewRouter()
	a.r.HandleFunc("/create", a.CreateMeetingR).Methods("POST")
	a.r.HandleFunc("/meeting/{id}", a.GetMeetingR).Methods("GET")
	a.r.HandleFunc("/update", a.SetUserAvailR).Methods("POST")
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

func (a *App) GetMeeting(meeting_id int64) *MeetingResponse {
	rows,err := a.st_get_m.Query(meeting_id)
	checkErr(err)

	mr := MeetingResponse{}

	for rows.Next() {
		var m Meeting
		err = rows.Scan(&m.Id, &m.Title, &m.Descr, &m.Ts_from, &m.Ts_to)
		checkErr(err)
		rows.Close()
		mr.Meeting = m

		rows2,err2 := a.st_get_ua.Query(meeting_id)
		checkErr(err2)

		var users = make(map[string]UserAvailab);

		for rows2.Next() {
			var id int64
			var ua UserAvailab
			var t UserAvailabT
			err = rows2.Scan(&id, &ua.Meeting, &t.Ts_from, &t.Ts_to, &ua.Username, &t.Status)
			checkErr(err)

			if _, ok := users[ua.Username]; !ok {
				users[ua.Username] = ua
				ua.T = []UserAvailabT{t}
			} else {
				ua.T = append(users[ua.Username].T, t)
			}

			users[ua.Username] = ua
		}
		rows2.Close()

		for _,u := range users {
			mr.Users = append(mr.Users, u)
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
	if err != nil {
		return -1
	}
	return id
}

func checkStr(w http.ResponseWriter, what string, s string, min_len int, max_len int) bool {
	e := 404
	if len(s) < min_len {
		http.Error(w, fmt.Sprintf("you idiot! %s is too short or empty", what), e)
		return true
	}
	if len(s) > max_len {
		http.Error(w, fmt.Sprintf("you idiot! %s is too long", what), e)
		return true
	}
	return false
}

func (a *App) CreateMeetingR(w http.ResponseWriter, r *http.Request) {
	var m Meeting
	var err error
	j := json.NewDecoder(r.Body)
	err = j.Decode(&m)

	if err != nil {
		http.Error(w, "you idiot! POST body json can't be parsed!", 404)
		return
	}

	if checkStr(w, "title", m.Title, 1, 80) || checkStr(w, "descr", m.Descr, 0, 300) {
		return
	}

	// todo check if date are valid

	id := a.CreateMeeting(m.Title, m.Descr, m.Ts_from.Format(time.RFC3339), m.Ts_to.Format(time.RFC3339))

	if id < 0 {
		http.Error(w, "failed to create meeting. wtf", 500)
		return
	}

	m.Id = id
	//m.Ts_from, err = time.Parse(time.RFC3339, Ts_from)
	//checkErr(err)

	json.NewEncoder(w).Encode(m)
}

func (a* App) SetUserAvail(ua *UserAvailab) {

	tx, err := a.db.Begin()
	checkErr(err)

	_, err = tx.Exec("DELETE FROM user_availab WHERE meeting = ? AND username = ?", ua.Meeting, ua.Username)
	checkErr(err)

	st, err := tx.Prepare("INSERT INTO user_availab (meeting,ts_from,ts_to,username,status) VALUES (?,?,?,?,?)")
	checkErr(err)

	for _, t := range ua.T {
		_, err := st.Exec(ua.Meeting, t.Ts_from, t.Ts_to, ua.Username, t.Status)
		checkErr(err)
	}

	checkErr(st.Close())
	checkErr(tx.Commit())
}

func (a* App) SetUserAvailR(w http.ResponseWriter, r *http.Request) {
	var ua UserAvailab
	j := json.NewDecoder(r.Body)
	err := j.Decode(&ua)

	if err != nil {
		http.Error(w, "you idiot! POST body json can't be parsed!", 404)
		return
	}

	if len(ua.Username) < 1 || len(ua.Username) > 28 {
		http.Error(w, "you idiot! username is not valid", 404)
		return
	}

	a.SetUserAvail(&ua)
}

