const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Game Logic ---
const WORDS = ["cat", "house", "car", "tree", "dog", "fish", "apple", "star", "book", "phone"];
const rooms = {};

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

io.on("connection", (socket) => {
  socket.on("createRoom", (cb) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
      players: [socket.id],
      scores: {},
      round: 1,
      maxRounds: 5,
      word: getRandomWord(),
      drawer: socket.id,
      guesser: null,
      finished: false
    };
    socket.join(roomCode);
    cb({ roomCode });
  });

  socket.on("joinRoom", (roomCode, cb) => {
    const room = rooms[roomCode];
    if (!room || room.players.length >= 2) {
      cb({ error: "Room not found or full" });
      return;
    }
    room.players.push(socket.id);
    room.guesser = socket.id;
    room.scores[socket.id] = 0;
    room.scores[room.drawer] = 0;
    socket.join(roomCode);
    // Notify both players
    io.to(roomCode).emit("gameStart", {
      drawer: room.drawer,
      guesser: room.guesser,
      word: room.word,
      round: room.round,
      scores: room.scores
    });
    cb({ success: true });
  });

  socket.on("drawing", ({ roomCode, data }) => {
    socket.to(roomCode).emit("drawing", data);
  });

  socket.on("guess", ({ roomCode, guess }) => {
    const room = rooms[roomCode];
    if (!room || room.finished) return;
    io.to(roomCode).emit("chat", { sender: socket.id, message: guess });
    if (guess.trim().toLowerCase() === room.word.toLowerCase() && socket.id === room.guesser) {
      room.scores[socket.id] += 1;
      // Swap roles
      [room.drawer, room.guesser] = [room.guesser, room.drawer];
      room.round += 1;
      if (room.round > room.maxRounds) {
        room.finished = true;
        io.to(roomCode).emit("gameEnd", { scores: room.scores });
      } else {
        room.word = getRandomWord();
        io.to(roomCode).emit("nextRound", {
          drawer: room.drawer,
          guesser: room.guesser,
          word: room.word,
          round: room.round,
          scores: room.scores
        });
      }
    }
  });

  socket.on("playAgain", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.round = 1;
    room.finished = false;
    room.word = getRandomWord();
    io.to(roomCode).emit("gameStart", {
      drawer: room.drawer,
      guesser: room.guesser,
      word: room.word,
      round: room.round,
      scores: room.scores
    });
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players.includes(socket.id)) {
        io.to(code).emit("playerLeft");
        delete rooms[code];
      }
    }
  });
});
