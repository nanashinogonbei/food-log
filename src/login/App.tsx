import React, { useState } from 'react'
import './App.css'
import { SignedIn, SignedOut, SignIn, SignUp, UserButton } from '@clerk/clerk-react'

function App() {
  const [activeTab, setActiveTab] = useState('signIn');

  return (
    <>
      <header>
        {/* Show the sign-in and sign-up buttons when the user is signed out */}
        <SignedOut>
          <div style={{ display: 'flex', marginBottom: '10px' }}>
            <button
              onClick={() => setActiveTab('signIn')}
              style={{
                padding: '10px 20px',
                marginRight: '10px',
                backgroundColor: activeTab === 'signIn' ? '#007bff' : '#f0f0f0',
                color: activeTab === 'signIn' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ログイン
            </button>
            <button
              onClick={() => setActiveTab('signUp')}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'signUp' ? '#007bff' : '#f0f0f0',
                color: activeTab === 'signUp' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              アカウントを作る
            </button>
          </div>
          {activeTab === 'signIn' && <SignIn />}
          {activeTab === 'signUp' && <SignUp />}
        </SignedOut>
        {/* Show the user button when the user is signed in */}
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
    </>
  )
}

export default App