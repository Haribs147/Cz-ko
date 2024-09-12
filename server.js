import express from "express";
import { createServer } from "http";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import { setupDatabase } from "./models/db.js";
import { setupWebSocketServer } from "./services/webSocketService.js";
import { renderLogin, handleNameSubmission } from "./routes/routes.js";

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

// Routes
app.get("/", renderLogin);
app.post("/submit-name", handleNameSubmission);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}`);
});
