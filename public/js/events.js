// events.js

import { WebSocketManager } from './ws.js';
import { toggleDisplay, createOptionElement, createPlayerCircle, changeCircleBorder, deleteOption, createMessageDiv } from './ui.js';

let messagesCount = 0;
let numberOfPlayers = 0;
let readyPlayers = 0;
let playersTable = [];
var allPlayers = [];


export function registerEventListeners(wsManager) {
  const startGameBtn = document.getElementById('start-game');
  const characterSendBtn = document.getElementById('character-send');
  const opponentSelect = document.getElementById('opponent-select');
  const characterInput = document.getElementById('character-input');

  startGameBtn.addEventListener('click', () => {
    if (readyPlayers === numberOfPlayers - 1) {
      toggleDisplay('#start-game', 'none');
      toggleDisplay('#characters', 'flex');
      toggleDisplay('#players', 'none');
      toggleDisplay('#room', 'none');

      wsManager.sendMessage({
        roomCode: wsManager.roomCode,
        type: 'start-game',
      });
    } else {
      window.alert('Please wait for all players to be ready.');
    }
  });

  characterSendBtn.addEventListener('click', () => {
    const opponentName = opponentSelect.value;
    const character = characterInput.value;

    if (!opponentName || !character) {
      window.alert("Please enter both your opponent's name and character.");
      return;
    }

    if (playersTable.includes(opponentName)) {
      window.alert(
        `The character for ${opponentName} has already been added, please choose a different player`
      );
      return;
    }

    const sendCharacters = {
      opponentName: opponentName,
      character: character,
      playerName: wsManager.playerName,
      roomCode: wsManager.roomCode,
      type: 'sendCharacters',
    };

    toggleDisplay('.input-block', 'none');
    if (wsManager.isHost == 1) {
      toggleDisplay('#start-game', 'block');
    } else {
      toggleDisplay('#start-game-message', 'block');
    }
    wsManager.sendMessage(sendCharacters);
  });
}

export function setupWebSocketHandlers(wsManager) {
  wsManager.on('dataFromDb', (data) => {
    if(wsManager.roomCode != data.roomCode){
      return;
    }
    // Handle the data received from the database
    console.log("GETTING DATA FROM THE DBBBBBBBB");
    const allNames = data.data.map(obj => obj.name);
    const allIsReady = data.data.map(obj => obj.isready);
    const characters = data.data.map(obj => obj.character);
    const images = data.data.map(obj => obj.url);
    console.log(`ALL NAMES: ${allNames}`);
    console.log(`ALL PLAYERS: ${allPlayers}`);
    console.log(`allIsReady: ${allIsReady}`);
    console.log(`characters: ${characters}`);
    const notAddedPlayers = allNames
      .map((name, index) => allPlayers.includes(name) ? null : { name, index })
      .filter(entry => entry !== null);
    allPlayers = allNames;
    console.log(notAddedPlayers);

    numberOfPlayers = allNames.length;
    const numberOfNotAddedPlayers = notAddedPlayers.length;

    for (let i = 0; i < numberOfNotAddedPlayers; i++) {
      if (notAddedPlayers[i].name != wsManager.playerName) {
        if (characters[notAddedPlayers[i].index] != null) {
          // if a player has a character create a message div
          createMessageDiv(notAddedPlayers[i].name, characters[notAddedPlayers[i].index], images[notAddedPlayers[i].index]);
        } else {
          //if he doesn't have a character create an option element for him
          createOptionElement(notAddedPlayers[i].name);
        }

        createPlayerCircle(notAddedPlayers[i].name);

        // if the player was already ready change the circle color to green
        if (allIsReady[notAddedPlayers[i].index] === 1) {
          changeCircleBorder(notAddedPlayers[i].name);
          readyPlayers++;
        }
      }
    }
  });

  wsManager.on('sendCharacters', (data) => {
    if(wsManager.roomCode != data.roomCode){
      return;
    }
    if (wsManager.playerName === data.opponentName) {
      createMessageDiv(data.opponentName, '???????', data.url);
      changeCircleBorder(data.playerName);
      readyPlayers++;
    } else if (wsManager.playerName === data.playerName) {
      createMessageDiv(data.opponentName, data.character, data.url);
    } else {
      playersTable.push(data.opponentName);
      createMessageDiv(data.opponentName, data.character, data.url);
      changeCircleBorder(data.playerName);
      readyPlayers++;
      deleteOption(data.opponentName);
    }
    
  });

  wsManager.on('start-game', (data) => {
    if(wsManager.roomCode != data.roomCode){
      return;
    }
    toggleDisplay('#start-game', 'none');
    toggleDisplay('#characters', 'flex');
    toggleDisplay('#players', 'none');
    toggleDisplay('#room', 'none');
    toggleDisplay('#start-game-message', 'none');
  });
}
