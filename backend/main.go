package main

/* --- stupid simple API ---

	POST /create       body={id,title,descr,from,to}
		create a meeting with given parameters
		=> {id,title,descr,from,to,mtime}

	GET  /meeting/{id}
		get all stuff related to meeting
		=> {meeting:{id,title,descr,from,to,mtime}, users[]:{meeting,username,t[]:{status,from,to}}}

	POST /update       body={meeting,username,t[]:{status,from,to}}
		overwrite all time ranges of one user in a meeting
		returns new state of the meeting after applying the requested change 
		=> {meeting:{id,title,descr,from,to,mtime}, users[]:{meeting,username,t[]:{status,from,to}}}

*/


import (
   "database/sql"
   "encoding/json"
   "fmt"
   "time"
   "log"
   "os"
   "net/http"
   "strconv"

   "github.com/gorilla/mux"
   "github.com/gorilla/handlers"
   _ "github.com/lib/pq"
)

type ServerConfig struct {
	DbInfo string `json:"DbInfo"` 
	ServerAddr string `json:"ServerAddr"`
	AllowedOrigins []string `json:"AllowedOrigins"`
	AllowedHeaders []string `json:"AllowedHeaders"`
}

type App struct {
	r *mux.Router
	db *sql.DB
	st_get_m *sql.Stmt
	st_get_ua *sql.Stmt
	cf ServerConfig
}

type Meeting struct {
	Id int64 `json:"id"`
	Title string `json:"title"`
	Descr string `json:"descr"`
	Ts_from time.Time `json:"from"`
	Ts_to time.Time `json:"to"`
	Mtime time.Time `json:"mtime"`
}

type UserAvailabT struct {
	Status int `json:"status"`
	Ts_from time.Time `json:"from"`
	Ts_to time.Time `json:"to"`
}

type UserAvailab struct {
	Meeting int64 `json:"meeting"`
	Username string `json:"username"`
	T [] UserAvailabT `json:"T"`
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
	h := handlers.AllowedHeaders(a.cf.AllowedHeaders)
	o := handlers.AllowedOrigins(a.cf.AllowedOrigins)
	m := handlers.AllowedMethods([]string{"GET", "POST"})
	c := handlers.CORS(o,h,m)(a.r)

	fmt.Println("Serving at", a.cf.ServerAddr)
	log.Fatal(http.ListenAndServe(a.cf.ServerAddr, c))
}

func (a *App) init(cf ServerConfig) {
	a.cf = cf

	db, err := sql.Open("postgres", cf.DbInfo)
	if err != nil {
		fmt.Println("Failed to connect to postgres");
		panic(err)
	}

	// make sure that a basic query works
	rows,err := db.Query("SELECT id FROM one LIMIT 1")
	if err != nil {
		fmt.Println("Failed to query test shit. Postgresl not running?");
		panic(err)
	}

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

	r := mux.NewRouter()
	r.HandleFunc("/create", a.CreateMeetingR).Methods("POST")
	r.HandleFunc("/meeting/{id}", a.GetMeetingR).Methods("GET")
	r.HandleFunc("/update", a.SetUserAvailR).Methods("POST")
	a.r = r
}

func get_config() ServerConfig {
	default_cf := &ServerConfig {
		DbInfo: "user=postgres dbname=meetings_app sslmode=disable",
		ServerAddr: ":9080",
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedHeaders: []string{"Accept", "Origin", "Accept-Encoding", "Content-Type"},
	}

	cf_path := "server-config.json"
	fmt.Println("configuration file:", cf_path)

	cf := default_cf
	data, err := os.ReadFile(cf_path)
	if err == nil && len(data) > 0 {
		fmt.Println("reading configuration")
		json.Unmarshal(data, &cf)
	} else {
		file, err := os.OpenFile(cf_path, os.O_CREATE | os.O_RDWR, 0644)
		if err != nil {
			fmt.Println(err)
		} else {
			fmt.Println("writing new configuration")
			e := json.NewEncoder(file)
			e.SetIndent("", "    ")
			e.Encode(cf)
			file.Close()
		}
	}

	return *cf
}

func main() {
	cf := get_config()
	a := App{}
	a.init(cf)
	a.run()
}

func (a *App) GetMeeting(meeting_id int64) *MeetingResponse {
	rows,err := a.st_get_m.Query(meeting_id)
	checkErr(err)

	mr := MeetingResponse{}

	for rows.Next() {
		var m Meeting
		err = rows.Scan(&m.Id, &m.Title, &m.Descr, &m.Ts_from, &m.Ts_to, &m.Mtime)
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
		http.Error(w, "you idiot! id is empty", 400)
		return
	}

	id,err := strconv.ParseInt(id_s, 10, 64)
	if err != nil || id < 0 {
		http.Error(w, "you idiot! id is not valid", 400)
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
	e := 400
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
		http.Error(w, "you idiot! POST body json can't be parsed!", 400)
		return
	}

	if checkStr(w, "title", m.Title, 3, 80) || checkStr(w, "descr", m.Descr, 0, 640) {
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
	// todo return error to caller if meeting doesnt exist

	tx, err := a.db.Begin()
	checkErr(err)

	_, err = tx.Exec("DELETE FROM user_availab WHERE meeting = $1 AND username = $2", ua.Meeting, ua.Username)
	checkErr(err)

	st, err := tx.Prepare("INSERT INTO user_availab (meeting,ts_from,ts_to,username,status) VALUES ($1,$2,$3,$4,$5)")
	checkErr(err)
	for _, t := range ua.T {
		_, err := st.Exec(ua.Meeting, t.Ts_from, t.Ts_to, ua.Username, t.Status)
		checkErr(err)
	}

	_, err = tx.Exec("UPDATE meetings SET mtime = CURRENT_TIMESTAMP WHERE id = $1", ua.Meeting)
	checkErr(err)

	checkErr(st.Close())
	checkErr(tx.Commit())
}

func (a* App) SetUserAvailR(w http.ResponseWriter, r *http.Request) {
	var ua UserAvailab
	j := json.NewDecoder(r.Body)
	err := j.Decode(&ua)

	if err != nil {
		http.Error(w, "you idiot! POST body json can't be parsed!", 400)
		return
	}

	if len(ua.Username) < 1 || len(ua.Username) > 28 {
		http.Error(w, "you idiot! username is not valid", 400)
		return
	}

	a.SetUserAvail(&ua)

	mr := a.GetMeeting(ua.Meeting)
	if (mr != nil) {
		json.NewEncoder(w).Encode(mr)
	} else {
		http.Error(w, "meeting does not exist", 404)
	}
}

