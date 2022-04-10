package main

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"time"
)

func TestMain(t *testing.T) {
	const (
    	 DB_USER     = "postgres" // os.Getenv("DB_USER")
    	 DB_NAME     = "meetings_app_test" //os.Getenv("DB_NAME")
	)
	a := App{}
	a.init(DB_USER, DB_NAME)

	mr := a.GetMeeting(1)
	assert.NotEqual(t, mr, nil, "nil meeting 1")
	m1 := mr.meeting
	assert.EqualValues(t, m1.id, 1, "meeting id unset")
	assert.EqualValues(t, m1.title, "kokous1", "meeting title")
	assert.EqualValues(t, m1.descr, "blahblahblah", "meeting descr")
	assert.EqualValues(t, len(mr.user_availab), 3, "meeting 1 should have 3 users")

	mr2 := a.GetMeeting(2)
	m2 := mr2.meeting
	assert.EqualValues(t, m2.id, 2, "meeting id unset")
	assert.EqualValues(t, len(mr2.user_availab), 1, "meeting 2 should have 1 user")

	mr3 := a.GetMeeting(3)
	m3 := mr3.meeting
	assert.EqualValues(t, m3.id, 3, "meeting id unset")
	assert.EqualValues(t, len(mr3.user_availab), 0, "meeting 3 should have no users")

	now := time.Now()
	nows := now.Format(time.RFC3339)
	then := now.Add(time.Hour)
	thens := then.Format(time.RFC3339)
	i := a.CreateMeeting("newmeeting", "desc", nows, thens)

	mr = a.GetMeeting(i)
	m := mr.meeting
	assert.NotEqual(t, mr, nil, "new meeting is nil")
	assert.EqualValues(t, m.id, i, "new meeting id inequal")
	assert.EqualValues(t, m.title, "newmeeting", "new meeting title")
	assert.EqualValues(t, m.descr, "desc", "new meeting descr")
	//assert.EqualValues(t, m.ts_from, now, "new meeting ts_from")
	//assert.EqualValues(t, m.ts_to, then, "new meeting ts_to")
}

