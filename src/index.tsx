/* SYNC FIX */
import React from 'react';
/* SYNC FIX */
import ReactDOM from 'react-dom/client';
/* SYNC FIX */
import './index.css';
/* SYNC FIX */
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);