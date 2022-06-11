
const TIMESLOTS_HOUR = 2;
const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
const TIMESLOTS_WEEK = 7*TIMESLOTS_DAY;
const TIMESLOT_DURATION_MIN = 60/TIMESLOTS_HOUR;
const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

const BACKEND = 'http://localhost:9080/';
const FRONTEND = 'http://localhost:3000/';

function make_backend_url(endpoint:string):string { return BACKEND + endpoint; }
function encode_meeting_id(i:number):number { return i; }
function decode_meeting_id(i:number):number { return i; }
function get_meeting_path(id:number):string { return "?meeting=" + encode_meeting_id(id).toString(); }
function get_meeting_url(id:number):string { return FRONTEND + get_meeting_path(id); }

