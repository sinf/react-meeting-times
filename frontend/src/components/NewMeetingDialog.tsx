import React from 'react';
import * as A from '../agent';
import * as U from '../util';
import * as T from '../types';
import MeetingData from '../MeetingData';
import { Textfield2 } from './Textfield';

export default
function NewMeetingDialog({setid}:{setid:U.SetNumberFn}):JSX.Element {
	let [ti,setTi] = React.useState("Our stupid meeting");
	let [de,setDe] = React.useState("");
	let [sent,setSent] = React.useState(false);
	let [err,setErr] = React.useState("");
	const dis = sent;
	return <div className="new-meeting-form">
		<h1>You&lsquo;re about to create a meeting</h1>
		<p>Please describe your meeting briefly. Choose your words wisely because they can&lsquo;t be changed later</p>
		<Textfield2 buf={ti} setBuf={setTi} label="Title" maxlen={80} rows={1} cols={60} dis={dis} />
		<Textfield2 buf={de} setBuf={setDe} label="Description" maxlen={640} rows={10} cols={60} dis={dis} />
		<br/>
		<button
			disabled={dis}
			//onClick={(e) => alert("Nothing happened!")}
			>Don&lsquo;t create meeting</button>
		<button
			onClick={(e) => {
				setSent(true);

				let now = new Date();
				let end = U.add_days(now, 90);
				let me:T.Meeting = {
					title: ti,
					descr: de,
					from: now,
					to: end,
					id: -1,
					mtime: now
				};
				A.create_meeting(me, setErr)
					.then((md:MeetingData) => setid(md.meeting.id))
					.catch((err:any) => {
						setSent(false);
						console.log('oopsy when creating meeting', err);
					});
			}}
			disabled={dis}
			>Create meeting</button>
		{!sent ? undefined :
			<p>
				Requested to create a new meeting. Please wait while the server is mucking about.
				You will be transferred to the meeting calendar hopefully soon
			</p>
		}
		{!err? undefined : <p>Error: {err}</p> }
	</div>;
}

