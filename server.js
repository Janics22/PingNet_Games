const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

function generateRoomCode(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createInitialGameState() {
  return {
    playerA: { y: 150 },
    playerB: { y: 150 },
    ball: { x: 400, y: 200, vx: 5, vy: 5 },
    scoreA: 0,
    scoreB: 0,
  };
}

const games = {};      // { roomId: { players: {playerA: socketId, playerB: socketId}, gameState, intervalId } }
const intervals = {};

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("createRoom", () => {
    let roomId;
    do {
      roomId = generateRoomCode();
    } while (games[roomId]);

    games[roomId] = {
      players: { playerA: socket.id },
      gameState: createInitialGameState(),
    };

    socket.join(roomId);
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    const game = games[roomId];
    if (!game) {
      socket.emit("errorMsg", "Sala no existe.");
      return;
    }
    if (game.players.playerB) {
      socket.emit("roomFull");
      return;
    }

    game.players.playerB = socket.id;
    game.gameState = createInitialGameState();

    socket.join(roomId);
    socket.emit("roomJoined", roomId);
    io.to(roomId).emit("startGame");

    // Empezar el loop del juego para esta sala
    intervals[roomId] = setInterval(() => {
      updateGame(roomId);
    }, 1000 / 60); // 60 FPS
  });

  socket.on("paddleMove", ({ roomId, role, y }) => {
    const game = games[roomId];
    if (!game) return;

    if (role === "playerA") {
      game.gameState.playerA.y = y;
    } else if (role === "playerB") {
      game.gameState.playerB.y = y;
    }
  });

  socket.on("endGame", (roomId) => {
    const room = games[roomId];
    if (room) {
      io.to(roomId).emit("gameEnded");

      clearInterval(intervals[roomId]);
      delete games[roomId];
      delete intervals[roomId];
    }
  });

  socket.on("disconnect", () => {
    // Limpiar jugador de salas en las que estaba
    for (const roomId in games) {
      const game = games[roomId];

      if (game.players.playerA === socket.id) {
        delete game.players.playerA;
      }
      if (game.players.playerB === socket.id) {
        delete game.players.playerB;
      }

      if (!game.players.playerA && !game.players.playerB) {
        clearInterval(intervals[roomId]);
        delete games[roomId];
        delete intervals[roomId];
      }
    }
  });
});

function updateGame(roomId) {
  const game = games[roomId];
  if (!game) return;

  const state = game.gameState;

  // Actualizar posición de la bola
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  // Rebotes en paredes superior e inferior
  if (state.ball.y < 10 || state.ball.y > 390) {
    state.ball.vy = -state.ball.vy;
  }

  // Velocidad máxima para evitar que sea demasiado rápida
  const maxSpeed = 15;
  const speedIncrement = 0.25; // cuánto aumenta la velocidad en cada rebote de paleta

  // Rebotes en paletas
  // Paleta A
  if (
    state.ball.x < 30 &&
    state.ball.y > state.playerA.y &&
    state.ball.y < state.playerA.y + 100 &&
    state.ball.vx < 0 // asegurar que la bola viene hacia la paleta
  ) {
    state.ball.vx = -state.ball.vx;

    // Incrementar velocidad X (en la dirección actual)
    if (Math.abs(state.ball.vx) < maxSpeed) {
      state.ball.vx += state.ball.vx > 0 ? speedIncrement : -speedIncrement;
    }
    // Incrementar velocidad Y también para darle un poco de dinámica
    if (Math.abs(state.ball.vy) < maxSpeed) {
      state.ball.vy += state.ball.vy > 0 ? speedIncrement / 2 : -speedIncrement / 2;
    }
  }

  // Paleta B
  if (
    state.ball.x > 770 &&
    state.ball.y > state.playerB.y &&
    state.ball.y < state.playerB.y + 100 &&
    state.ball.vx > 0 // asegurar que la bola viene hacia la paleta
  ) {
    state.ball.vx = -state.ball.vx;

    // Incrementar velocidad X
    if (Math.abs(state.ball.vx) < maxSpeed) {
      state.ball.vx += state.ball.vx > 0 ? speedIncrement : -speedIncrement;
    }
    // Incrementar velocidad Y
    if (Math.abs(state.ball.vy) < maxSpeed) {
      state.ball.vy += state.ball.vy > 0 ? speedIncrement / 2 : -speedIncrement / 2;
    }
  }

  // Goles
  if (state.ball.x < 0) {
    state.scoreB++;
    resetBall(state);
  } else if (state.ball.x > 800) {
    state.scoreA++;
    resetBall(state);
  }

  io.to(roomId).emit("gameState", state);
}


function resetBall(state) {
  state.ball.x = 400;
  state.ball.y = 200;
  // Cambiar dirección de la bola para que no siempre vaya igual
  state.ball.vx = -state.ball.vx;
}
