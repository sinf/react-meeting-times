import React from 'react';
import { TIMESLOTS_HOUR, TIMESLOTS_DAY, FIRST_VISIBLE_TIMESLOT } from '../config';
import { get_week_days, same_day, day_title_tag } from '../util';
import './Hourgrid.css';

export interface HoverAt {
	i: number; // hovered cell
	x: number; // cursor x coord
	y: number; // cursor y coord
	a?: number; // first cell
	b?: number; // last cell
	ok: boolean;
}

export type PaintCellsFn = (from:number, to:number, value:number) => void;

export function Hourgrid(
{cursor,paint_cells,edit,hover_at,cell_class}
:{
	cursor:Date,
	paint_cells?:PaintCellsFn,
	edit:boolean,
	hover_at:(h:HoverAt) => void,
	cell_class:(cell:number) => string
}
) {
	const day_start:Date[] = get_week_days(cursor);
	const today = new Date();
	let [dragA,setDragA] = React.useState<number|undefined>(undefined);
	let [dragB,setDragB] = React.useState<number|undefined>(undefined);
	const dragMin:number = Math.min(dragA||-1,dragB||-1);
	const dragMax:number = Math.max(dragA||-1,dragB||-1);

	function render_hour_label(h:number, k:string):JSX.Element {
		return <td key={k} className="hourlabel">{h/TIMESLOTS_HOUR}</td>;
	}
	function begin_drag(i:number) {
		setDragA(i);
		setDragB(i);
	}
	function update_drag(i:number) {
		if (dragA !== undefined) {
			setDragB(i);
		}
	}
	function end_drag(i:number) {
		if (dragA !== undefined && dragB !== undefined && paint_cells) {
			paint_cells(dragMin, dragMax, dragA == dragB ? -1 : (dragA < dragB ? 1 : 0));
		}
		setDragA(undefined);
		setDragB(undefined);
	}

	let rows = [];
	for(let h=FIRST_VISIBLE_TIMESLOT; h<TIMESLOTS_DAY; h+=TIMESLOTS_HOUR) {
		let row = [];
		for(let d=0; d<7; ++d) {
			let hour_block = [];
			for(let f=0; f<TIMESLOTS_HOUR; ++f) {
				const i = d * TIMESLOTS_DAY + h + f;
				const being_painted = dragMin <= i && dragMax >= i;
				hour_block.push(
					<div key={i}
						className={"timeslot"
							+ (being_painted ? " paint" : "")
							+ (edit ? " edit" : " view")
							+ " " + cell_class(i)
						}
						onClick={(e) => {
							if (paint_cells && e.button === 0) {
								if (dragA === undefined) {
									begin_drag(i);
								} else {
									end_drag(i);
								}
							}
							if (hover_at) {
								hover_at({i:i, x:e.clientX, y:e.clientY, a:dragA, b:dragB, ok:true});
							}
						}}
						onMouseMove={(e) => {
							if (paint_cells) update_drag(i);
							if (hover_at) hover_at({i:i, x:e.clientX, y:e.clientY, a:dragA, b:dragB, ok:true});
						}}
						>
						<div className="hl"/>
					</div>
				);
			}
			row.push(<td key={d} data-today={same_day(day_start[d], today)}>{hour_block}</td>);
		}
		rows.push(
			<tr key={"row"+h}>
				{render_hour_label(h, "hourLabelL")}
				{row}
				{render_hour_label(h, "hourLabelR")}
			</tr>
		);
	}

	return (
		<table className="calendar"
			onMouseLeave={(e) => {
				if (hover_at) hover_at({i:-1,x:0,y:0,a:0,b:0,ok:false});
				if (true) {
					// interrupt drag. annoying when operating near table edge
					// but easy fix to issues when user clicks some button while dragging
					setDragA(undefined);
					setDragB(undefined);
				}
			}}>
			<thead>
				<tr>
					<th key="headHourLabelL" className="hourlabel header"></th>
					{
						day_start.map((d) =>
							<th
								key={d.toISOString()}
								data-today={same_day(d, today)}
								className="day"
							>{day_title_tag(d)}</th>)
					}
					<th key="headHourLabelR" className="hourlabel header"></th>
				</tr>
			</thead>
			<tbody>{ rows }</tbody>
		</table>
	);
}

