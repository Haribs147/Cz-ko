import { randomBytes } from "crypto";
import { db } from "../models/db.js";

var codeLength = 5;

export const renderLogin = (req, res) => {
  res.render("login");
};

export const handleNameSubmission = async (req, res) => {
  const name = req.body.name.charAt(0).toUpperCase() + req.body.name.slice(1).toLowerCase();
  const action = req.body.action;
  const code = req.body.room;

  if (!name) {
    return res.status(400).json({ message: "Name is required." });
  }

  if (action === "create") {
    await createRoom(name, res);
  } else if (action === "join") {
    await joinRoom(name, code, res);
  } else {
    res.status(400).json({ message: "Invalid action." });
  }
};

async function createRoom(name, res) {
  try {
    let generatedCode = generateRandomCode(codeLength);
    let isCodeTaken = true;

    while (isCodeTaken) {
      const result = await db.query(
        "SELECT ID FROM game_room WHERE code = $1",
        [generatedCode]
      );
      if (result.rows.length === 0){
        isCodeTaken = false;
      } else {
        generatedCode = generateRandomCode(codeLength);
      } 
    }

    const roomResult = await db.query(
        "INSERT INTO game_room (code) VALUES ($1) RETURNING ID",
        [generatedCode]
    );
    const roomId = roomResult.rows[0].id;

    await db.query(
        "INSERT INTO players (name, room_id) VALUES ($1, $2)",
        [name, roomId]
    );

    res.render("index", { name: name, code: generatedCode, isHost: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while creating the room." });
  }
}

async function joinRoom(name, code, res) {
  try {
    const result = await db.query(
        "SELECT ID, has_started FROM game_room WHERE code = $1",
        [code]
    );

    if (result.rows.length === 0) {
      return res.render("error-handler", { error: code, type: "room-code" });
    }

    const roomId = result.rows[0].id;
    const hasStarted = result.rows[0].has_started;
    const nameCheck = await db.query(
        "SELECT name FROM players WHERE room_id = $1 AND name = $2",
        [roomId, name]
    );
    if (nameCheck.rows.length > 0) {
      return res.render("error-handler", { error: name, type: "duplicate-name" });
    } else if (hasStarted != null) {
      return res.render("error-handler", { error: code, type: "the-game-has-started" });
    } else {
      await db.query(
            "INSERT INTO players (name, room_id) VALUES ($1, $2)",
            [name, roomId]
      );
      return res.render("index", { name: name, code: code, isHost: 0 });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while joining the room." });
  }
}

function generateRandomCode(length) {
    return randomBytes(Math.ceil(length / 2))
      .toString("hex")
      .slice(0, length)
      .toUpperCase();
  }
  