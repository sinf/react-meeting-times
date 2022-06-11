import { TIMESLOTS_WEEK, TIMESLOTS_DAY, FIRST_VISIBLE_TIMESLOT } from './config';
import * as T from './timeslots';

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

	to_intervals(): T.UserAvailabT[] {
		// user cant see earliest hours, so blank them out here to prevent unintended availability
		let ts1:number[] = [];
		for(let i=0; i<this.ts.length; ++i) {
			ts1[i] = Math.floor(i % TIMESLOTS_DAY) < FIRST_VISIBLE_TIMESLOT ? 0 : this.ts[i];
		}
		return T.timeslots_to_ranges(this.start, ts1);
	}

	from_intervals(tv:T.UserAvailabT[]) {
		T.ranges_to_timeslots(this.start, this.ts, tv);
	}

	copy():TimeslotTable {
		let t = new TimeslotTable(this.start);
		for(let i=0; i<this.ts.length; ++i) { t.ts[i] = this.ts[i]; }
		return t;
	}
}

export default TimeslotTable;


