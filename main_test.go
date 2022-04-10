package main

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"strings"
	"time"
	"fmt"
	"net/http"
	"net/http/httptest"
	"io/ioutil"
	"encoding/json"
)

func (a *App) executeRequest(req *http.Request) *httptest.ResponseRecorder {
    rr := httptest.NewRecorder()
    a.r.ServeHTTP(rr, req)
    return rr
}

func get_body(t *testing.T, r *httptest.ResponseRecorder) string {
	res := r.Result()
	defer res.Body.Close()
	data, err := ioutil.ReadAll(res.Body)
	checkErr(err)
	return string(data)
}

func try_meeting(t *testing.T, a *App, endpoint string, users int64, user0 string) {
	req, _ := http.NewRequest("GET", endpoint, nil)
	resp := a.executeRequest(req)
	assert.EqualValues(t, resp.Code, http.StatusOK, "/m/1")
	b := get_body(t, resp)
	t.Log(endpoint, "->", b)
	assert.NotEqualValues(t, b, "{}\n", "empty meeting 1")

	var mr MeetingResponse
	j := json.NewDecoder(strings.NewReader(b))
	j.Decode(&mr)
	assert.EqualValues(t, len(mr.User_availab), users, "invalid user count")

	if users>0 {
		assert.EqualValues(t, mr.User_availab[0].Username, user0, "wrong user name")
	}
}

func TestMain(t *testing.T) {
	const (
    	 DB_USER     = "postgres" // os.Getenv("DB_USER")
    	 DB_NAME     = "meetings_app_test" //os.Getenv("DB_NAME")
	)
	a := App{}
	a.init(DB_USER, DB_NAME)

	mr := a.GetMeeting(1)
	assert.NotEqual(t, mr, nil, "nil meeting 1")
	m1 := mr.Meeting
	assert.EqualValues(t, m1.Id, 1, "meeting id unset")
	assert.EqualValues(t, m1.Title, "kokous1", "meeting Title")
	assert.EqualValues(t, m1.Descr, "blahblahblah", "meeting Descr")
	assert.EqualValues(t, len(mr.User_availab), 3, "meeting 1 should have 3 users")

	mr2 := a.GetMeeting(2)
	m2 := mr2.Meeting
	assert.EqualValues(t, m2.Id, 2, "meeting id unset")
	assert.EqualValues(t, len(mr2.User_availab), 1, "meeting 2 should have 1 user")

	mr3 := a.GetMeeting(3)
	m3 := mr3.Meeting
	assert.EqualValues(t, m3.Id, 3, "meeting id unset")
	assert.EqualValues(t, len(mr3.User_availab), 0, "meeting 3 should have no users")

	now := time.Now()
	nows := now.Format(time.RFC3339)
	then := now.Add(time.Hour)
	thens := then.Format(time.RFC3339)
	i := a.CreateMeeting("newmeeting", "desc", nows, thens)

	mr = a.GetMeeting(i)
	m := mr.Meeting
	assert.NotEqual(t, mr, nil, "new meeting is nil")
	assert.EqualValues(t, m.Id, i, "new meeting id inequal")
	assert.EqualValues(t, m.Title, "newmeeting", "new meeting Title")
	assert.EqualValues(t, m.Descr, "desc", "new meeting Descr")
	//assert.EqualValues(t, m.Ts_from, now, "new meeting Ts_from")
	//assert.EqualValues(t, m.Ts_to, then, "new meeting Ts_to")

	try_meeting(t, &a, "/m/1", 3, "testuser")
	try_meeting(t, &a, "/m/2", 1, "testuser")
	try_meeting(t, &a, "/m/3", 0, "")
	try_meeting(t, &a, fmt.Sprintf("/m/%d", i), 0, "")
}

