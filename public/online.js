const socket = io("https://word-imposter-online.onrender.com/"); // Change to your Render URL when deploying

// Elements
const sections = {
  landing: document.getElementById("onlineLanding"),
  hostSetup: document.getElementById("hostSetup"),
  game: document.getElementById("onlineGame"),
};
const playersContainerOnline = document.getElementById("playersContainerOnline");
const playerListOnline = document.getElementById("playerListOnline");
const modal = document.getElementById("revealModal");
const modalWord = document.getElementById("modalWord");
const modalCloseBtn = document.getElementById("modalCloseBtn");

let localRoomCode = "";
let isHost = false;

// Navigation
function show(section) {
  Object.values(sections).forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
}

// Host setup UI
let players = [];
function renderPlayerInputs() {
  playersContainerOnline.innerHTML = "";
  players.forEach((p, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "player-input";
    wrap.innerHTML = `
      <div class="index">${idx+1}</div>
      <input type="text" class="input" placeholder="Player ${idx+1}" value="${p.name}" data-id="${p.id}" />
      ${players.length > 3 ? `<button class="btn subtle remove" data-id="${p.id}">−</button>` : ""}
    `;
    playersContainerOnline.appendChild(wrap);
  });
  playersContainerOnline.querySelectorAll("input.input").forEach(inp => {
    inp.addEventListener("input", e => {
      const id = e.target.dataset.id;
      const player = players.find(pl => pl.id === id);
      if (player) player.name = e.target.value;
    });
  });
  playersContainerOnline.querySelectorAll("button.remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      players = players.filter(p => p.id !== id);
      renderPlayerInputs();
    });
  });
}
function addPlayer() {
  players.push({ id: Math.random().toString(36).slice(2,9), name: "" });
  renderPlayerInputs();
}
function ensureThreePlayers() {
  while (players.length < 3) addPlayer();
}
ensureThreePlayers();

// Player chips UI
function renderPlayerChips(playerArr, seenSet) {
  playerListOnline.innerHTML = "";
  playerArr.forEach(p => {
    const chip = document.createElement("div");
    chip.className = "player-chip";
    chip.textContent = p.name || "Unnamed";
    chip.dataset.id = p.id;
    if (seenSet.has(p.id)) chip.style.opacity = 0.5;
    chip.addEventListener("click", () => {
      socket.emit("revealWord", { room: localRoomCode, playerId: p.id });
    });
    playerListOnline.appendChild(chip);
  });
}

// Modal
modalCloseBtn.addEventListener("click", () => modal.classList.add("hidden"));

// Event listeners
document.getElementById("hostOnlineBtn").onclick = () => { isHost = true; show(sections.hostSetup); };
document.getElementById("joinOnlineBtn").onclick = () => {
  const code = prompt("Enter room code:");
  if (code) socket.emit("joinRoom", { code: code.trim() });
};
document.getElementById("backBtn").onclick = () => window.location.href = "index.html";
document.getElementById("backToLandingBtn1").onclick = () => show(sections.landing);
document.getElementById("addPlayerOnlineBtn").onclick = addPlayer;

document.getElementById("createRoomBtn").onclick = () => {
  const category = document.getElementById("categorySelectOnline").value;
  const rounds = parseInt(document.getElementById("roundsOnlineInput").value, 10);
  const imposters = document.getElementById("impostersOnlineInput").value.trim();
  players = players.map((p, idx) => ({ ...p, name: p.name || `Player ${idx+1}` }));
  socket.emit("createRoom", { category, rounds, imposters, players });
};

document.getElementById("nextRoundOnlineBtn")?.addEventListener("click", () => {
  socket.emit("nextRound", { room: localRoomCode });
});

// Socket handlers
socket.on("roomCreated", ({ code }) => {
  localRoomCode = code;
  document.getElementById("roomCodeDisplay").textContent = code;
  document.getElementById("hostControls").style.display = "flex";
  show(sections.game);
});

socket.on("joinedRoom", ({ code, players, seen }) => {
  localRoomCode = code;
  document.getElementById("roomCodeDisplay").textContent = code;
  renderPlayerChips(players, new Set(seen));
  show(sections.game);
});

socket.on("updatePlayers", ({ players, seen }) => {
  renderPlayerChips(players, new Set(seen));
});

socket.on("showWord", (word) => {
  modalWord.textContent = word;
  modal.classList.remove("hidden");
});
