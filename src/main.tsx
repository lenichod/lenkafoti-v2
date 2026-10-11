import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

const params = new URLSearchParams(window.location.search);
const isDesignPreview = params.has('designs') || params.has('design');
const DesignLab = React.lazy(() => import('./features/designs/DesignLab').then((module) => ({ default: module.DesignLab })));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDesignPreview ? <React.Suspense fallback={<p role="status">Loading design previews…</p>}>
      <DesignLab />
    </React.Suspense> : <App />}
  </React.StrictMode>,
);
