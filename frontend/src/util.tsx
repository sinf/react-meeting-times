
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

function day_title(da: Date):string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][da.getDay()];
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

function DDMM(da: Date):string {
	let mm = 1 + da.getMonth();
	let dd = da.getDate();
	return `${dd}.${mm}.`;
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

function get_meeting_id():number {
	const query = new URLSearchParams(document.location.search);
	return parseInt(query.get("meeting")!);
}

function hour_of_timeslot(i:number):string {
	i %= TIMESLOTS_DAY;
	const h = Math.floor(i / TIMESLOTS_HOUR);
	const m = Math.floor(i % TIMESLOTS_HOUR) * TIMESLOT_DURATION_MIN;
	return HHMM_1(h,m);
}

