import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import NewTab from './NewTab';

const root = document.getElementById('root')!;
createRoot(root).render(
  <React.StrictMode>
    <NewTab />
  </React.StrictMode>
);
