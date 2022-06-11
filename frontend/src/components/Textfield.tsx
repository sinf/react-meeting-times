import React from 'react';
import {SetStringFn, SetBooleanFn} from '../util';
import './Textfield.css';

export interface TextfieldProps {
	text?: string;
	setText: SetStringFn;
	label: string;
	maxlen: number;
	canEdit: boolean;
	edit: boolean;
	setEdit: SetBooleanFn;
	validate: (x:string) => [boolean,string];
}

export function Textfield({text,setText,label,maxlen,canEdit,edit,setEdit,validate}:TextfieldProps):JSX.Element {
	let [buf1,setBuf] = React.useState<string|undefined>(undefined);
	let buf:string = buf1 || text || "";
	let id = "textfield-" + label.replace(' ','-');

	if (edit) {
		let [valid,explanation] = validate ? validate(buf) : [true,""];
		return (<span className="textfield">
    		<label htmlFor={id}>{label}: </label>
    		<input
    			id={id} name={id} type="text"
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen} />
			<span> </span>
    		<button
    			onClick={(e) => {
    				setText(buf);
    				setEdit(false);
    			}}
    			disabled={!valid}
    			>Enter</button>
    		<p>{explanation}</p>
		</span>);
	} else {
		return (<span className="textfield">
			<label>{label}: </label>
			<span id={id}>{text}</span>
			<span> </span>
			<button
				onClick={(e) => {
					setBuf(text);
					setEdit(true);
				}}
				disabled={!canEdit}
				>Edit</button>
		</span>);
	}
}

export function Textfield2({buf,setBuf,label,maxlen,rows,cols,dis}:
	{buf:string,setBuf:SetStringFn,label:string,maxlen:number,rows:number,cols:number,dis:boolean}
):JSX.Element {
	let id = "textfield2-" + label;
	return <div className="textfield">
    	<label htmlFor={id}>{label}: </label><br/>
    	{rows == 1 ?
    		<input
    			type="text"
    			id={id}
    			name={id}
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen}
    			disabled={dis} />
    	:
    		<textarea
    			id={id}
    			name={id}
    			rows={rows}
    			cols={cols}
    			value={buf}
    			onChange={(e) => setBuf(e.target.value)}
    			maxLength={maxlen}
    			disabled={dis} />
    	}
	</div>;
}

