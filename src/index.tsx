import React from 'react';
//import ReactDOM from 'react-dom'; // react 17
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = document.getElementById('root')!;
const my_react = (
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

// ReactDOM.render(my_react, root); // react 17 way
ReactDOM.createRoot(root).render(my_react);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
