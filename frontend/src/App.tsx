// vim: set syntax=javascript :
import React from 'react';
import './App.css';
import * as U from './util';
import { check_debug_mode } from './util';
import NewMeetingDialog from './components/NewMeetingDialog';
import CalendarWidget from './components/CalendarWidget';

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
