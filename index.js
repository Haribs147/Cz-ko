import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import ejs, { name } from 'ejs';
import bodyParser from 'body-parser';
import pg from 'pg';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { type } from 'os';

// Load environment variables from .env file
dotenv.config();

// Create the Express app and HTTP server
const app = express();
const server = createServer(app);

app.use(express.static(path.join(path.resolve(), 'public')));

// Setup the database
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
});
db.connect();

// Set up the WebSocket server
const wss = new WebSocketServer({ server });

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function setupDatabase() {
  try {

    // SQL commands to create tables
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS game_room (
        ID SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        host_id INT
      );

      CREATE TABLE IF NOT EXISTS players (
        ID SERIAL PRIMARY KEY,
        name VARCHAR(15) NOT NULL,
        character VARCHAR(20),
        isReady INT,
        room_id INT REFERENCES game_room(ID)
      );
    `;

    // Execute the SQL commands
    await db.query(createTablesQuery);

    console.log('Database setup complete.');

  } catch (err) {
    console.error('Error setting up the database:', err);
  } finally {
    // Close the connection
  }
}

// Run the setup function
setupDatabase();

wss.on('connection',async function connection(ws) {
  console.log('A new client Connected!');

  


  ws.on('message', async function message(data) {
    console.log(`received message: ${data}`);

    const message = JSON.parse(data);

    if(message.type === 'get-characters-request'){
      try {
        // Fetch all characters and their respective player names in the room 
        const charactersResult = await db.query(
          `SELECT players.name, players.character FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1 AND players.character IS NOT NULL`,
          [message.roomCode]
        );
  
        // Send all characters and opponent names to the newly connected client
        const sendCharacters = {
          type: 'existingCharacters',
          characters: charactersResult.rows,
          roomCode: message.roomCode,
        };
        console.log(`CHARACTERS SEND WUT ${charactersResult}`)
        ws.send(JSON.stringify(sendCharacters));
      } catch (err) {
        console.log('Error sending existing characters:', err);
        ws.send(JSON.stringify({ message: 'An error occurred while sending the existing characters' }));
      }
    }

    if(message.type === 'updateDB'){
      
      try {
        
        const playerName = message.playerName;
        const roomCode = message.roomCode;
        const character = message.character;
        const oponentName = message.oponentName
        // Update the ready status of the player that clicked the button
        await db.query(
          `UPDATE players 
           SET isReady = 1 
           FROM game_room 
           WHERE players.room_id = game_room.ID 
           AND players.name = $1 
           AND game_room.code = $2;`,
          [playerName, roomCode]
        );

        // Update the character of the opponent of the player that clicked the button
        await db.query(
          `UPDATE players 
           SET character = $1 
           FROM game_room 
           WHERE players.room_id = game_room.ID 
           AND players.name = $2 
           AND game_room.code = $3;`,
          [character, oponentName, roomCode]
        );

        console.log(`Player ${playerName} in room ${roomCode} is now ready and the character for ${oponentName} is added to db.`);

      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'An error occurred while updating the status of a player' });
      }
    }

    if(message.type === 'get-data-from-db'){

      try {

        // Get data from the db
        const result = await db.query(
          "SELECT players.name, players.character, players.isready FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1"
          , [message.roomCode]);

        const sendNames = {
          type: 'names',
          allNames: result.rows,
          roomCode: message.roomCode,
        };
        console.log(sendNames);

        // Send all of the players names back
        wss.clients.forEach(function each(client) {
          if (client.readyState === ws.OPEN) {
            // Ensure that data is a string
            client.send(JSON.stringify(sendNames));
          }
        });

      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'An error occurred while getting the names of the players' });
      }

    } else{
      
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === ws.OPEN) {
          // Ensure that data is a string
          client.send(JSON.stringify(message));
        }
      });

    }
    

  });
});

app.get('/', (req, res) => {
  res.render('login');
});

app.post('/submit-name', async (req, res) => {
  const name = req.body.name.charAt(0).toUpperCase() + req.body.name.slice(1).toLowerCase(); // Make the first letter of the name uppercase
  const action = req.body.action;
  const code = req.body.room;

  if (name) {
    if (action === 'create') {
      console.log(`Creating room for: ${name}`);
      let generatedCode = generateRandomCode(5);
    
      try {

        let isCodeTaken = true;
        while (isCodeTaken) {
          const result = await db.query("SELECT ID FROM game_room WHERE code = $1", [generatedCode]);
          if (result.rows.length === 0) {
            isCodeTaken = false;
          } else {
            // Generate a new code if it's taken
            generatedCode = generateRandomCode(5);
          }
        }

        const roomResult = await db.query(
          "INSERT INTO game_room (code, host_id) VALUES ($1, $2) RETURNING ID",
          [generatedCode, 0]
        );
        const roomId = roomResult.rows[0].id;

        await db.query(
          "INSERT INTO players (name, room_id) VALUES ($1, $2)",
          [name, roomId]
        );

        res.render('index', { name: name, code: generatedCode, isHost: 1 });
      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'An error occurred while creating the room.' });
      }
    } else if (action === 'join') {
      console.log(`Joining room for: ${name}`);

      try {

        // Check if the room exists
        const result = await db.query(
          "SELECT ID FROM game_room WHERE code = $1",
          [code]
        );

        if (result.rows.length > 0) {
          const roomId = result.rows[0].id;

          // Check if the player name is unique
          const nameCheck = await db.query(
            "SELECT name FROM players WHERE room_id = $1 AND name = $2",
            [roomId, name]
          );
          
          if (nameCheck.rows.length > 0) {
            res.render('error-handler', { error: name, type: "duplicate-name" });
          } else {
            await db.query(
              "INSERT INTO players (name, room_id) VALUES ($1, $2)",
              [name, roomId]
            );
            res.render('index', { name: name, code: code, isHost: 0 });
          }

        } else {
          res.render('error-handler', { error: code, type: "room-code"});
        }
      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'An error occurred while joining the room.' });
      }
    } else {
      res.status(400).json({ message: 'Invalid action.' });
    }
  } else {
    res.status(400).json({ message: 'Name is required.' });
  }
});

function generateRandomCode(length) {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
}

server.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
