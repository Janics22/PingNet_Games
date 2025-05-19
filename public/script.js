const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const endButton = document.getElementById("endButton");
const menuDiv = document.getElementById("menu");

let roomId = null;
let role = null; // "playerA" o "playerB"
let gameState = null;

createRoomBtn.onclick = () => {
  socket.emit("createRoom");
};

joinRoomBtn.onclick = () => {
  const code = roomInput.value.trim().toUpperCase();
  if (code) {
    socket.emit("joinRoom", code);
  }
};

endButton.onclick = () => {
  if (roomId) {
    socket.emit("endGame", roomId);
  }
};

socket.on("roomCreated", (code) => {
  roomId = code;
  role = "playerA";
  roomCodeDisplay.textContent = `Sala creada: ${code}\nEsperando jugador...`;
});

socket.on("roomJoined", (code) => {
  roomId = code;
  role = "playerB";
  roomCodeDisplay.textContent = `Unido a la sala: ${code}`;
});

socket.on("roomFull", () => {
  alert("La sala está llena o no existe.");
});

socket.on("startGame", () => {
  menuDiv.style.display = "none";
  canvas.style.display = "block";
  endButton.style.display = "inline";

  initGame();
  requestAnimationFrame(gameLoop);
});

socket.on("gameState", (state) => {
  gameState = state;
  drawGame();
});

socket.on("gameEnded", () => {
  // Volver al menú inicial
  canvas.style.display = "none";
  endButton.style.display = "none";
  menuDiv.style.display = "block";

  roomCodeDisplay.textContent = "";
  gameState = null;
  role = null;
  roomId = null;
});

socket.on("errorMsg", (msg) => {
  alert(msg);
});

function initGame() {
  // En esta versión el servidor controla la lógica, aquí solo dibujamos.
}

function drawGame() {
  if (!gameState) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar cancha
  ctx.fillStyle = "white";
  ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);

  // Paletas
  ctx.fillRect(10, gameState.playerA.y, 10, 100);
  ctx.fillRect(canvas.width - 20, gameState.playerB.y, 10, 100);

  // Bola
  ctx.beginPath();
  ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Puntuaciones
  ctx.font = "30px Arial";
  ctx.fillText(gameState.scoreA, canvas.width / 4, 50);
  ctx.fillText(gameState.scoreB, (canvas.width * 3) / 4, 50);
}

// Movimiento con ratón para la paleta del jugador
canvas.addEventListener("mousemove", (e) => {
  if (!roomId || !role) return;

  const rect = canvas.getBoundingClientRect();
  let y = e.clientY - rect.top - 50; // centrar paleta

  // Limitar para que no salga del canvas
  y = Math.max(0, Math.min(canvas.height - 100, y));

  socket.emit("paddleMove", { roomId, role, y });
});

function gameLoop() {
  if (!gameState) {
    requestAnimationFrame(gameLoop);
    return;
  }
  drawGame();
  requestAnimationFrame(gameLoop);
}
