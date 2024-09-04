// events.js

import { WebSocketManager } from './ws.js';
import { toggleDisplay, createOptionElement, createPlayerCircle, changeCircleBorder, deleteOption, createMessageDiv } from './ui.js';

let messagesCount = 0;
let numberOfPlayers = 0;
let readyPlayers = 0;
let playersTable = [];

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
      opponentName,
      character,
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
    // Handle the data received from the database
    const allNames = data.data.map(obj => obj.name);
    const allIsReady = data.data.map(obj => obj.isready);
    const characters = data.data.map(obj => obj.character);
    const images = data.data.map(obj => obj.url);

    numberOfPlayers = allNames.length;

    if (messagesCount === 0) {
        for (let i = 0; i < allNames.length; i++) {
          if (allNames[i] != wsManager.playerName) {
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
              readyPlayers++;
            }
          }
        }
        messagesCount++;
      } else {
        createOptionElement(allNames[allNames.length - 1]);
        createPlayerCircle(allNames[allNames.length - 1]);
      }
  });

  wsManager.on('sendCharacters', (data) => {
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

  wsManager.on('start-game', () => {
    toggleDisplay('#start-game', 'none');
    toggleDisplay('#characters', 'flex');
    toggleDisplay('#players', 'none');
    toggleDisplay('#room', 'none');
    toggleDisplay('#start-game-message', 'none');
  });
}
