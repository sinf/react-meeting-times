import React from 'react';
import logo from './logo.svg';
import './App.css';

const TIMESLOTS_HOUR = 2;
const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
const TIMESLOTS_WEEK = 7*TIMESLOTS_DAY;
const TIMESLOT_DURATION_MIN = 60/TIMESLOTS_HOUR;
const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

type CalendarProps = {
	t_initial: Date;
	username?: string;
};
type CalendarState = {
	t_cursor:Date;
	t: Date[];
	editmode: boolean;
	timeslots: number[]; // availability status for the whole week
	tv: UserAvailab[];
	users: string[][]; // list of users for each timeslot
	drag_from?: number;
	drag_to?: number;
	dirty: boolean;
};

type Meeting = {
	id: number;
	title: string;
	descr: string;
	from: Date;
	to: Date;
};

type UserAvailab = {
	meeting: number;
	username: string;
	T: UserAvailabT[];
};

type UserAvailabT = {
	status: number;
	from: Date;
	to: Date;
};


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
		};
		this.users = new Map<string, UserAvailabT[]>();
	}

	copy():MeetingData {
		let m = new MeetingData(this.meeting.id);
		m.meeting = this.meeting;
		m.users = new Map <string, UserAvailab[]>(this.users);
		return m;
	}

	get_ua():UserAvailab[] {
		let ua:UserAvailab[] = [];
		for(let [name, t] of this.users.entries()) {
			ua.push({
				meeting: this.meeting.id,
				username: name,
				T: t,
			});
		}
		return ua;
	}

	print() {
		console.log("Meeting", this.meeting.id);
		for(let [name, t] of this.users.entries()) {
			console.log("Available times for user", name);
			print_intervals(t);
			console.log();
		}
		console.log();
	}
}

let dummy_backend_data:MeetingData = new MeetingData(123);

async function fetch_meeting(meeting_id:number):MeetingData {
	console.log("start fetching meeting", meeting_id);
	return new Promise(f => {
		setTimeout(() => {
			f(dummy_backend_data);
			console.log('got the meeting');
		}, 3000);
	});
}

function update_meeting_t(meeting_id:number, u:UserAvailab) {
	console.log("update meeting", meeting_id, "time for user", u.username, "rows:", u.T.length);
	dummy_backend_data.users[u.username] = u.T;
}

function day_title(da: Date):string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][da.getDay()];
}

function DDMM(da: Date):string {
	let mm = 1 + da.getMonth();
	let dd = da.getDate();
	return `${dd}.${mm}.`;
}

function day_title_tag(da: Date) {
	let wd = day_title(da);
	return (<div>
		<div>{wd} </div>
		<div>{DDMM(da)}</div>
	</div>);
}

function padzero2(x:number):string {
	return x < 10 ? "0" + x : x;
}

function HHMM_1(h:number, m:number):string {
	return `${padzero2(h)}:${padzero2(m)}`;
}

function HHMM(da: Date):string {
	return HHMM_1(da.getHours(), da.getMinutes());
}

function monday(t: Date): Date {
	t = new Date(t);
	t.setDate( 1 - t.getDay() + t.getDate() );
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

function week_nr(date1: Date) {
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
		let i0 = Math.max(calc_timeslot(t_start, t.from), 0);
		let i1 = Math.min(calc_timeslot(t_start, t.to), timeslots.length + 1);
		for(let i=i0; i<i1; ++i) {
			timeslots[i] = t.status;
		}
	}
}

const Hourgrid = (
{cursor,cell_color,paint_cells,edit,hover_at}
) => {
	const day_start:Date[] = get_week_days(cursor);
	const today = new Date();
	const render_hour_label =
		(h, k) => <td key={k} className="hourlabel">{h/TIMESLOTS_HOUR}</td>;
	let [dragA,setDragA] = React.useState(undefined);
	let [dragB,setDragB] = React.useState(undefined);
	const dragMin = Math.min(dragA,dragB);
	const dragMax = Math.max(dragA,dragB);
	const begin_drag = (i) => {
		setDragA(i);
		setDragB(i);
	};
	const update_drag = (i) => {
		if (dragA !== undefined) {
			setDragB(i);
		}
	};
	const end_drag = (i) => {
		if (dragA !== undefined && dragB !== undefined) {
			paint_cells(dragMin, dragMax, dragA == dragB ? -1 : (dragA < dragB ? 1 : 0));
		}
		setDragA(undefined);
		setDragB(undefined);
	};

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
							+ (edit ? " edit" : "")
						}
						data-color={cell_color(i)}
						onClick={(e) => {
							if (edit && e.button === 0) {
								if (dragA === undefined) {
									begin_drag(i);
								} else {
									end_drag(i);
								}
							}
							if (hover_at) {
								hover_at(i, e.clientX, e.clientY, dragA, dragB);
							}
						}}
						onMouseMove={(e) => {
							if (edit) update_drag(i);
							if (hover_at) hover_at(i, e.clientX, e.clientY, dragA, dragB);
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
				if (hover_at) hover_at(-1,0,0);
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

function get_meeting_id():number {
	const query = new URLSearchParams(document.location.search);
	return parseInt(query.get("meeting")!);
}

const WeekNavButs = (
{cursor,setCursor}:{cursor:Date,setCursor:Object}
) => {
	return (
   <div className="weekNav">
		<div className="weekNr">
			Week {week_nr(cursor)} of the colossal failure of {cursor.getFullYear()}
		</div>
		<button
			onClick={(e) => setCursor(add_days(cursor, -7))}
			>&lt;- Go that way</button>
		<button
			onClick={(e) => setCursor(new Date())}
			>Go to present</button>
		<button
			onClick={(e) => setCursor(add_days(cursor, 7))}
			>Go this way -&gt;</button>
	</div>
	);
}

const Textfield = (
{text,setText,label,maxlen,canEdit,edit,setEdit}
) => {
	let [buf,setBuf] = React.useState(undefined);
	let id = label;

	if (edit) {
		return (<div className="textfield">
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
    			>Enter</button>
		</div>);
	} else {
		return (<div className="textfield">
			<label>Username: </label>
			<span id={id}>{text}</span>
			<span> </span>
			<button
				onClick={(e) => {
					setBuf(text);
					setEdit(true);
				}}
				disabled={!canEdit}
				>Edit</button>
		</div>);
	}
};

const ToggleBut = (
{state,setState,label,canToggle}:{state:boolean,setState:Object,label:string,canToggle:boolean}
) => {
	return (
		<button
			onClick={(e) => setState(!state)}
			disabled={!canToggle}>{label[state ? 1 : 0]}</button>
	);
};

function hour_of_timeslot(i:number):string {
	i %= TIMESLOTS_DAY;
	const h = Math.floor(i / TIMESLOTS_HOUR);
	const m = Math.floor(i % TIMESLOTS_HOUR) * TIMESLOT_DURATION_MIN;
	return HHMM_1(h,m);
}

function TooltipContent({i, a, b, edit}) {
	return (<div>
		{hour_of_timeslot(i)} - {hour_of_timeslot(i+1)}
	</div>);
}

const howto = `
Click on the calendar to start selecting a time interval.
Move the cursor somewhere else and click again to paint the selected times.
They will be painted as "available" if the last clicked time is after the initially clicked time.
They will be painted as "unavailable" if the last clicked time is before the initially clicked time.
`;

function App(props) {
	const VIEW = 0;
	const EDIT_NAME = 1;
	const EDIT_TIME = 2;
	const SEND_TIME = 3;
	let [state, setState] = React.useState(VIEW);

	let [user,setUser] = React.useState("test");
	let [cursor,setCursor] = React.useState(new Date());
	let [hoverX,setHoverX] = React.useState([-1,-1,-1,undefined,undefined]);

	let [me,setMe] = React.useState(new MeetingData(123));
	let [pollnr,setPollnr] = React.useState(0);

	let poll_me = () => {
		const a = async () => {
			const x = await fetch_meeting(me.meeting.id);
			setMe(x);
			x.print();
		};
		a();
	};

	React.useEffect(poll_me, [pollnr]);

	let [tsCache,setTsCache] = React.useState(new Map<string,TimeslotTable>());
	const week_start = monday(cursor);
	const week_id = week_start.toISOString();
	let setTs = (t) => {
		tsCache.set(week_id, t);
		setTsCache(tsCache);
	};
	let ts = tsCache.get(week_id);
	if (ts === undefined) {
		ts = new TimeslotTable(week_start);
		setTs(ts);
	}

	let uat:UserAvailabT[] = [];
	if (state == EDIT_TIME) {
		// discrete timeslots -> list of start/stop ranges
		for(const t of tsCache.values()) {
			uat = uat.concat(t.to_intervals());
		}
		uat = uat.sort((a,b) => a.from-b.from);
	}
	let send_uat = () => {
		update_meeting_t(me.meeting.id, {
			meeting: me.meeting.id, username: user, T: uat
		});
		setPollnr(pollnr + 1);
	};

	function beginEdit() {
		// todo: populate tsCache with stuff from the server
		setState(EDIT_TIME);
		console.log("begin editing");
	}

	function endEdit() {
		setState(VIEW);
		console.log("end editing");
		//setState(SEND_TIME);
		//setTsCache(new Map<string,TimeslotTable>());
		send_uat();
	}

	return (
		<div className="App">
			<div>
				<div className="tooltip"
					style={{
						display: hoverX[0] < 0 ? "none" : "block",
						position: "absolute",
						left: hoverX[1],
						top: hoverX[2],
					}}>
					{TooltipContent({i:hoverX[0], a:hoverX[3], b:hoverX[4], edit:state==EDIT_TIME})}
				</div>
				<div className="calendar-main">
					{Textfield({text:user,setText:setUser,label:"Username",maxlen:28,
						canEdit:(state != EDIT_NAME && state == VIEW),edit:(state == EDIT_NAME),
						setEdit:(b) => setState(b ? EDIT_NAME : VIEW)})}
					{WeekNavButs({cursor:cursor,setCursor:setCursor})}
					{Hourgrid({cursor:cursor,edit:(state == EDIT_TIME),
						paint_cells:(from,to,color) => {
							setTs(ts.paint(from, to, color));
						},
						cell_color:(i) => ts.ts[i],
						hover_at: (i,x,y,a,b) => setHoverX([i,x,y,a,b]),
					})}

					{(state == EDIT_TIME) ? <div><button
						className="clear-timetable"
						onClick={(e) => {
							setTsCache(new Map<string,TimeslotTable>());
						}}
						> Clear my timetable
					</button></div> : undefined}

					<button
						className="edit-calendar"
						onClick={(e) => {
							if (state == EDIT_TIME) {
								endEdit();
							} else {
								beginEdit();
							}
						}}
						disabled={state != EDIT_TIME && state != VIEW}>
						{[
							"Start painting my available times on the calendar",
							"Stop editing and submit my new timetable",
						][state == EDIT_TIME ? 1:0]}
					</button>

					{ state != EDIT_TIME ? undefined :
						<div className="time-interval-list">
							<div className="title">{uat.length > 0 ? "I'm available on" : howto}</div>
							{
								uat.map((t) =>
									<div key={t.from} className="item">
										<span>{DDMM(t.from)} </span>
										<span>{day_title(t.from)} </span>
										<span>{HHMM(t.from)}</span> .. <span> {HHMM(t.to)}</span>
									</div>
								)
							}
						</div>
					}
				</div>
			</div>
		</div>
	);
}

export default App;
