import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './redesign.css';
import App from './App';
import {ReaderPlayer} from './ReaderPlayer';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /><ReaderPlayer/></React.StrictMode>);
