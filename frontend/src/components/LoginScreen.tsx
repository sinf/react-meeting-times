import { is_valid_username } from '../user';
import { Textfield } from './Textfield';
import './LoginScreen.css';

export default
function LoginScreen({user,setUser}:{user?:string, setUser:(x:string)=>any}):JSX.Element {
	return (
	<div className="username-wrap">
		<p>Choose a username</p>
		<div>
			<Textfield
				key="username in login screen"
				text={user}
				setText={setUser}
				edit={true}
				canEdit={true}
				setEdit={(x:boolean) => true}
				label="Username"
				maxlen={28}
				validate={is_valid_username}
				/>
		</div>
		<p>This will be remembered in local storage</p>
	</div>
	);
}

