import { useState } from 'react'
import './App.css'
import OnboardingScreen from './components/OnboardingScreen.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (  
      <OnboardingScreen />
  )
}

export default App
