import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import GetComment from './GetComment.jsx';
import './index.css';

const match = window.location.pathname.match(/^\/get-comment\/([a-f0-9]{36})\/?$/);
createRoot(document.getElementById('root')).render(match ? <GetComment id={match[1]} /> : window.location.pathname.startsWith('/get-comment') ? <main className="min-h-screen bg-[#0a0a0a] text-white p-8">Страница не найдена</main> : <App />);