import React from 'react';
import { createRoot } from 'react-dom/client';
import { installLocalStorageQuotaGuard } from './services/storageGuard';
import { App } from './App.jsx';
import './styles.css';

installLocalStorageQuotaGuard();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
