
export function get_saved_user():string|undefined {
	return localStorage.getItem('username') || undefined;
}

export function set_saved_user(x:string) {
	localStorage.setItem('username', x);
}

export function is_valid_username(x:string):[boolean,string] {
	const lmin = 2;
	const lmax = 28;
	let ok = true;
	let reason = "";
	let xt = x?.trim();
	if (!x || xt.length < lmin) {
		ok = false;
		reason = `It should have at least ${lmin} character${lmin>1?"s":""}`;
	} else if (xt.length > lmax) {
		ok = false;
		reason = `It should have at most ${lmax} characters`;
	}
	return [ok, reason];
}

