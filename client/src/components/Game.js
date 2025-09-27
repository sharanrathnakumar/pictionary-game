import React, { useRef, useEffect, useState } from "react";
import { socket } from "../socket";

function Game({ roomCode, playerId, role, word, round, scores, onPlayAgain }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chat, setChat] = useState([]);
  const [guess, setGuess] = useState("");
  const [drawer, setDrawer] = useState(role === "drawer");
  const [currentWord, setCurrentWord] = useState(word);
  const [currentRound, setCurrentRound] = useState(round);
  const [currentScores, setCurrentScores] = useState(scores);
  const [gameEnd, setGameEnd] = useState(false);

  useEffect(() => {
    socket.on("drawing", (data) => {
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(data.prev.x, data.prev.y);
      ctx.lineTo(data.curr.x, data.curr.y);
      ctx.stroke();
    });
    socket.on("chat", (msg) => {
      setChat((c) => [...c, msg]);
    });
    socket.on("nextRound", (data) => {
        // Clear canvas for new round
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setDrawer(data.drawer === playerId);
      setCurrentWord(data.word);
      setCurrentRound(data.round);
      setCurrentScores(data.scores);
      setChat([]);
    });
    socket.on("gameEnd", (data) => {
        // Clear canvas at game end
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setGameEnd(true);
      setCurrentScores(data.scores);
    });
    socket.on("playerLeft", () => {
      alert("Other player left the game.");
      window.location.reload();
    });
    return () => {
      socket.off("drawing");
      socket.off("chat");
      socket.off("nextRound");
      socket.off("gameEnd");
      socket.off("playerLeft");
    };
  }, [playerId]);

  // Mouse events
  const handleMouseDown = (e) => {
    if (!drawer) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    canvasRef.current.last = { x, y };
  };
  const handleMouseUp = () => {
    setIsDrawing(false);
    canvasRef.current.last = null;
  };
  const handleMouseMove = (e) => {
    if (!isDrawing || !drawer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (canvasRef.current.last) {
      // Draw locally
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(canvasRef.current.last.x, canvasRef.current.last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Emit to server
      socket.emit("drawing", {
        roomCode,
        data: { prev: canvasRef.current.last, curr: { x, y } },
      });
    }
    canvasRef.current.last = { x, y };
  };
  const handleMouseLeave = () => {
    setIsDrawing(false);
    canvasRef.current.last = null;
  };

  // Touch events for mobile
  const getTouchPos = (touch) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };
  const handleTouchStart = (e) => {
    if (!drawer) return;
    setIsDrawing(true);
    if (e.touches.length === 1) {
      canvasRef.current.last = getTouchPos(e.touches[0]);
    }
  };
  const handleTouchMove = (e) => {
    if (!isDrawing || !drawer) return;
    if (e.touches.length === 1) {
      const pos = getTouchPos(e.touches[0]);
      if (canvasRef.current.last) {
        // Draw locally
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(canvasRef.current.last.x, canvasRef.current.last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        // Emit to server
        socket.emit("drawing", {
          roomCode,
          data: { prev: canvasRef.current.last, curr: pos },
        });
      }
      canvasRef.current.last = pos;
    }
    e.preventDefault();
  };
  const handleTouchEnd = () => {
    setIsDrawing(false);
    canvasRef.current.last = null;
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (guess.trim()) {
      socket.emit("guess", { roomCode, guess });
      setGuess("");
    }
  };

  const handlePlayAgain = () => {
    socket.emit("playAgain", roomCode);
    setGameEnd(false);
    setChat([]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded shadow">
      <div className="flex justify-between mb-2">
        <div>Room: <span className="font-mono">{roomCode}</span></div>
        <div>Round: {currentRound}/5</div>
      </div>
      <div className="flex justify-between mb-2">
        <div>Scores: {Object.entries(currentScores).map(([id, score]) => (
          <span key={id} className={id === playerId ? "font-bold" : ""}>{id === playerId ? "You" : "Opponent"}: {score} </span>
        ))}</div>
        <div>Role: <span className="font-bold">{drawer ? "Drawer" : "Guesser"}</span></div>
      </div>
      {drawer && !gameEnd && (
        <div className="mb-2">Your word: <span className="font-bold">{currentWord}</span></div>
      )}
      <canvas
        ref={canvasRef}
        width={500}
        height={400}
        className="border mb-2"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: "#f9fafb" }}
      />
      <div className="mb-2">
        <div className="h-32 overflow-y-auto border p-2 bg-gray-50 rounded">
          {chat.map((msg, i) => (
            <div key={i}><span className="font-bold">{msg.sender === playerId ? "You" : "Opponent"}:</span> {msg.message}</div>
          ))}
        </div>
        {!drawer && !gameEnd && (
          <form onSubmit={handleGuess} className="flex mt-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
              placeholder="Type your guess..."
            />
            <button type="submit" className="ml-2 px-4 py-1 bg-blue-500 text-white rounded">Guess</button>
          </form>
        )}
      </div>
      {gameEnd && (
        <div className="mt-4 text-center">
          <div className="text-xl font-bold mb-2">Game Over!</div>
          <div className="mb-2">Final Scores:</div>
          <div>{Object.entries(currentScores).map(([id, score]) => (
            <div key={id}>{id === playerId ? "You" : "Opponent"}: {score}</div>
          ))}</div>
          <button onClick={handlePlayAgain} className="mt-4 px-4 py-2 bg-green-500 text-white rounded">Play Again</button>
        </div>
      )}
    </div>
  );
}

export default Game;
