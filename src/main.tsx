import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <NotificationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster />
    </NotificationProvider>
  </AuthProvider>,
)