// Setup the database

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

db.connect();

async function setupDatabase() {
  try {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS game_room (
        ID SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        has_started INT
      );
      CREATE TABLE IF NOT EXISTS players (
        ID SERIAL PRIMARY KEY,
        name VARCHAR(15) NOT NULL,
        character VARCHAR(20),
        isReady INT,
        url VARCHAR(250),
        room_id INT REFERENCES game_room(ID)
      );
    `;
    await db.query(createTablesQuery);
    console.log('Database setup complete.');
  } catch (err) {
    console.error('Error setting up the database:', err);
  }
}

export { db,  setupDatabase};
