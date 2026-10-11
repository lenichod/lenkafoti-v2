import React from 'react';
import ReactDOM from 'react-dom/client';
import { Admin } from './features/admin/Admin';
import './styles/global.css';

let theme: string | null = null;
try { theme = localStorage.getItem('portfolio-theme'); } catch { /* Storage can be unavailable. */ }
document.documentElement.dataset.theme = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Admin /></React.StrictMode>);
