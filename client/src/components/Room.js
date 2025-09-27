import React, { useState } from "react";
import { socket } from "../socket";

function Room({ onStart }) {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [role, setRole] = useState("");
  const [word, setWord] = useState("");
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({});

  const handleCreate = () => {
    console.log("Create Room button clicked");
    socket.emit("createRoom", ({ roomCode }) => {
      console.log("createRoom callback received", roomCode);
      setRoomCode(roomCode);
      setPlayerId(socket.id);
      setRole("drawer");
    });
  };

  const handleJoin = () => {
    if (!roomCode) return;
    socket.emit("joinRoom", roomCode, (res) => {
      if (res.error) {
        setError(res.error);
      } else {
        setJoined(true);
        setPlayerId(socket.id);
        setRole("guesser");
      }
    });
  };

  React.useEffect(() => {
    socket.on("gameStart", (data) => {
      setRole(data.drawer === socket.id ? "drawer" : "guesser");
      setWord(data.word);
      setRound(data.round);
      setScores(data.scores);
      onStart({ roomCode, playerId: socket.id, role: data.drawer === socket.id ? "drawer" : "guesser", word: data.word, round: data.round, scores: data.scores });
    });
    return () => {
      socket.off("gameStart");
    };
  }, [roomCode, onStart]);

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded shadow mt-8">
      <h2 className="text-xl font-bold mb-4">Join or Create Room</h2>
      <div className="mb-4">
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded mr-2">Create Room</button>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="border rounded px-2 py-1 mr-2"
          placeholder="Room Code"
        />
        <button onClick={handleJoin} className="px-4 py-2 bg-green-500 text-white rounded">Join Room</button>
      </div>
      {roomCode && (
        <div className="mb-2">Share this code with your friend: <span className="font-mono font-bold">{roomCode}</span></div>
      )}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}

export default Room;
