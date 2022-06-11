import React from 'react';
//import ReactDOM from 'react-dom'; // react 17
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = document.getElementById('root')!;
const my_react = (
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

// ReactDOM.render(my_react, root); // react 17 way
ReactDOM.createRoot(root).render(my_react);

