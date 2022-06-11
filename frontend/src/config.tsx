
export const TIMESLOTS_HOUR = 2;
export const TIMESLOTS_DAY = 24*TIMESLOTS_HOUR;
export const TIMESLOTS_WEEK = 7*TIMESLOTS_DAY;
export const TIMESLOT_DURATION_MIN = 60/TIMESLOTS_HOUR;
export const FIRST_VISIBLE_TIMESLOT = 6*TIMESLOTS_HOUR;

export const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:9080/';
export const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:3000/';

