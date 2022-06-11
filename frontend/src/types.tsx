import { UserAvailab } from './timeslots';

export type SetNumberFn = (x: number) => any;
export type SetStringFn = (x: string) => any;
export type SetBooleanFn = (x: boolean) => any;
export type SetDateFn = (x: Date) => any;

export interface CalendarProps {
	t_initial: Date;
	username?: string;
}

export interface CalendarState {
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

export interface Meeting {
	id: number;
	title: string;
	descr: string;
	from: Date;
	to: Date;
	mtime: Date;
}

export interface MeetingResponse {
	meeting: Meeting;
	users: UserAvailab[];
}

