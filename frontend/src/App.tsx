// vim: set syntax=javascript :
import React from 'react';
import './App.css';
import { FRONTEND, BACKEND } from './config';
import * as U from './util';
import { SetStringFn, SetDateFn, SetBooleanFn, SetNumberFn } from './util';
import { UserAvailab, UserAvailabT } from './timeslots';
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

const howto = `
Click on the calendar to start selecting a time interval.
Move the cursor somewhere else and click again to paint the selected times.
They will be painted as "available" if the last clicked time is after the initially clicked time.
They will be painted as "unavailable" if the last clicked time is before the initially clicked time.
`;

function uat_to_li(t: UserAvailabT):JSX.Element {
	return (
	<li key={t.from.toISOString()} className="item">
		<span>{U.DDMM(t.from)} </span>
		<span>{U.day_title(t.from)} </span>
		<span>{U.HHMM(t.from)}</span> .. <span> {U.HHMM(t.to)}</span>
	</li>
	);
}

function set_title(id?:number, title?:string) {
	let t = "Meeting timetable" + (!title ? "" : ": " + title);
	if (t !== document.title) {
		document.title = t;
	}
}

function WysiwygLink({url}:{url:string}):JSX.Element {
	return <a href={url}>{url}</a>;
}

function get_saved_user():string|undefined {
	return localStorage.getItem('username') || undefined;
}

function set_saved_user(x:string) {
	localStorage.setItem('username', x);
}

function is_valid_username(x:string):[boolean,string] {
	const lmin = 2;
	const lmax = 28;
	let ok = true;
	let reason = "";
	let xt = x?.trim();
	if (!x || xt.length < lmin) {
		ok = false;
		reason = `It should have at least ${lmin} character${lmin>1?"s":""}`;
	} else if (xt.length > lmax) {
		ok = false;
		reason = `It should have at most ${lmax} characters`;
	}
	return [ok, reason];
}

function LoginScreen({user,setUser}:{user?:string, setUser:SetStringFn}):JSX.Element {
	return (
	<div className="username-wrap">
		<p>Choose a username</p>
		<div>
			<Textfield
				key="username in login screen"
				text={user}
				setText={setUser}
				edit={true}
				canEdit={true}
				setEdit={(x:boolean) => true}
				label="Username"
				maxlen={28}
				validate={is_valid_username}
				/>
		</div>
		<p>This will be remembered in local storage</p>
	</div>
	);
}

function ERrorScreeN():JSX.Element {
	return (
	<div>
		<h1>Whoopsy daisies</h1>
		<p>Meeting does not exist</p>
		<p>Try hacking the URL bar content into a valid address</p>
		<p>Or maybe create a <a href={FRONTEND}>new meeting</a>?</p>
	</div>
	);
}

function CalendarWidget({me_id}:{me_id:number}):JSX.Element {
	const debug_mode = check_debug_mode();

	const INIT = "INIT";
	const VIEW = "VIEW";
	const EDIT_NAME = "EDIT_NAME";
	const EDIT_TIME = "EDIT_TIME";
	const SEND_TIME = "40";

	let [state, setState] = React.useState<string>(INIT);

	let [user,setUser1] = React.useState<string|undefined>(get_saved_user());
	const no_user:boolean = user === undefined || user.length < 1;
	function setUser(x: string) {
		if (x !== undefined) {
			user = x = x.trim();
			setUser1(x);
			set_saved_user(x);
		}
	}

	let [cursor,setCursor1] = React.useState<Date>(new Date());
	let [hoverX,setHoverX] = React.useState<HoverAt>({i:-1,x:0,y:0,a:0,b:0,ok:false});

	let [mtime,set_mtime] = React.useState<Date>(new Date('2020'));
	let [me,setMe] = React.useState<MeetingData|undefined>(undefined);
	let [pollnr,setPollnr] = React.useState<number>(0);

	let [statusMsg,setStatusMsg] = React.useState<string>("");
	let setErr = (x:string) => setStatusMsg('['+U.HHMMSS(new Date())+'] '+x);
	let setOk = setErr;

	let [no_meeting,set_no_meeting] = React.useState<boolean>(false);
	if (!no_meeting && statusMsg.indexOf("meeting does not exist") >= 0) {
		set_no_meeting(no_meeting = true);
	}

	// print meeting whenever it is updated
	React.useEffect(() => me?.print(), [me]);

	set_title(me_id, me?.meeting?.title);

	let poll_me = () => {
		const a = async () => {
			if (state == EDIT_TIME) {
				return;
			}
			let md = await A.fetch_meeting(me_id, setErr);
			if (md!==undefined) {
				const new_mtime = md.meeting.mtime;
				if (state == INIT || new_mtime > mtime) {
					if (state == INIT) {
						setState(VIEW);
					}
					set_mtime(new_mtime);
					setMe(md);
					me = md;
					resetTsCache();
					setOk('updated meeting data');
				} else {
					if (new_mtime.toISOString() == mtime.toISOString()) {
						setOk('already up to date');
					} else {
						console.log('ignoring obsolete meeting data', new_mtime, 'vs current', mtime);
					}
				}
				set_no_meeting(false);
			}
		};
		a();

		// periodic auto fetch
		setTimeout(() => setPollnr(pollnr + 1), 10000);
	};

	// fetch new data whenever pollnr is incremented setPollnr(pollnr + 1);
	React.useEffect(poll_me, [pollnr]);

	// have one TimeslotTable for each week.
	let [tsCache,setTsCache] = React.useState(new Map<string,TimeslotTable>());
	const week_start = U.monday(cursor);
	const week_id = week_start.toISOString();
	let setTs = (t: TimeslotTable) => {
		tsCache.set(week_id, t);
		setTsCache(tsCache);
	};

	function ts_init(old?: TimeslotTable): TimeslotTable {
		if (old) return old;
		let t = new TimeslotTable(week_start);
		setTs(t);
		return t;
	}
	let ts = ts_init(tsCache.get(week_id));
	let [tsDirty,setTsDirty] = React.useState(false);

	// used while in edit mode. timeslot grid cells converted to ranges
	let uat:UserAvailabT[] = [];
	// discrete timeslots -> list of start/stop ranges
	for(const t of tsCache.values()) {
		uat = uat.concat(t.to_intervals());
	}
	uat = uat.sort((a:UserAvailabT,b:UserAvailabT) => a.from.valueOf() - b.from.valueOf());

	let [inspectCells,setInspectCells] = React.useState([-1,-1]);
	let inspected_users:string[] = [];

	// used while not in edit mode. each users name and status inserted into each grid cell
	let ts2 = new TimeslotTable2(week_start);
	if (state != EDIT_TIME) {
		if (me) {
			ts2.from_meeting(me);
			inspected_users = ts2.enum_users_range(inspectCells[0], inspectCells[1], 1);
		}
	}

	function setCursor(x:Date) {
		setInspectCells([-1,-1]);
		setCursor1(x);
	}

	// i: currently hovered index
 	// (a,b): range of painted cells (while editing)
	function TooltipContent():JSX.Element {
		const i = hoverX.i;
		const edit = state == EDIT_TIME;
		return (<div className="tooltip-content">
			<div className="title">{U.hour_of_timeslot(i)} - {U.hour_of_timeslot(i+1)}</div>
			{edit ? undefined : <div>
				Users: {ts2.num_users(i)}
				{ts2.enum_users_ul(i)}
			</div>}
		</div>);
	}


	function resetTsCache() {
		setTsDirty(false);
		let temp = new Map<string,TimeslotTable>();
		if (me !== undefined && user !== undefined) {
			// convert current users's time ranges into timeslots for each week
			for(const w of me.active_weeks_of_user(user)) {
				temp.set(w, me.gtstoufw(user, new Date(w)));
			}
		}
		setTsCache(temp);
	}

	function beginEdit() {
		resetTsCache();
		setState(EDIT_TIME);
		console.log("begin editing");
	}

	function endEdit() {
		setState(INIT);
		if (tsDirty) {
			setTsDirty(false);
			console.log("end editing and submit changes");

			if (user !== undefined)
			A.update_meeting_t({meeting: me_id, username: user, T: uat}, setErr)
			.then((md:MeetingData) => {
				if (md !== undefined) {
					setMe(md);
					setOk('updated meeting data w/ our my edits');
				}
				setState(VIEW);
			});
		} else {
			console.log("end editing, no changes");
		}
	}

	function cancelEdit() {
		console.log("cancel editing, dirty:", tsDirty);
		setState(VIEW);
		setTsDirty(false);
	}

	const app_rect_1 = document.getElementById('CalendarRoot')?.getBoundingClientRect();
	const app_rect = {
		left: app_rect_1?.left || 0,
		top: app_rect_1?.top || 0,
	};

	const the_big_thing = (
		<div className={(state == INIT ? " init":"")} id="CalendarRoot">
			<div className="status-msg">{statusMsg}</div>

			<nav>
				<ul>
					<li>
						<span>Create a <a href={FRONTEND}>new meeting</a></span>
					</li>
					<li>
						<Textfield
							key="username inside calendar-main"
							text={user}
							setText={setUser}
							label={"Username"} maxlen={28}
							canEdit={state == VIEW}
							edit={state == EDIT_NAME}
							setEdit={(b:boolean) => {
								setState(b ? EDIT_NAME : VIEW);
								if (b) setInspectCells([-1,-1]);
							}}
							validate={is_valid_username} />
					</li>

					{!debug_mode ? undefined : <li>State = {state}</li>}
					{!debug_mode ? undefined :
					<li>
						<button
							onClick={ (e) => {
								console.log('state:', state);
								console.log('pollnr:', pollnr);
								console.log('dirty:', tsDirty);
								console.log('ts2:', ts2);
								me?.print();
							}}
							>Debug print</button>
					</li>}
				</ul>
			</nav>

			<div style={{clear:"both"}} />

			{state != INIT ? undefined :
				<div className="loading-overlay">
					<div>
						<h1>Loading...</h1>
						<p className="status-msg">{statusMsg}</p>
					</div>
				</div>
			}

			<div className="tooltip"
				style={{
					display: (state == INIT || !hoverX.ok) ? "none" : "block",
					position: "absolute",
					left: hoverX.x - app_rect.left,
					top: hoverX.y - app_rect.top,
				}}>
				{TooltipContent()}
			</div>

			<div className="columns-container">

				<aside className="flexcolumn calendar-buttons-panel">
					{
					state == EDIT_TIME || inspectCells[0]<0 ?
						<div className="time-interval-list">
							<div className="title">{uat.length > 0 ? "I'm available on" : howto}</div>
							<ul className="userTimeList">{uat.map(uat_to_li)}</ul>
						</div>
					:
						<div className="time-interval-list">
							<div className="title">
								{inspected_users.length}
								<span> users within </span>
								{U.hour_of_timeslot(inspectCells[0])} - {U.hour_of_timeslot(inspectCells[1]+1)}
							</div>
							<ul className="inline-list">
							{inspected_users.map((name) => <li key={name}>{name}</li>)}
							</ul>
							<div className="alright">
								<button onClick={(e) => setInspectCells([-1,-1])}>Ok whatever</button>
							</div>
						</div>
					}

					<div className="button-group">
						<button
							className="edit-calendar"
							onClick={(e) => {
								if (state == EDIT_TIME) {
									endEdit();
								} else {
									beginEdit();
								}
							}}
							disabled={(state != EDIT_TIME && state != VIEW)
								|| (state == EDIT_TIME && !tsDirty) }
							>
							{[
								"Start editing my timetable",
								"Save",
							][state == EDIT_TIME ? 1:0]}
						</button>

						{state != EDIT_TIME ? undefined : <button
							className="discard"
							onClick={(e) => {
								if (state == EDIT_TIME) {
									cancelEdit();
								}
							}}
							>{"Discard changes"}
						</button>}

						<div className="button-group alright">
							<button
								className="clear-timetable"
								onClick={(e) => {
									setTsCache(new Map<string,TimeslotTable>());
									setTsDirty(true);
								}}
								disabled={state != EDIT_TIME || uat.length == 0}
								> Clear my timetable </button>
							<button
								className="reset-timetable"
								onClick={(e) => resetTsCache()}
								disabled={state != EDIT_TIME || !tsDirty}
								> Undo </button>
						</div>
					</div>
				</aside>

				<div className="flexcolumn calendar-main">
					{WeekNavButs({cursor:cursor,setCursor:setCursor,dis:!(state==VIEW || state==EDIT_TIME)})}

					{Hourgrid({cursor:cursor,edit:(state == EDIT_TIME),
						paint_cells:
							(state == EDIT_TIME || state == VIEW)
							? (from:number,to:number,color:number) => {
								if (state == EDIT_TIME) {
									setTs(ts.paint(from, to, color));
									setTsDirty(true);
								} else if (state == VIEW) {
									setInspectCells([from, to]);
								}
							}
							: undefined,
						cell_class:
							state == EDIT_TIME
							? ((i:number) => "color" + ts.ts[i])
							: ((i:number) => {
								return "color" + Math.min(ts2.num_users(i),5)
									+ ( i >= inspectCells[0] && i <= inspectCells[1] ? " inspect" : "");
							}),
						hover_at: setHoverX,
					})}
				</div>

				{!me ? undefined : 
					<div className="flexcolumn meeting-info">
						<h1>{me?.meeting?.title}</h1>
						<p>{me?.meeting?.descr}</p>
						<div>Link to this meeting
							<WysiwygLink url={U.get_meeting_url(me?.meeting?.id)} />
						</div>
						<div>Last modification: {mtime.toISOString()}</div>
					</div>
				}
			</div>
		</div>
	);

	const the_small_thing = <LoginScreen user={user} setUser={setUser} /> ;
	return no_meeting ? <ERrorScreeN /> : (no_user ? the_small_thing : the_big_thing);
}

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
			set_title(id,"");
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
