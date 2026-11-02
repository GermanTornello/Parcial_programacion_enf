// PROVISORIO: base mínima para correr las pantallas de Leo.
// Cuando entre la base de Pablo (front de PP3 adaptado), sus main.jsx, App.jsx, auth.jsx y Login.jsx reemplazan estos.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import './estilos/enfered.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>,
);
