const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("gameContainer");

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const endButton = document.getElementById("endButton");
const menuDiv = document.getElementById("menu");
const gameTypeSelection = document.getElementById("gameTypeSelection");
const normalGameBtn = document.getElementById("normalGameBtn");
const specialGameBtn = document.getElementById("specialGameBtn");

let roomId = null;
let role = null; // "playerA" o "playerB"
let gameState = null;
let gameType = "normal"; // "normal" o "special"

createRoomBtn.onclick = () => {
  menuDiv.style.display = "none";
  gameTypeSelection.style.display = "block";
};

joinRoomBtn.onclick = () => {
  const code = roomInput.value.trim().toUpperCase();
  if (code) {
    socket.emit("joinRoom", code);
  }
};

normalGameBtn.onclick = () => {
  gameType = "normal";
  socket.emit("createRoom", gameType);
};

specialGameBtn.onclick = () => {
  gameType = "special";
  socket.emit("createRoom", gameType);
};

endButton.onclick = () => {
  if (roomId) {
    socket.emit("endGame", roomId);
  }
};

socket.on("roomCreated", (code) => {
  roomId = code;
  role = "playerA";
  gameTypeSelection.style.display = "none";
  menuDiv.style.display = "block";
  roomCodeDisplay.textContent = `Sala creada: ${code}\nEsperando jugador...`;
});

socket.on("roomJoined", (code) => {
  roomId = code;
  role = "playerB";
  roomCodeDisplay.textContent = `Unido a la sala: ${code}`;
  menuDiv.style.display = "block";
});

socket.on("roomFull", () => {
  alert("La sala está llena o no existe.");
});

socket.on("startGame", (type) => {
  gameType = type;
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
  canvas.style.display = "none";
  endButton.style.display = "none";
  menuDiv.style.display = "block";
  gameTypeSelection.style.display = "none";
  
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

  const containerWidth = gameContainer.clientWidth;
  const scale = Math.min(1, containerWidth / 800);
  
  canvas.style.width = `${800 * scale}px`;
  canvas.style.height = `${400 * scale}px`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar cancha
  ctx.fillStyle = "white";
  ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);

  // Paletas
  ctx.fillRect(10, gameState.playerA.y, 10, 100);
  ctx.fillRect(canvas.width - 20, gameState.playerB.y, 10, 100);

  // Bola(s)
  if (gameType === "special" && gameState.balls) {
    gameState.balls.forEach(ball => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (gameState.ball) {
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Puntuaciones
  ctx.font = "30px Arial";
  ctx.fillText(gameState.scoreA, canvas.width / 4, 50);
  ctx.fillText(gameState.scoreB, (canvas.width * 3) / 4, 50);
  
  // Indicador de partida especial
  if (gameType === "special") {
    ctx.font = "20px Arial";
    ctx.fillText("PARTIDA ESPECIAL", canvas.width / 2 - 100, 30);
    
    // Mostrar efectos activos
    if (gameState.activeEffects && gameState.activeEffects.length > 0) {
      ctx.font = "16px Arial";
      gameState.activeEffects.forEach((effect, index) => {
        ctx.fillText(`Efecto: ${effect.type}`, 20, 30 + index * 20);
      });
    }
  }
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
