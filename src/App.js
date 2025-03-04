import React from 'react';
import './App.css';
import ChatBox from './components/ChatBox';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>BetaLink</h1>
        <h2>Instantly find anyone in your network.</h2>
      </header>
      <main>
        <ChatBox />
      </main>
    </div>
  );
}

export default App;
