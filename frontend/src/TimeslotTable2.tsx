import { TIMESLOTS_WEEK, TIMESLOTS_DAY, TIMESLOTS_HOUR, TIMESLOT_DURATION_MIN, FIRST_VISIBLE_TIMESLOT } from './config';
import { UserAvailabT, UserAvailab, ranges_to_timeslots } from './timeslots';
import MeetingData from './MeetingData';

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

export default TimeslotTable2;

