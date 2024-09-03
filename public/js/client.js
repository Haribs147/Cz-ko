import { createMessageDiv } from "./message-div.js";

// Get elements from index.ejs
const players = document.getElementById("players");
const opponentSelect = document.getElementById("opponent-select");
const characterInput = document.getElementById("character-input");
const characterSend = document.getElementById("character-send");
const startGame = document.getElementById("start-game");
const characters = document.getElementById("characters");
const roomCodeParagraph = document.getElementById("room-code");

const ws = new WebSocket("ws://localhost:3000"); //wss://heads-up-1.onrender.com

var messagesCount = 0;
var numberOfPlayers = 0;
var readyPlayers = 0;
var playersTable = [];

// Load the variables from the index.ejs
const playerName = window.playerName;
const roomCode = window.roomCode;
const isHost = window.isHost;

// When new client joins the room, get info about the status of the game from the db and send your name to the other players
ws.onopen = () => {
  roomCodeParagraph.textContent = roomCode;
  ws.send(
    JSON.stringify({
      roomCode: roomCode,
      type: "get-data-from-db",
      name: playerName,
    })
  );
};

startGame.addEventListener("click", () => {
  // When all the players are ready, hide the button and display characters
  if (readyPlayers === numberOfPlayers - 1) {
    startGame.style.display = "none";
    characters.style.display = "flex";
    players.style.display = "none";
    document.getElementById("room").style.display = "none";
    // broadcast the start of the game
    ws.send(JSON.stringify({ roomCode: roomCode, type: "start-game" }));
  } else {
    window.alert("Please wait for all players to be ready.");
  }
});

// When client clicks character send button, send the data to the server
characterSend.addEventListener("click", () => {
  const oponentName = opponentSelect.value;
  const character = characterInput.value;
  if (oponentName === "" || character === "") {
    window.alert("Please enter both your opponent's name and character.");
    return;
  }

  if (playersTable.includes(oponentName)) {
    window.alert(
      `The character for ${oponentName} has already been added, please choose a different player`
    );
    return;
  }
  
  const sendCharacters = {
    oponentName: oponentName,
    character: character,
    playerName: playerName,
    roomCode: roomCode,
    type: "sendCharacters",
  };

  // Hide the inputs
  const form = document.querySelector(".input-block");
  if (form) {
    form.style.display = "none";
  }

  // If the client is the host show the start game button to him
  if (isHost == 1) {
    startGame.style.display = "block";
  } else {
    document.getElementById("start-game-message").style.display = "block";
  }

  if (!sendCharacters) {
    return;
  } else if (!ws) {
    return;
  }

  ws.send(JSON.stringify(sendCharacters));
});

ws.onmessage = (event) => {
  console.log("Broadcast received");
  var object = JSON.parse(event.data);
  console.log(`obiekt type = ${object.type}`);
  console.log(`obiekt roomCode = ${object.roomCode}`);
  // Check if the player is the same as the current player or another player

  if (roomCode === object.roomCode) {
    if (object.type === "dataFromDb") {
      console.log(`OBIEKT TO: ${object}`);
      // Extracting all the names from the map into an array `allNames` and their status into different array
      const allNames = object.data.map((obj) => obj.name);
      const allIsReady = object.data.map((obj) => obj.isready);
      const characters = object.data.map((obj) => obj.character);
      const images = object.data.map((obj) => obj.url);

      numberOfPlayers = allNames.length;

      if (messagesCount === 0) {
        for (let i = 0; i < allNames.length; i++) {
          if (allNames[i] != playerName) {
            if (characters[i] != null) {
              // if a player has a character create a message div
              createMessageDiv(allNames[i], characters[i], images[i]);
            } else {
              //if he doesn't have a character create an option element for him
              createOptionElement(allNames[i]);
            }

            createPlayerCircle(allNames[i]);

            // if the player was already ready change the circle color to green
            if (allIsReady[i] === 1) {
              changeCircleBorder(allNames[i]);
            }
          }
        }
        messagesCount++;
      } else {
        createOptionElement(allNames[allNames.length - 1]);
        createPlayerCircle(allNames[allNames.length - 1]);
      }
    } else if (object.type === "sendCharacters") {
      if (playerName === object.oponentName) {
        console.log(
          `Sending character for ${object.oponentName} with URL: ${object.url}`
        );
        createMessageDiv(object.oponentName, "???????", object.url);
        changeCircleBorder(object.playerName);
      } else if (playerName === object.playerName) {
        //if statement for the person that clicked the characterSend button (this line was earlier in the eventlistener for character send button, but i had to change the code)
        createMessageDiv(object.oponentName, object.character, object.url);
      } else {
        playersTable.push(object.oponentName);
        console.log(
          `Sending character for ${object.oponentName} with URL: ${object.url}`
        );
        createMessageDiv(object.oponentName, object.character, object.url);
        changeCircleBorder(object.playerName);
        deleteOption(object.oponentName);
      }
    } else if (object.type === "start-game") {
      startGame.style.display = "none";
      characters.style.display = "flex";
      players.style.display = "none";
      document.getElementById("room").style.display = "none";
      document.getElementById("start-game-message").style.display = "none";
    }
  }

  console.log(playerName);
};

function createOptionElement(oponentName) {
  const option = document.createElement("option");
  option.setAttribute("id", "option-" + oponentName);
  option.value = `${oponentName}`;
  option.innerHTML = `${oponentName}`;
  // opponentsList.appendChild(option);
  opponentSelect.appendChild(option); //new line
}

function createPlayerCircle(name) {
  const circleDiv = document.createElement("div");

  circleDiv.className = "circle";
  circleDiv.id = name;
  circleDiv.textContent = name[0].toUpperCase();
  players.appendChild(circleDiv);
}

function changeCircleBorder(name) {
  readyPlayers++;
  console.log(`changing circle border for player : ${name}`);
  const player = document.getElementById(name);
  player.style.border = "3px solid #28A745";
}

function deleteOption(name) {
  const option = document.getElementById("option-" + name);
  option.remove();
}
