import React from 'react';
import logo from './logo.svg';
import './App.css';

class App extends React.Component {
	pollTimer?: ReturnType<typeof setTimeout>;

	constructor(props: any) {
		super(props);
		this.state = {};
	}

	pollTheServer() {
		//console.log("polling now");
	}

	componentDidMount() {
		this.pollTimer = setInterval(()=>this.pollTheServer(), 1000);
	}

	componentWillUnmount() {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
		}
	}

	render() {
  	  return (
    	 <div className="App">
    		<br/>
    		<label htmlFor="username">Username: </label>
    		<input id="username" name="username" type="text" maxLength={28} />
    		<button id="username_ok">Enter</button>
    	 </div>
  	  );
  }
}

export default App;
