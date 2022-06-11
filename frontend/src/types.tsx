
type SetNumberFn = (x: number) => any;
type SetStringFn = (x: string) => any;
type SetBooleanFn = (x: boolean) => any;
type SetDateFn = (x: Date) => any;

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

