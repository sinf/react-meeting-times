import React from 'react';
import logo from './logo.svg';
import './App.css';

const TIMESLOTS_HOUR = 2;
const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
const TIMESLOT_DURATION_MIN = 60/TIMESLOTS_HOUR;
const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

class DummyBackend {
	meeting: Meeting;
	users: Map<string, UserAvailabT[]>;

	constructor() {
		let t0 = monday(new Date());
		this.meeting = {
			id: 123,
			title: "example",
			descr: "pls pick times on weekend",
			from: add_days(t0, -14),
			to: add_days(t0, 21),
		};
		this.users = new Map<string, UserAvailabT[]>();
	}

	fetch(): UserAvailab[] {
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

	send(user: string, t: UserAvailabT[]) {
		this.users[user] = t;
	}
}

let dummy_backend = new DummyBackend();

class TimeUnit extends React.Component {
	constructor(props: any) {
		super(props);
	}
	render() {
		return (
			<div></div>
		);
	}
}

function day_title(da: Date):string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][da.getDay()];
}

function day_title_tag(da: Date) {
	let wd = day_title(da);
	let mm = 1 + da.getMonth();
	let dd = da.getDate();
	return (<div>
		<div>{wd} </div>
		<div>{dd}.{mm}.</div>
	</div>);
}

function HHMM(da: Date):string {
	return `${da.getHours()}:${da.getMinutes()}`;
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

function week_days(t: Date) {
	let m = monday(t);
	return [m, add_days(m, 1), add_days(m, 2), add_days(m, 3),
			add_days(m, 4), add_days(m, 5), add_days(m, 6)];
}

type CalendarProps = {
	t: Date[];
	username?: string;
	editmode: boolean;
};
type CalendarState = {
	timeslots: number[]; // availability status for the whole week
	users: string[][]; // list of users for each timeslot
	drag_from?: number;
	drag_to?: number;
	dirty: boolean;
};

function add_min(t: Date, m: number): Date {
	let t1 = new Date(t);
	t1.setMinutes(t.getMinutes() + m);
	return t1;
}

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

class Calendar extends React.Component<CalendarProps,CalendarState> {

	constructor(props: CalendarProps) {
		super(props);
		this.state = {
			timeslots: Array(TIMESLOTS_DAY*7).fill(0),
			users: Array(TIMESLOTS_DAY*7).fill([]),
		};
	}

	getUserAvailabT() {
		let tv:UserAvailabT[] = [];
		for(let d=0; d<7; ++d) {
			const n = TIMESLOTS_DAY;
			const f = FIRST_VISIBLE_TIMESLOT;
			tv = tv.concat(timeslots_to_ranges(add_min(this.props.t[d], f*TIMESLOT_DURATION_MIN),
				this.state.timeslots.slice(d*n+f, (d+1)*n)));
		}
		return tv;
	}

	pushUpdate() {
		if (!this.state.dirty) {
			console.log("no changes, not updating");
			return;
		}
		const tv = this.getUserAvailabT();

		console.log("sending new times");
		for(const t of tv) {
			console.log(`${day_title(t.from)}: ${HHMM(t.from)} .. ${HHMM(t.to)}  status=${t.status}`);
		}

		dummy_backend.send(this.props.username, tv);
		this.setState({dirty:false});
	}

	fetchData() {
		console.log("fetching data, username: ", this.props.username);

		let ua = dummy_backend.fetch();
		let me = ua.find((x) => x.username === this.props.username);
		let temp_ts = Array(TIMESLOTS_DAY*7).fill(0);
		let temp_u = Array(TIMESLOTS_DAY*7).fill([]);

		if (me !== undefined) {
			console.log("found self");
			ranges_to_timeslots(this.props.t[0], temp_ts, me.T);
		}

		this.setState({
			timeslots: temp_ts,
			users: temp_u,
		});
	}

	componentDidMount() {
		this.fetchData();
	}

	componentDidUpdate(oldProps: CalendarProps) {
		if (this.props.t[0].toISOString() != oldProps.t[0].toISOString()) {
			// navigated to another week
			if (this.props.editmode) {
				this.pushUpdate();
			}
			this.fetchData();
		} else {
			// same date as before
			if (oldProps.editmode && !this.props.editmode) {
				// left edit mode, should push the new edits
				this.pushUpdate();
			}
		}
	}

	componentWillUnmount() {
		if (this.props.editmode) {
			this.pushUpdate();
		}
	}

	date_range_of_timeslot(i: number) {
		let day = Math.floor(i / TIMESLOTS_DAY);
		let slot = Math.floor(i % TIMESLOTS_DAY);
		let t0 = new Date(this.props.t[day]);
		t0.setHours(Math.floor(slot/TIMESLOTS_HOUR), (slot % TIMESLOTS_HOUR) * TIMESLOT_DURATION_MIN, 0);
		let t1 = new Date(t0);
		t1.setHours(t0.getHours() + 1);
		return [t0, t1];
	}

	begin_drag(from: number) {
		console.log('begin drag at', from);
		this.setState({drag_from: from, drag_to: undefined});
	}

	update_drag(to: number) {
		if (this.state.drag_from !== undefined) {
			this.setState({drag_to: to});
		}
	}

	end_drag(to: number) {
		console.log('end drag at', to);
		const from = this.state.drag_from;
		if (from !== undefined) {
			//const avail = this.state.timeslots[from] === 0 ? 1 : 0;
			const avail = from <= to ? 1 : 0;
			const lo = Math.min(from, to);
			const hi = Math.max(from, to);
			const temp:number[] = Object.assign([], this.state.timeslots);
			for(let i=lo; i<=hi; ++i) {
				temp[i] = avail;
			}
			console.log('paint from', from, 'to', to, 'with', avail);
			this.setState({timeslots: temp, drag_from: undefined, drag_to: undefined, dirty: true});
		} else {
			this.setState({drag_from: undefined, drag_to: undefined});
		}
	}

	being_painted(i: number) {
		const from = this.state.drag_from;
		const to = this.state.drag_to;
		if (from === undefined || to === undefined) {
			return false;
		}
		const lo = Math.min(from, to);
		const hi = Math.max(from, to);
		return lo <= i && i <= hi;
	}

	render_timeslot(day: number, slot: number) {
		const i = day * TIMESLOTS_DAY + slot;
		return (
			<div
				className="timeslot"
				key={i}
				data-timeslot={this.state.timeslots[i]}
				data-paint={this.being_painted(i)}
				onClick={(e) => {
					if (this.props.editmode && e.button === 0) {
						if (this.state.drag_from === undefined) {
							this.begin_drag(i);
						} else {
							this.end_drag(i);
						}
					}
				}}
				onMouseMove={(e) => { if (this.props.editmode) this.update_drag(i) }}
			/>
		);
	}

	render_hour_label(h:number, k:string) {
		return <td key={k} className="hourlabel">{h/TIMESLOTS_HOUR}</td>;
	}

	render() {
		const today = new Date();
		let rows = [];
		for(let h=FIRST_VISIBLE_TIMESLOT; h<TIMESLOTS_DAY; h+=TIMESLOTS_HOUR) {
			let row = [];
			for(let d=0; d<7; ++d) {
				let row2 = [];
				for(let f=0; f<TIMESLOTS_HOUR; ++f) {
					row2.push(this.render_timeslot(d, h + f));
				}
				row.push(<td key={d} data-today={same_day(this.props.t[d], today)}>{row2}</td>);
			}
			rows.push(
				<tr key={"row"+h}>
					{this.render_hour_label(h, "hourLabelL")}
					{row}
					{this.render_hour_label(h, "hourLabelR")}
				</tr>
			);
		}

		return (
			<div className="calendarFrame">
				<div className="weekNr">
					Week {week_nr(this.props.t[3])} of the colossal failure of {this.props.t[0].getFullYear()}
				</div>
				<table className={"calendar" + (this.props.editmode ? " edit": " view")}>
					<thead>
						<tr>
							<th key="th11" className="hourlabel header"></th>
						{
						this.props.t.map((d) =>
								<th
									key={d.toISOString()}
									data-today={same_day(d, today)}
									className="day"
								>{day_title_tag(d)}</th>)
						}
							<th key="th22" className="hourlabel header"></th>
						</tr>
					</thead>
					<tbody>{ rows }</tbody>
				</table>
			</div>
		);
	}
}

type CalProps = {
	meeting_id: number;
};
type CalState = {
	username?: string;
	username_temp: string;
	t_start: Date;
	editmode: boolean;
};
class Cal extends React.Component<CalProps,CalState> {
	pollTimer?: ReturnType<typeof setTimeout>;

	constructor(props: CalProps) {
		super(props);
		this.state = {
			t_start : monday(new Date()),
			username_temp : "",
			editmode: false,
		};
	}

	pollTheServer() {
		//console.log("polling now");
	}

	componentDidMount() {
		this.pollTimer = setInterval(()=>this.pollTheServer(), 1000);
	}

	componentWillUnmount() {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
		}
	}

	set_name(n: string) {
		console.log("set username:", n);
		this.setState({username: n, username_temp: n});
	}

	unset_name() {
		let n = this.state.username!;
		this.setState({username: undefined, username_temp: n});
	}

	render_name() {
		if (this.state.username === undefined) {
			return (<div className="user">
    			<label htmlFor="username">Username: </label>
    			<input
    				id="username" name="username" type="text"
    				value={this.state.username_temp}
    				onChange={(e) => this.setState({username_temp: e.target.value})}
    				maxLength={28} />
    			<button
    				onClick={(e) => this.set_name(this.state.username_temp)}
    				>Enter</button>
			</div>);
		} else {
			return (<div className="user">
				<label>Username: </label>
				<span id="username">{this.state.username}</span>
				<span> </span>
				<button
					onClick={(e) => this.unset_name()}
    				disabled={this.state.editmode}
					>Edit</button>
			</div>);
		}
	}

	render_calendar_navbuttons() {
		return (
    	<div>
			<button
				onClick={(e) => this.setState({t_start : add_days(this.state.t_start, -7)})}
				>&lt;- Go that way</button>
			<button
				onClick={(e) => this.setState({t_start : monday(new Date())})}
				>Go to present</button>
			<button
				onClick={(e) => this.setState({t_start : add_days(this.state.t_start, 7)})}
				>Go this way -&gt;</button>
		</div>
		);
	}

	render_editbutton() {
		const edit = this.state.editmode;
		const label = edit ?
					"Stop editing and submit my new timetable"
					: "Start painting my available times on the calendar";
		return (
		<div>
			<button
				onClick={(e) => this.setState({editmode: !edit})}
				disabled={this.state.username === undefined}
				>{label}</button>
		</div>
		);
	}

	render() {
  	  return (
    	 <div className="calendar-main">
    	 	{this.render_name()}
    	 	{this.render_editbutton()}
    	 	{this.render_calendar_navbuttons()}
    		<Calendar t={week_days(this.state.t_start)}
    			username={this.state.username} editmode={this.state.editmode} />
    	 </div>
  	  );
  }
}

type AppState = {
	meeting_id: number;
	meeting_title?: string;
	meeting_desc?: string;
};
class App extends React.Component<any,AppState> {
	constructor(props: any) {
		super(props);
		const query = new URLSearchParams(document.location.search);
		this.state = {
			meeting_id: parseInt(query.get("meeting")!)
		};
	}
	render_new() {
		return (
			<div>
				<div>
					<label htmlFor="meeting_title">Title: </label>
					<input type="text" maxLength={200} name="meeting_title" id="meeting_title" />
				</div>
				<div>
					<label htmlFor="meeting_desc">Description: </label>
					<input type="text" maxLength={200} name="meeting_desc" id="meeting_desc" />
				</div>
				<button>Create meeting</button>
			</div>
		);
	}
	render() {
  	  return (
    	 <div className="App">
    	 	{
    	 		this.state.meeting_id === NaN
    	 		? this.render_new()
    	 		: <Cal meeting_id={this.state.meeting_id!} />
    	 	}
    	 </div>
  	  );
  }
}

export default App;
