import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DriverView from './pages/DriverView.jsx'
import TrackingPage from './pages/TrackingPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/driver" element={<DriverView />} />
        <Route path="/track/:trackingId" element={<TrackingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
