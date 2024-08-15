import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import ejs from 'ejs';
import bodyParser from 'body-parser';


// Create the Express app and HTTP server
const app = express();
const server = createServer(app);

app.use(express.static(path.join(path.resolve(), 'public')));


// Set up the WebSocket server
const wss = new WebSocketServer({ server });

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

wss.on('connection', function connection(ws) {

  // ws.send(JSON.stringify(name));
  //send everyone newly connected player his name
  // wss.clients.forEach(function each(client) {
  //   if (client.readyState === ws.OPEN) {
  //     ws.send(JSON.stringify("name-broadcast")); //info that this message is a name broadcast
  //     ws.send(JSON.stringify(name));
  //   }
  // });
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
  res.render('login');
});

app.post('/submit-name', (req, res) => {
  const name  = req.body.name;
  if (name) {
    console.log(`Received name: ${name}`);
    res.render('index', { name });
  } else {
    res.status(400).json({ message: 'Name is required.' });
  }
});


server.listen(3000, () => {
  console.log('Listening on port 3000');
});
