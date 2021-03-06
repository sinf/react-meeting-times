
export default
function ToggleBut({state,setState,label,canToggle}:
	{state:boolean,setState:(x:boolean)=>any,label:string,canToggle:boolean}
):JSX.Element {
	return (
		<button
			onClick={(e:any) => setState(!state)}
			disabled={!canToggle}>{label[state ? 1 : 0]}</button>
	);
}


