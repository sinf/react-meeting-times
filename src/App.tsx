import React from 'react';
import logo from './logo.svg';
import './App.css';

const TIMESLOTS_HOUR = 2;
const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
const TIMESLOT_DURATION = 60*60/TIMESLOTS_HOUR;
const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

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

function day_title(da: Date) {
	let wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][da.getDay()];
	let mm = 1 + da.getMonth();
	let dd = da.getDate();
	return (<div>
		<div>{wd} </div>
		<div>{dd}.{mm}.</div>
	</div>);
}

function monday(t: Date) {
	t = new Date(t);
	t.setDate( 1 - t.getDay() + t.getDate() );
	t.setHours(0,0,0,0);
	return t;
}

function add_days(t: Date, n: number) {
	t = new Date(t);
	t.setDate(t.getDate() + n);
	return t;
}

function same_day(a: Date, b: Date) {
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
};
type CalendarState = {
	timeslots: number[]; // availability status for the whole week
	drag_from?: number;
	drag_to?: number;
};
class Calendar extends React.Component<CalendarProps,CalendarState> {

	constructor(props: CalendarProps) {
		super(props);
		this.state = {
			timeslots: Array(TIMESLOTS_DAY*7).fill(0),
		};
	}

	date_range_of_timeslot(i: number) {
		let day = Math.floor(i / TIMESLOTS_DAY);
		let slot = Math.floor(i % TIMESLOTS_DAY);
		let t0 = new Date(this.props.t[day]);
		t0.setHours(Math.floor(slot/TIMESLOTS_HOUR), (slot % TIMESLOTS_HOUR) * TIMESLOT_DURATION / 60, 0);
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
			this.setState({timeslots: temp, drag_from: undefined, drag_to: undefined});
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
					if (e.button === 0) {
						if (this.state.drag_from === undefined) {
							this.begin_drag(i);
						} else {
							this.end_drag(i);
						}
					}
				}}
				onMouseMove={(e) => { this.update_drag(i) }}
			/>
		);
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
			rows.push(<tr key={h}>{row}</tr>);
		}

		return (
			<div className="calendarFrame">
				<div className="weekNr">
					Week {week_nr(this.props.t[3])} of the colossal failure of {this.props.t[0].getFullYear()}
				</div>
				<table className="calendar">
					<thead>
						<tr>{
							this.props.t.map((d) =>
								<th
									key={d.toISOString()}
									data-today={same_day(d, today)}
								>{day_title(d)}</th>)
						}</tr>
					</thead>
					<tbody>{ rows }</tbody>
				</table>
			</div>
		);
	}
}

type AppState = {
	username?: string;
	username_temp: string;
	t_start: Date;
};
class App extends React.Component<any,AppState> {
	pollTimer?: ReturnType<typeof setTimeout>;

	constructor(props: any) {
		super(props);
		this.state = {
			t_start : monday(new Date()),
			username_temp : "",
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
					>Edit</button>
			</div>);
		}
	}

	render() {
  	  return (
    	 <div className="App">
    	 	{this.render_name()}
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
    		<Calendar t={week_days(this.state.t_start)} />
    	 </div>
  	  );
  }
}

export default App;
