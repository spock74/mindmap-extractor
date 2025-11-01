import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
// FIX: Use a named import for `GlobalWorkerOptions` to resolve the TypeScript error.
// The 'worker' property is not available on the type for the namespace import,
// but it is available on the named `GlobalWorkerOptions` export.
import { GlobalWorkerOptions } from 'pdfjs-dist';

// The `pdf.js` library requires a worker to process PDF files.
// In a modern environment using ES modules, we must explicitly create the worker
// with `{ type: 'module' }` to ensure it's loaded correctly.
// We assign the worker instance directly to `GlobalWorkerOptions.worker`
// instead of just providing the `workerSrc` path. This gives us direct control
// over the instantiation and prevents loading errors.
// The `as any` cast is necessary to bypass a TypeScript error caused by
// outdated type definitions in the `pdf.js` library, allowing compilation.
(GlobalWorkerOptions as any).worker = new Worker(
  'https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.worker.mjs',
  { type: 'module' }
);


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
