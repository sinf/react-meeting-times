// vim: set syntax=javascript :
import React from 'react';
import './App.css';
import { FRONTEND, BACKEND } from './config';
import * as U from './util';
import { UserAvailab, UserAvailabT, uat_to_li } from './timeslots';
import { Meeting, MeetingResponse } from './types';
import { check_debug_mode } from './util';
import TimeslotTable from './TimeslotTable';
import MeetingData from './MeetingData';
import TimeslotTable2 from './TimeslotTable2';
import { HoverAt, Hourgrid } from './Hourgrid';
import * as A from './agent';
import {Textfield, Textfield2, TextfieldProps} from './components/Textfield';
import NewMeetingDialog from './components/NewMeetingDialog';
import WeekNavButs from './components/WeekNavButs';
import ToggleBut from './components/ToggleBut';
import LoginScreen from './components/LoginScreen';
import CalendarWidget from './components/CalendarWidget';
import {get_saved_user, set_saved_user, is_valid_username} from './user';

function MeetingPageN({id}:{id:number}):JSX.Element {
	// unique key causes useState()s to be forgotten when navigating to new meeting
	return <CalendarWidget key={id} me_id={id} />;
}

function App(props:any):JSX.Element {
	let [id, setid] = React.useState<number>(-1);
	let p = window?.location?.search?.match(/[?&]meeting=([0-9]+)/);

	console.log(p);

	React.useEffect(() => {
		if (id < 0) {
			U.set_title(id,"");
		}
	}, [id]);

	if (p && p.length == 2 && /^\d+$/.test(p[1])) {
		const i = U.decode_meeting_id(parseInt(p[1]));
		if (i != id) {
			console.log('looks like you have id in a url parameter', p[1]);
			setid(id = i);
		}
	}

	return (
		<main className={"App" + (check_debug_mode() ? " debug" : "")}>
			{id < 0 ?
				<NewMeetingDialog setid={(x:number) => {
					setid(x);
					window.history.pushState("","","/"+U.get_meeting_path(x));
				}} />
			:
				<MeetingPageN id={id} />
			}
		</main>
	);
}

export default App;
