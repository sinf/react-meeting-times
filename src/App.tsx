// vim: set syntax=javascript :
import React from 'react';
import './App.css';

const TIMESLOTS_HOUR = 2;
const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
const TIMESLOTS_WEEK = 7*TIMESLOTS_DAY;
const TIMESLOT_DURATION_MIN = 60/TIMESLOTS_HOUR;
const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

const BACKEND = 'http://localhost:9080/';
const FRONTEND = 'http://localhost:3000/';

type SetNumberFn = (x: number) => any;
type SetStringFn = (x: string) => any;
type SetBooleanFn = (x: boolean) => any;
type SetDateFn = (x: Date) => any;

function make_backend_url(endpoint:string):string { return BACKEND + endpoint; }
function encode_meeting_id(i:number):number { return i; }
function decode_meeting_id(i:number):number { return i; }
function get_meeting_path(id:number):string { return encode_meeting_id(id).toString(); }
function get_meeting_url(id:number):string { return FRONTEND + get_meeting_path(id); }

interface CalendarProps {
	t_initial: Date;
	username?: string;
}

interface UserAvailabT {
	status: number;
	from: Date;
	to: Date;
}

interface UserAvailab {
	meeting: number;
	username: string;
	T: UserAvailabT[];
}

interface CalendarState {
	t_cursor:Date;
	t: Date[];
	editmode: boolean;
	timeslots: number[]; // availability status for the whole week
	tv: UserAvailab[];
	users: string[][]; // list of users for each timeslot
	drag_from?: number;
	drag_to?: number;
	dirty: boolean;
}

interface Meeting {
	id: number;
	title: string;
	descr: string;
	from: Date;
	to: Date;
	mtime: Date;
}

interface MeetingResponse {
	meeting: Meeting;
	users: UserAvailab[];
}

function unfuck_dates(m: Meeting):Meeting {
	return {...m,
		from:new Date(m.from), // must convert string->date because typescript types are LIES
		to:new Date(m.to),
		mtime:new Date(m.mtime),
	};
}

function check_debug_mode():boolean {
	return window?.location?.search?.indexOf("debug") >= 0;
}

function debug_fetch(url:string, stuff_and_crap:any = {}):Promise<Response> {
	if (!check_debug_mode()) {
		return fetch(url, stuff_and_crap);
	}
	// simulate lots of latency
	const d = 5000;
	return new Promise<Response>((ok,fail) =>
		setTimeout((() => fetch(url, stuff_and_crap).then(ok).catch(fail)), d)
	);
}

class MeetingData {
	meeting: Meeting;
	users: Map<string, UserAvailabT[]>;

	constructor(id: number) {
		let t0 = monday(new Date());
		this.meeting = {
			id: id,
			title: "example",
			descr: "pls pick times on weekend",
			from: add_days(t0, -14),
			to: add_days(t0, 21),
			mtime: new Date(),
		};
		this.users = new Map<string, UserAvailabT[]>();
	}

	active_weeks_of_user(user: string): string[] {
		let w = new Set<string>();
		if (this.users?.has(user)) {
			let uu:UserAvailabT[] = this.users.get(user) || [];
			for(const tv of uu) {
				w.add(monday(tv.from).toISOString());
			}
		}
		return Array.from(w.values());
	}

	// get timeslot table of user for week
	gtstoufw(user: string, from:Date): TimeslotTable {
		let tab:TimeslotTable = new TimeslotTable(from);
		if (this.users.has(user)) {
			tab.from_intervals(this.users.get(user) || []);
		} else {
			console.log('user not found', user);
		}
		return tab;
	}

	copy():MeetingData {
		let m = new MeetingData(this.meeting.id);
		m.meeting = this.meeting;
		m.users = new Map<string, UserAvailabT[]>(this.users);
		return m;
	}

	get_ua():UserAvailab[] {
		let ua:UserAvailab[] = [];
		for(const [name, t] of this.users) {
			ua.push({
				meeting: this.meeting.id,
				username: name,
				T: t,
			});
		}
		return ua;
	}

	print() {
		console.log("Meeting", this.meeting.id, 'with', this.users.size, 'users, mtime:', this.meeting.mtime);
		for(const [name, t] of this.users) {
			console.log("Available times for user", name);
			print_intervals(t);
			console.log();
		}
		console.log('mtime', this.meeting.mtime);
		console.log();
	}

	eat(m: MeetingResponse) {
		this.meeting = unfuck_dates(m.meeting);
		this.users = new Map<string, UserAvailabT[]>();
		if (m.users) {
			for(const ua of m.users) {
				this.users.set(ua.username, ua.T.map((x) => {
					return {...x, from: new Date(x.from), to: new Date(x.to)};
				}));
			}
		} else {
			console.log('MeetingResponse has no users :(');
		}
	}
}

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

function day_title(da: Date):string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][da.getDay()];
}

function DDMM(da: Date):string {
	let mm = 1 + da.getMonth();
	let dd = da.getDate();
	return `${dd}.${mm}.`;
}

function day_title_tag(da: Date):JSX.Element {
	let wd = day_title(da);
	return (<div>
		<div>{wd} </div>
		<div>{DDMM(da)}</div>
	</div>);
}

function padzero2(x:number):string {
	let xs = x.toString();
	return x < 10 ? "0" + xs : xs;
}

function HHMM_1(h:number, m:number):string {
	return `${padzero2(h)}:${padzero2(m)}`;
}

function HHMM(da: Date):string {
	return HHMM_1(da.getHours(), da.getMinutes());
}

function HHMMSS(da: Date):string {
	return HHMM(da) + ':' + padzero2(da.getSeconds());
}

function monday(t: Date): Date {
	t = new Date(t);
	t.setDate(t.getDate() + [-6,0,-1,-2,-3,-4,-5][t.getDay()]);
	t.setHours(0,0,0,0);
	return t;
}

function add_days(t: Date, n: number): Date {
	t = new Date(t);
	t.setDate(t.getDate() + n);
	return t;
}

function same_day(a: Date, b: Date): boolean {
	return a.getFullYear() == b.getFullYear()
		&& a.getMonth() == b.getMonth()
		&& a.getDate() == b.getDate();
}

function week_nr(date1: Date):number {
    function serial(days:number) { return 86400000*days; }
    function dateserial(year:number,month:number,day:number) { return (new Date(year,month-1,day).valueOf()); }
    function weekday(date:number) { return (new Date(date)).getDay()+1; }
    function yearserial(date:number) { return (new Date(date)).getFullYear(); }
    let date = date1.valueOf(), 
        date2 = dateserial(yearserial(date - serial(weekday(date-serial(1))) + serial(4)),1,3);
    return ~~((date - date2 + serial(weekday(date2) + 5))/ serial(7));
}

function get_week_days(t: Date):Date[] {
	let m = monday(t);
	return [m, add_days(m, 1), add_days(m, 2), add_days(m, 3),
			add_days(m, 4), add_days(m, 5), add_days(m, 6)];
}

function add_min(t: Date, m: number): Date {
	let t1 = new Date(t);
	t1.setMinutes(t.getMinutes() + m);
	return t1;
}

function drop_between_t(uu: UserAvailabT[], from: Date, to:Date): UserAvailabT[] {
	return uu.filter((u) => !(u.from <= to && u.to >= from));
}
function pick_between_t(uu: UserAvailabT[], from: Date, to:Date): UserAvailabT[] {
	return uu.filter((u) => u.from <= to && u.to >= from);
}
function update_range(a: UserAvailabT[], b: UserAvailabT[], from:Date, to:Date): UserAvailabT[] {
	return drop_between_t(a, from, to).concat(b);
}

function timeslots_to_ranges(t_start: Date, timeslots: number[]): UserAvailabT[] {
	let ua : UserAvailabT[] = [];
	let i0 = 0;
	while(i0 < timeslots.length) {
		let i1 = i0;
		while (i1+1 < timeslots.length && timeslots[i1+1] == timeslots[i0]) {
			i1 = i1+1;
		}
		if (timeslots[i0] !== 0) {
			let t0 = add_min(t_start, i0 * TIMESLOT_DURATION_MIN);
			let t1 = add_min(t_start, (i1+1) * TIMESLOT_DURATION_MIN);
			ua.push({status: timeslots[i0], from: t0, to: t1});
		}
		i0 = i1+1;
	}
	return ua;
}

function calc_timeslot(t_start: Date, t: Date) {
	const dur = TIMESLOT_DURATION_MIN * 60 * 1000;
	const dt = t.valueOf() - t_start.valueOf();
	return Math.floor(dt / dur);
}

function ranges_to_timeslots(t_start: Date, timeslots: number[], time_ranges: UserAvailabT[]) {
	for(const t of time_ranges) {
		let i0 = calc_timeslot(t_start, t.from);
		let i1 = calc_timeslot(t_start, t.to);
		i0 = Math.max(i0, 0);
		i1 = Math.min(i1, timeslots.length + 1);
		for(let i=i0; i<i1; ++i) {
			timeslots[i] = t.status;
		}
	}
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

function uat_str(t: UserAvailabT):string {
	const f = t.from;
	return `${DDMM(f)} ${day_title(f)}: ${HHMM(f)} .. ${HHMM(t.to)}  status=${t.status}`;
}

function print_intervals(tv: UserAvailabT[]) {
	for(const t of tv) {
		console.log(uat_str(t));
	}
}

class TimeslotTable {
	start: Date;
	ts: number[];

	constructor(start:Date) {
		this.start = start;
		this.ts = Array(TIMESLOTS_WEEK).fill(0);
	}

	paint(from:number, to:number, color:number) {
		let c = this.copy();
		for(let i=from; i<=to; ++i) {
			c.ts[i] = color<0 ? (this.ts[i] ^ 1) : color;
		}
		return c;
	}

	to_intervals(): UserAvailabT[] {
		// user cant see earliest hours, so blank them out here to prevent unintended availability
		let ts1:number[] = [];
		for(let i=0; i<this.ts.length; ++i) {
			ts1[i] = Math.floor(i % TIMESLOTS_DAY) < FIRST_VISIBLE_TIMESLOT ? 0 : this.ts[i];
		}
		return timeslots_to_ranges(this.start, ts1);
	}

	from_intervals(tv:UserAvailabT[]) {
		ranges_to_timeslots(this.start, this.ts, tv);
	}

	copy():TimeslotTable {
		let t = new TimeslotTable(this.start);
		for(let i=0; i<this.ts.length; ++i) { t.ts[i] = this.ts[i]; }
		return t;
	}
}

class TimeslotTable2 {
	start: Date;
	ts: Map<string,number>[];

	constructor(start:Date) {
		this.start = start;
		this.ts = Array(TIMESLOTS_WEEK).fill(0).map((x) => new Map<string,number>());
	}

	from_intervals(name:string, tv:UserAvailabT[]) {
		let z:number[] = Array(this.ts.length).fill(0);
		ranges_to_timeslots(this.start, z, tv);
		for(let i=0; i<z.length; ++i) {
			if (z[i] !== 0) {
				this.ts[i].set(name, z[i]);
			}
		}
	}

	from_meeting(me:MeetingData) {
		if (me.users.size > 0) {
			for(const [name,tv] of me.users) {
				this.from_intervals(name, tv);
			}
		}
	}

	num_users(i:number):number {
		if (this.ts === undefined || this.ts[i] === undefined) return 0;
		return this.ts[i].size;
	}

	enum_users_ul(i:number):JSX.Element {
		if (this.ts === undefined || this.ts[i] === undefined) return <ul><li>undefinedoops</li></ul>;
		let tmp=[];
		for (const [k,v] of this.ts[i]) {
			tmp.push(<li key={k}>{k}</li>);
		}
		return <ul className="inline-list userNameList">{tmp}</ul>;
	}

	enum_users_range(from:number, to:number, staTus:number):string[] {
		if (this.ts === undefined) return [];
		let tmp = new Set<string>();
		from = Math.max(0, from);
		to = Math.min(this.ts.length, to);
		for(let i=from; i<=to; ++i) {
			if (this.ts[i] === undefined) continue;
			for(const [k,v] of this.ts[i]) {
				if (v === staTus) {
					tmp.add(k);
				}
			}
		}
		return Array.from(tmp);
	}
}

function get_meeting_id():number {
	const query = new URLSearchParams(document.location.search);
	return parseInt(query.get("meeting")!);
}

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

function hour_of_timeslot(i:number):string {
	i %= TIMESLOTS_DAY;
	const h = Math.floor(i / TIMESLOTS_HOUR);
	const m = Math.floor(i % TIMESLOTS_HOUR) * TIMESLOT_DURATION_MIN;
	return HHMM_1(h,m);
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
			onClick={(e) => alert("Nothing happened!")}
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

function App(props:any) {
	let [id, setid] = React.useState<number>(-1);
	let p = window.location.pathname.replace(/\//gm, '');

	React.useEffect(() => {
		if (id < 0) {
			set_title(id,"");
		}
	}, [id]);

	if (/^\d+$/.test(p)) {
		const i = decode_meeting_id(parseInt(p));
		if (i != id) {
			console.log('path name looks like a number', window.location.pathname);
			setid(id = i);
		}
	}

	return <main className={"App" + (check_debug_mode() ? " debug" : "")}>
		{id < 0 ?
			<NewMeetingDialog setid={(x:number) => {
				setid(x);
				window.history.pushState("","","/"+get_meeting_path(x));
			}} />
		:
			<CalendarWidget key={id} me_id={id} />
		}
	</main>;
}

export default App;
