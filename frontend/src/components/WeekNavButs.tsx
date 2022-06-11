import * as U from '../util';

export default
function WeekNavButs({cursor,setCursor,dis}:{cursor:Date,setCursor:U.SetDateFn,dis:boolean}) {
	return (
   <div className="weekNav button-group">
		<div className="weekNr">
			Week {U.week_nr(cursor)} of {cursor.getFullYear()}
		</div>
		<button
			onClick={(e) => setCursor(U.add_days(cursor, -7))}
			disabled={dis}
			>&lt;- Go that way</button>
		<button
			onClick={(e) => setCursor(new Date())}
			disabled={dis}
			>Go to present</button>
		<button
			onClick={(e) => setCursor(U.add_days(cursor, 7))}
			disabled={dis}
			>Go this way -&gt;</button>
	</div>
	);
}

