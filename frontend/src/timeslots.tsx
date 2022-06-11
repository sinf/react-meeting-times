
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

function uat_str(t: UserAvailabT):string {
	const f = t.from;
	return `${DDMM(f)} ${day_title(f)}: ${HHMM(f)} .. ${HHMM(t.to)}  status=${t.status}`;
}

function print_intervals(tv: UserAvailabT[]) {
	for(const t of tv) {
		console.log(uat_str(t));
	}
}
