
import React, { useState } from "react";
import Room from "./components/Room";
import Game from "./components/Game";

function App() {
  const [gameState, setGameState] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Pictionary Game</h1>
      {!gameState ? (
        <Room onStart={setGameState} />
      ) : (
        <Game {...gameState} onPlayAgain={() => setGameState(null)} />
      )}
    </div>
  );
}

export default App;
