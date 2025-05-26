import {createRoot} from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <App/>
)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}
