import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './futuro.css'
import './juego.css'
import './vuelo-layout.css'
import './arreglos-qa.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
