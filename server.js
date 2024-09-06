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
import { setupWebSocketServer } from './webSocketService.js';

// Load environment variables from .env file
dotenv.config();

// Create the Express app and HTTP server
const app = express();
const server = createServer(app);
const __dirname = path.resolve();

// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));

// Run the setup function
setupDatabase();

// Initialize WebSocket server
setupWebSocketServer(server);

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
