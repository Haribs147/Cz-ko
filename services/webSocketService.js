import { WebSocketServer } from 'ws';
import { db } from '../models/db.js';
import { fetchImageUrl } from './apiService.js';

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async function connection(ws) {
    console.log('A new client connected!');

    ws.on('message', async function message(data) {
      const message = JSON.parse(data);
      handleMessage(message, wss, ws);
    });

    ws.on('close', async function () {
      handleClientDisconnect(ws);
    });
  });

  return wss;
}

async function handleMessage(message, wss, ws) {
  switch (message.type) {
    case 'get-data-from-db':
      await handleGetDataFromDb(message, wss, ws);
      break;
    case 'sendCharacters':
      await handleSendCharacters(message, wss, ws);
      break;
    case 'start-game':
        await handleStartGame(message, wss, ws)
    default:
      broadcastMessage(message, wss, ws);
      break;
  }
}

async function handleGetDataFromDb(message, wss, ws) {
    if (message.name && message.roomCode) {
        ws.playerName = message.name; // Store playerName in ws object
        ws.roomCode = message.roomCode; // Store roomCode in ws object
    }
    try {
    const result = await db.query(
      'SELECT players.name, players.character, players.isready, players.url FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1',
      [message.roomCode]
    );
    const sendNames = { 
        type: 'dataFromDb',
        data: result.rows,
        roomCode: message.roomCode 
    };
    broadcastMessage(sendNames, wss, ws);
  } catch (err) {
    console.error('Error getting data from DB:', err);
  }
}

async function handleSendCharacters(message, wss, ws) {
  try {
    message.url = await fetchImageUrl(message.character);
    broadcastMessage(message, wss, ws);
    await updatePlayerData(message);
  } catch (err) {
    console.error('Error sending characters:', err);
  }
}

async function updatePlayerData(message) {
  try {
    await db.query(
      `UPDATE players SET isReady = 1 FROM game_room WHERE players.room_id = game_room.ID AND players.name = $1 AND game_room.code = $2;`,
      [message.playerName, message.roomCode]
    );
    await db.query(
      `UPDATE players SET character = $1, url = $2 FROM game_room WHERE players.room_id = game_room.ID AND players.name = $3 AND game_room.code = $4;`,
      [message.character, message.url, message.opponentName, message.roomCode]
    );
  } catch (err) {
    console.error('Error updating player data:', err);
  }
}

async function handleStartGame(message, wss, ws) {
    await db.query(
        `UPDATE game_room 
         SET has_started = 1 
         WHERE game_room.code = $1;`,
        [message.roomCode]
    );
    broadcastMessage(message, wss, ws);
}

function broadcastMessage(message, wss, ws) {
  wss.clients.forEach(client => {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

async function handleClientDisconnect(ws) {
  try {
    if (ws.playerName && ws.roomCode) {
        const roomResult = await db.query(
            'SELECT ID FROM game_room WHERE code = $1',
            [ws.roomCode]
        );
        const roomId = roomResult.rows[0].id;
        await db.query(
            'DELETE FROM players WHERE name = $1 AND room_id = $2',
            [ws.playerName, roomId]
        );
        console.log(`Player ${ws.playerName} has been removed from room ${ws.roomCode}`);
        // Check if there are any players left in the room
        const playerCountResult = await db.query(
            "SELECT COUNT(*) FROM players WHERE room_id = $1",
            [roomId]
          );

          // Convert to int
        const playerCount = parseInt(playerCountResult.rows[0].count, 10);

          // If no players are left, delete the room
        if (playerCount === 0) {
            await db.query("DELETE FROM game_room WHERE id = $1", [roomId]);
            console.log(
              `Room ${ws.roomCode} has been deleted because there are no players left.`
            );
          }
    }
  } catch (err) {
    console.error('Error handling player disconnection:', err);
  }
}
