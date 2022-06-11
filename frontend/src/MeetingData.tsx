import './config';
import './types';
import './util';
import './timeslots';
import TimeslotTable from './TimeslotTable';

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

export default MeetingData;

