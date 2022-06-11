// vim: set syntax=javascript :
import React from 'react';
import './App.css';
import './config';
import './types';
import './util';
import './timeslots';
import TimeslotTable from './TimeslotTable';
import MeetingData from './MeetingData';
import TimeslotTable2 from './TimeslotTable2';

async function get_body(x:Response,setErr:SetStringFn):Promise<string> {
	let body = x.text();
	if (!x.ok) {
		let t = "got non-OK response: " + await body;
		setErr(t);
		throw new Error(t);
	}
	return body;
}

function get_newly_created_meeting(x:string,setErr:SetStringFn):MeetingData {
	const j:Meeting = JSON.parse(x);
	let me = new MeetingData(j.id);
	me.meeting = unfuck_dates(j);
	return me;
}

async function create_meeting(m:Meeting, setErr:SetStringFn):Promise<MeetingData> {
	const u = make_backend_url('create');
	const b = JSON.stringify(m);
	console.log("try to create meeting", u);
	console.log(b);
	setErr('requested creation of new meeting');
	let r = await debug_fetch(u, {method:'POST', body: b});
	let body = await get_body(r, setErr);
	return get_newly_created_meeting(body, setErr);
}

function parsulate_json_meeting_get_respose_function_thingy_123(body:string,setErr:SetStringFn):MeetingData {
	const j:MeetingResponse = JSON.parse(body);
	let me = new MeetingData(j.meeting.id);
	me.eat(j);
	return me;
}

async function fetch_meeting(meeting_id:number, setErr:SetStringFn):Promise<MeetingData|undefined> {
	let u = make_backend_url('meeting/' + meeting_id);
	console.log("start fetching meeting", u);
	setErr('requested data');
	try {
		let r = await debug_fetch(u);
		let b = await get_body(r, setErr);
		return parsulate_json_meeting_get_respose_function_thingy_123(b,setErr);
	} catch(err) {
		console.log('oopsy w/ meeting', meeting_id+':\n', err);
		setErr('request failed: ??');// + err.message);
		return undefined;
	}
}

async function update_meeting_t(ua:UserAvailab, setErr:SetStringFn):Promise<MeetingData> {
	const id = ua.meeting;
	const u = make_backend_url('update');
	const b = JSON.stringify(ua);

	console.log("update meeting", u, 'id:', id, "user:", ua.username, "rows:", ua.T.length);
	setErr('push update');

	let r = await debug_fetch(u, {method:'POST', body: b});
	let body = await get_body(r, setErr);
	return parsulate_json_meeting_get_respose_function_thingy_123(body, setErr);
//		.catch(err => console.log('oopsy w/ meeting', id+':\n', err));
}

interface HoverAt {
	i: number; // hovered cell
	x: number; // cursor x coord
	y: number; // cursor y coord
	a?: number; // first cell
	b?: number; // last cell
	ok: boolean;
}

const Hourgrid = (
{cursor,paint_cells,edit,hover_at,cell_class}
:{
	cursor:Date,
	paint_cells?:(from:number, to:number, direction:number) => void,
	edit:boolean,
	hover_at:(h:HoverAt) => void,
	cell_class:(cell:number) => string
}
) => {
	const day_start:Date[] = get_week_days(cursor);
	const today = new Date();
	let [dragA,setDragA] = React.useState<number|undefined>(undefined);
	let [dragB,setDragB] = React.useState<number|undefined>(undefined);
	const dragMin:number = Math.min(dragA||-1,dragB||-1);
	const dragMax:number = Math.max(dragA||-1,dragB||-1);

	function render_hour_label(h:number, k:string):JSX.Element {
		return <td key={k} className="hourlabel">{h/TIMESLOTS_HOUR}</td>;
	}
	function begin_drag(i:number) {
		setDragA(i);
		setDragB(i);
	}
	function update_drag(i:number) {
		if (dragA !== undefined) {
			setDragB(i);
		}
	}
	function end_drag(i:number) {
		if (dragA !== undefined && dragB !== undefined && paint_cells) {
			paint_cells(dragMin, dragMax, dragA == dragB ? -1 : (dragA < dragB ? 1 : 0));
		}
		setDragA(undefined);
		setDragB(undefined);
	}

	let rows = [];
	for(let h=FIRST_VISIBLE_TIMESLOT; h<TIMESLOTS_DAY; h+=TIMESLOTS_HOUR) {
		let row = [];
		for(let d=0; d<7; ++d) {
			let hour_block = [];
			for(let f=0; f<TIMESLOTS_HOUR; ++f) {
				const i = d * TIMESLOTS_DAY + h + f;
				const being_painted = dragMin <= i && dragMax >= i;
				hour_block.push(
					<div key={i}
						className={"timeslot"
							+ (being_painted ? " paint" : "")
							+ (edit ? " edit" : " view")
							+ " " + cell_class(i)
						}
						onClick={(e) => {
							if (paint_cells && e.button === 0) {
								if (dragA === undefined) {
									begin_drag(i);
								} else {
									end_drag(i);
								}
							}
							if (hover_at) {
								hover_at({i:i, x:e.clientX, y:e.clientY, a:dragA, b:dragB, ok:true});
							}
						}}
						onMouseMove={(e) => {
							if (paint_cells) update_drag(i);
							if (hover_at) hover_at({i:i, x:e.clientX, y:e.clientY, a:dragA, b:dragB, ok:true});
						}}
						>
						<div className="hl"/>
					</div>
				);
			}
			row.push(<td key={d} data-today={same_day(day_start[d], today)}>{hour_block}</td>);
		}
		rows.push(
			<tr key={"row"+h}>
				{render_hour_label(h, "hourLabelL")}
				{row}
				{render_hour_label(h, "hourLabelR")}
			</tr>
		);
	}

	return (
		<table className="calendar"
			onMouseLeave={(e) => {
				if (hover_at) hover_at({i:-1,x:0,y:0,a:0,b:0,ok:false});
				if (true) {
					// interrupt drag. annoying when operating near table edge
					// but easy fix to issues when user clicks some button while dragging
					setDragA(undefined);
					setDragB(undefined);
				}
			}}>
			<thead>
				<tr>
					<th key="headHourLabelL" className="hourlabel header"></th>
					{
						day_start.map((d) =>
							<th
								key={d.toISOString()}
								data-today={same_day(d, today)}
								className="day"
							>{day_title_tag(d)}</th>)
					}
					<th key="headHourLabelR" className="hourlabel header"></th>
				</tr>
			</thead>
			<tbody>{ rows }</tbody>
		</table>
	);
};

const WeekNavButs = (
{cursor,setCursor,dis}:{cursor:Date,setCursor:SetDateFn,dis:boolean}
) => {
	return (
   <div className="weekNav button-group">
		<div className="weekNr">
			Week {week_nr(cursor)} of {cursor.getFullYear()}
		</div>
		<button
			onClick={(e) => setCursor(add_days(cursor, -7))}
			disabled={dis}
			>&lt;- Go that way</button>
		<button
			onClick={(e) => setCursor(new Date())}
			disabled={dis}
			>Go to present</button>
		<button
			onClick={(e) => setCursor(add_days(cursor, 7))}
			disabled={dis}
			>Go this way -&gt;</button>
	</div>
	);
}

interface TextfieldProps {
	text?: string;
	setText: SetStringFn;
	label: string;
	maxlen: number;
	canEdit: boolean;
	edit: boolean;
	setEdit: SetBooleanFn;
	validate: (x:string) => [boolean,string];
}
function Textfield({text,setText,label,maxlen,canEdit,edit,setEdit,validate}:TextfieldProps):JSX.Element {
	let [buf1,setBuf] = React.useState<string|undefined>(undefined);
	let buf:string = buf1 || text || "";
	let id = "textfield-" + label.replace(' ','-');

	if (edit) {
		let [valid,explanation] = validate ? validate(buf) : [true,""];
		return (<span className="textfield">
    		<label htmlFor={id}>{label}: </label>
    		<input
    			id={id} name={id} type="text"
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen} />
			<span> </span>
    		<button
    			onClick={(e) => {
    				setText(buf);
    				setEdit(false);
    			}}
    			disabled={!valid}
    			>Enter</button>
    		<p>{explanation}</p>
		</span>);
	} else {
		return (<span className="textfield">
			<label>{label}: </label>
			<span id={id}>{text}</span>
			<span> </span>
			<button
				onClick={(e) => {
					setBuf(text);
					setEdit(true);
				}}
				disabled={!canEdit}
				>Edit</button>
		</span>);
	}
}

function Textfield2({buf,setBuf,label,maxlen,rows,cols,dis}:
	{buf:string,setBuf:SetStringFn,label:string,maxlen:number,rows:number,cols:number,dis:boolean}
):JSX.Element {
	let id = "textfield2-" + label;
	return <div className="textfield">
    	<label htmlFor={id}>{label}: </label><br/>
    	{rows == 1 ?
    		<input
    			type="text"
    			id={id}
    			name={id}
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen}
    			disabled={dis} />
    	:
    		<textarea
    			id={id}
    			name={id}
    			rows={rows}
    			cols={cols}
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen}
    			disabled={dis} />
    	}
	</div>;
}

function ToggleBut({state,setState,label,canToggle}:
	{state:boolean,setState:SetBooleanFn,label:string,canToggle:boolean}
):JSX.Element {
	return (
		<button
			onClick={(e:any) => setState(!state)}
			disabled={!canToggle}>{label[state ? 1 : 0]}</button>
	);
}

const howto = `
Click on the calendar to start selecting a time interval.
Move the cursor somewhere else and click again to paint the selected times.
They will be painted as "available" if the last clicked time is after the initially clicked time.
They will be painted as "unavailable" if the last clicked time is before the initially clicked time.
`;

function uat_to_li(t: UserAvailabT):JSX.Element {
	return (
	<li key={t.from.toISOString()} className="item">
		<span>{DDMM(t.from)} </span>
		<span>{day_title(t.from)} </span>
		<span>{HHMM(t.from)}</span> .. <span> {HHMM(t.to)}</span>
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
	let setErr = (x:string) => setStatusMsg('['+HHMMSS(new Date())+'] '+x);
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
			let md = await fetch_meeting(me_id, setErr);
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
	const week_start = monday(cursor);
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
			<div className="title">{hour_of_timeslot(i)} - {hour_of_timeslot(i+1)}</div>
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
			update_meeting_t({meeting: me_id, username: user, T: uat}, setErr)
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
								{hour_of_timeslot(inspectCells[0])} - {hour_of_timeslot(inspectCells[1]+1)}
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
							? (from,to,color) => {
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
							<WysiwygLink url={get_meeting_url(me?.meeting?.id)} />
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

function NewMeetingDialog({setid}:{setid:SetNumberFn}):JSX.Element {
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
				let end = add_days(now, 90);
				let me:Meeting = {
					title: ti,
					descr: de,
					from: now,
					to: end,
					id: -1,
					mtime: now
				};
				create_meeting(me, setErr)
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
		const i = decode_meeting_id(parseInt(p[1]));
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
					window.history.pushState("","","/"+get_meeting_path(x));
				}} />
			:
				<MeetingPageN id={id} />
			}
		</main>
	);
}

export default App;
