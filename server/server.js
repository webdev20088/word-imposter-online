const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const categories = require("./categories.json");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ category, rounds, imposters, players }) => {
    const code = generateRoomCode();
    rooms[code] = {
      host: socket.id,
      category,
      rounds,
      imposters: imposters === "" ? null : parseInt(imposters, 10),
      players,
      seen: new Set(),
      assignment: {}
    };
    socket.join(code);
    socket.emit("roomCreated", { code });
    io.to(code).emit("updatePlayers", { players, seen: [] });
  });

  socket.on("joinRoom", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    socket.join(code);
    socket.emit("joinedRoom", { code, players: room.players, seen: Array.from(room.seen) });
  });

  socket.on("revealWord", ({ room, playerId }) => {
    const r = rooms[room];
    if (!r || r.seen.has(playerId)) return;
    r.seen.add(playerId);
    const word = r.assignment[playerId];
    if (!word) return;
    socket.emit("showWord", word);
    io.to(room).emit("updatePlayers", { players: r.players, seen: Array.from(r.seen) });
  });

  socket.on("nextRound", ({ room }) => {
    const r = rooms[room];
    if (!r) return;
    r.seen.clear();

    const items = categories[r.category];
    if (!items || items.length < 2) return;

    let crewWord = items[Math.floor(Math.random() * items.length)];
    let imposterWord = crewWord;
    while (imposterWord === crewWord) {
      imposterWord = items[Math.floor(Math.random() * items.length)];
    }

    const shuffled = [...r.players].sort(() => Math.random() - 0.5);
    const impostersCount = r.imposters || Math.floor(Math.random() * (r.players.length - 1)) + 1;
    const imposterIds = new Set(shuffled.slice(0, impostersCount).map(p => p.id));

    r.players.forEach(p => {
      r.assignment[p.id] = imposterIds.has(p.id) ? imposterWord : crewWord;
    });

    io.to(room).emit("updatePlayers", { players: r.players, seen: [] });
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      if (rooms[code].host === socket.id) {
        delete rooms[code];
        io.to(code).emit("roomClosed");
      }
    }
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
