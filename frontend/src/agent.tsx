import * as U from './util';
import {Meeting, MeetingResponse, SetStringFn} from './types';
import {UserAvailab} from './timeslots';
import MeetingData from './MeetingData';

export function get_newly_created_meeting(x:string,setErr:SetStringFn):MeetingData {
	const j:Meeting = JSON.parse(x);
	let me = new MeetingData(j.id);
	me.meeting = U.unfck_dates(j);
	return me;
}

export async function create_meeting(m:Meeting, setErr:SetStringFn):Promise<MeetingData> {
	const u = U.make_backend_url('create');
	const b = JSON.stringify(m);
	console.log("try to create meeting", u);
	console.log(b);
	setErr('requested creation of new meeting');
	let r = await U.debug_fetch(u, {method:'POST', body: b});
	let body = await U.get_body(r, setErr);
	return get_newly_created_meeting(body, setErr);
}

function P(body:string,setErr:SetStringFn):MeetingData {
	const j:MeetingResponse = JSON.parse(body);
	let me = new MeetingData(j.meeting.id);
	me.eat(j);
	return me;
}

export async function fetch_meeting(meeting_id:number, setErr:SetStringFn):Promise<MeetingData|undefined> {
	let u = U.make_backend_url('meeting/' + meeting_id);
	console.log("start fetching meeting", u);
	setErr('requested data');
	try {
		let r = await U.debug_fetch(u);
		let b = await U.get_body(r, setErr);
		return P(b,setErr);
	} catch(err) {
		console.log('oopsy w/ meeting', meeting_id+':\n', err);
		setErr('request failed: ??');// + err.message);
		return undefined;
	}
}

export async function update_meeting_t(ua:UserAvailab, setErr:SetStringFn):Promise<MeetingData> {
	const id = ua.meeting;
	const u = U.make_backend_url('update');
	const b = JSON.stringify(ua);

	console.log("update meeting", u, 'id:', id, "user:", ua.username, "rows:", ua.T.length);
	setErr('push update');

	let r = await U.debug_fetch(u, {method:'POST', body: b});
	let body = await U.get_body(r, setErr);
	return P(body, setErr);
//		.catch(err => console.log('oopsy w/ meeting', id+':\n', err));
}

