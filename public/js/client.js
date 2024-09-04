import { WebSocketManager } from './ws.js';
import { registerEventListeners, setupWebSocketHandlers } from './events.js';
import { toggleDisplay } from './ui.js';



// Load the variables from the index.ejs
const playerName = window.playerName;
const roomCode = window.roomCode;
const isHost = window.isHost;

// Initialize webSocket
const wsManager = new WebSocketManager('ws://localhost:3000');  //wss://heads-up-1.onrender.com

wsManager.init(roomCode, playerName, isHost);


// Set up WebSocket message handlers
setupWebSocketHandlers(wsManager);

// Set up event listeners
registerEventListeners(wsManager);


// Display the room code on the screen
const roomCodeParagraph = document.getElementById("room-code");
roomCodeParagraph.textContent = roomCode;

