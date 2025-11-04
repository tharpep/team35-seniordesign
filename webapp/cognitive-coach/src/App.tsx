import './App.css'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './AppRouter.tsx'
import { AuthProvider } from './contexts/AuthContext'

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
