import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import ejs, { name } from 'ejs';
import bodyParser from 'body-parser';
import pg from 'pg';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

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

    if(message.type === 'name'){

      try {

        // Get names from the db
        const result = await db.query(
          "SELECT players.name FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1"
          , [message.roomCode]);

        const sendNames = {
          type: 'name',
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
  const name = req.body.name;
  const action = req.body.action;
  const code = req.body.room;

  if (name) {
    if (action === 'create') {
      console.log(`Creating room for: ${name}`);
      const generatedCode = generateRandomCode(5);
      try {
        const roomResult = await db.query(
          "INSERT INTO game_room (code, host_id) VALUES ($1, $2) RETURNING ID",
          [generatedCode, 0]
        );
        const roomId = roomResult.rows[0].id;

        await db.query(
          "INSERT INTO players (name, room_id) VALUES ($1, $2)",
          [name, roomId]
        );

        res.render('index', { name: name, code: generatedCode });
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

          await db.query(
            "INSERT INTO players (name, room_id) VALUES ($1, $2)",
            [name, roomId]
          );
          res.render('index', { name: name, code: code });
        } else {
          res.status(404).json({ message: 'Room not found.' });
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
