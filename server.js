import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import ejs, { name } from "ejs";
import bodyParser from "body-parser";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
import { type } from "os";
import { measureMemory } from "vm";
import axios from "axios";

import {db, setupDatabase } from "./db.js";

// Load environment variables from .env file
dotenv.config();

//api search enginge
const apiKey = process.env.API_KEY;
const searchEngineId = process.env.SEARCH_ENGINE_ID;

// Create the Express app and HTTP server
const app = express();
const server = createServer(app);
const __dirname = path.resolve();

// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Set up the WebSocket server
const wss = new WebSocketServer({ server });

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));


// Run the setup function
setupDatabase();

wss.on("connection", async function connection(ws) {
  console.log("A new client Connected!");

  ws.on("message", async function message(data) {
    console.log(`received message: ${data}`);

    var message = JSON.parse(data);
    console.log(`received message oponent name: ${message.opponentName}`);
    if (message.type === "get-characters-request") {
      try {
        // Fetch all characters and their respective player names in the room
        const charactersResult = await db.query(
          `SELECT players.name, players.character FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1 AND players.character IS NOT NULL`,
          [message.roomCode]
        );

        // Send all characters and opponent names to the newly connected client
        const sendCharacters = {
          type: "existingCharacters",
          characters: charactersResult.rows,
          roomCode: message.roomCode,
        };
        console.log(`CHARACTERS SEND WUT ${charactersResult}`);
        ws.send(JSON.stringify(sendCharacters));
      } catch (err) {
        console.log("Error sending existing characters:", err);
        ws.send(
          JSON.stringify({
            message: "An error occurred while sending the existing characters",
          })
        );
      }
    }

    if (message.type === "get-data-from-db") {
      if (message.name && message.roomCode) {
        ws.playerName = message.name; // Store playerName in ws object
        ws.roomCode = message.roomCode; // Store roomCode in ws object
      }
      try {
        // Get data from the db
        const result = await db.query(
          "SELECT players.name, players.character, players.isready, players.url FROM players JOIN game_room ON players.room_id = game_room.ID WHERE game_room.code = $1",
          [message.roomCode]
        );

        const sendNames = {
          type: "dataFromDb",
          data: result.rows,
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
        res.status(500).json({
          message: "An error occurred while getting the names of the players",
        });
      }
    } else if (message.type === "sendCharacters") {
      console.log(`ZARAZ OCHUJAM CO JEST message: ${message.character}`);
      const query = message.character;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&searchType=image&q=${encodeURIComponent(query)}&num=1`;
      try {
        const response = await axios.get(url);
        const items = response.data.items;
        if (items && items.length > 0) {
          const imageUrl = items[0].link;
          message.url = imageUrl;
        } else {
          message.url = "url('/images/429-status-code.png')";
          console.log("No images found");
        }
      } catch (error) {
        message.url = "url('/images/429-status-code.png')";
        console.log(message);
        console.error("Couldn't download an image from api", error);
      }

      wss.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          // Ensure that data is a string
          client.send(JSON.stringify(message));
        }
      });
      const playerName = message.playerName;
      const roomCode = message.roomCode;
      const character = message.character;
      const opponentName = message.opponentName;
      //UPDATE THE DB
      try {
        
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
           SET character = $1,
               url = $2
           FROM game_room 
           WHERE players.room_id = game_room.ID 
           AND players.name = $3
           AND game_room.code = $4;`,
          [character, message.url, opponentName, roomCode] //
        );

        console.log(
          `Player ${playerName} in room ${roomCode} is now ready and the character for ${opponentName} is added to db.`
        );
      } catch (err) {
        console.log(err);
        res.status(500).json({
          message: "An error occurred while updating the status of a player",
        });
      }  
      

    } else {
      if (message.type === "start-game") {
        await db.query(
          `UPDATE game_room 
           SET has_started = 1 
           WHERE game_room.code = $1;`,
          [message.roomCode]
        );
      }

      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === ws.OPEN) {
          // Ensure that data is a string
          client.send(JSON.stringify(message));
        }
      });
    }
  });

  ws.on("close", async function () {
    try {
      if (ws.playerName && ws.roomCode) {
        // Find the room ID associated with the room code
        const roomResult = await db.query(
          "SELECT ID FROM game_room WHERE code = $1",
          [ws.roomCode]
        );

        if (roomResult.rows.length > 0) {
          const roomId = roomResult.rows[0].id;

          // Remove the player from the database
          await db.query(
            "DELETE FROM players WHERE name = $1 AND room_id = $2",
            [ws.playerName, roomId]
          );

          console.log(
            `Player ${ws.playerName} has been removed from room ${ws.roomCode}`
          );

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
      }
    } catch (err) {
      console.error("Error handling player disconnection:", err);
    }
  });
});

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/submit-name", async (req, res) => {
  const name =
    req.body.name.charAt(0).toUpperCase() +
    req.body.name.slice(1).toLowerCase(); // Make the first letter of the name uppercase
  const action = req.body.action;
  const code = req.body.room;

  if (name) {
    if (action === "create") {
      console.log(`Creating room for: ${name}`);
      let generatedCode = generateRandomCode(5);

      try {
        let isCodeTaken = true;
        while (isCodeTaken) {
          const result = await db.query(
            "SELECT ID FROM game_room WHERE code = $1",
            [generatedCode]
          );
          if (result.rows.length === 0) {
            isCodeTaken = false;
          } else {
            // Generate a new code if it's taken
            generatedCode = generateRandomCode(5);
          }
        }

        const roomResult = await db.query(
          "INSERT INTO game_room (code) VALUES ($1) RETURNING ID",
          [generatedCode]
        );
        const roomId = roomResult.rows[0].id;

        await db.query("INSERT INTO players (name, room_id) VALUES ($1, $2)", [
          name,
          roomId,
        ]);

        res.render("index", { name: name, code: generatedCode, isHost: 1 });
      } catch (err) {
        console.log(err);
        res
          .status(500)
          .json({ message: "An error occurred while creating the room." });
      }
    } else if (action === "join") {
      console.log(`Joining room for: ${name}`);

      try {
        // Check if the room exists
        const result = await db.query(
          "SELECT ID, has_started FROM game_room WHERE code = $1",
          [code]
        );

        if (result.rows.length > 0) {
          const roomId = result.rows[0].id;
          const hasStarted = result.rows[0].has_started;
          // Check if the player name is unique
          const nameCheck = await db.query(
            "SELECT name FROM players WHERE room_id = $1 AND name = $2",
            [roomId, name]
          );

          if (nameCheck.rows.length > 0) {
            res.render("error-handler", {
              error: name,
              type: "duplicate-name",
            });
          } else if (hasStarted != null) {
            res.render("error-handler", {
              error: code,
              type: "the-game-has-started",
            });
          } else {
            await db.query(
              "INSERT INTO players (name, room_id) VALUES ($1, $2)",
              [name, roomId]
            );
            res.render("index", { name: name, code: code, isHost: 0 });
          }
        } else {
          res.render("error-handler", { error: code, type: "room-code" });
        }
      } catch (err) {
        console.log(err);
        res
          .status(500)
          .json({ message: "An error occurred while joining the room." });
      }
    } else {
      res.status(400).json({ message: "Invalid action." });
    }
  } else {
    res.status(400).json({ message: "Name is required." });
  }
});

function generateRandomCode(length) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

server.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
