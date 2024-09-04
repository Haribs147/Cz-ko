function createMessageDiv(oponentName, character, imgUrl) {
  // Create the main div element
  const messageDiv = document.createElement("div");
  messageDiv.id = "message-container";
  // Create a div for the background image
  const imageDiv = document.createElement("div");
  imageDiv.id = "message-image";
  if (character === "???????") {
      imageDiv.style.backgroundImage = "url('/images/questionMarks.png')";
  } else {
      imageDiv.style.backgroundImage = `url(${imgUrl})`;
  }
  // Create the text paragraph
  const textParagraph = document.createElement("p");
  textParagraph.id = "message-text";
  textParagraph.textContent = `${oponentName} - ${character}`;
  // Append image and text to the main div
  messageDiv.appendChild(imageDiv);
  messageDiv.appendChild(textParagraph);
  // Append the newly created character to characters
  characters.appendChild(messageDiv);
  console.log(`Added to div: ${oponentName} - ${character}`);
}

// Function that creates option and appends it for select input
function createOptionElement(oponentName) {
  // Create new option element
  const option = document.createElement("option");
  option.setAttribute("id", "option-" + oponentName);
  option.value = `${oponentName}`;
  option.innerHTML = `${oponentName}`;
  // Apend the option to the input
  const opponentSelect = document.getElementById("opponent-select");
  opponentSelect.appendChild(option); 
}

// Function to create and append a player's circle element
function createPlayerCircle(name) {
  const playersContainer = document.getElementById("players");
  const circleDiv = document.createElement("div");
  circleDiv.className = "circle";
  circleDiv.id = name;
  circleDiv.textContent = name[0].toUpperCase();
  playersContainer.appendChild(circleDiv);
}

// Function to toggle the display of a DOM element
function toggleDisplay(element, displayStyle) {
  let elementSelector = document.querySelector(element);
  elementSelector.style.display = displayStyle;
}

function changeCircleBorder(name) {
  const player = document.getElementById(name);
  player.style.border = "3px solid #28A745"; // Green border to indicate ready
}

function deleteOption(name) {
  const option = document.getElementById("option-" + name);
  if (option) {
    option.remove();
  }
}



export { createMessageDiv, createOptionElement, createPlayerCircle, changeCircleBorder, deleteOption, toggleDisplay };


