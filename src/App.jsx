import React, { useState } from 'react'
import './App.css'
import ChatBox from './components/ChatBox'
import FileUpload from './components/FileUpload'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>价格弹性分析助手</h1>
      </header>
      <main className="app-main">
        <div className="app-content">
          <FileUpload />
          <ChatBox />
        </div>
      </main>
    </div>
  )
}

export default App