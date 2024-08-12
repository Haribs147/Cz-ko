import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import ejs from 'ejs';
import bodyParser from 'body-parser';

// Create the Express app and HTTP server
const app = express();
const server = createServer(app);

// Set up the WebSocket server
const wss = new WebSocketServer({ server });

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const characters = [];

wss.on('connection', function connection(ws) {
  console.log('A new client Connected!');

  ws.on('message', function message(data) {
    console.log(`received message : ${data}`);

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === ws.OPEN) {
        // Ensure that data is a string
        client.send(JSON.stringify(JSON.parse(data)));
      }
    });
  });

}); 

app.get('/', (req, res) => {
  res.render('index', { message: null });
});



server.listen(3000, () => {
  console.log('Listening on port 3000');
});
