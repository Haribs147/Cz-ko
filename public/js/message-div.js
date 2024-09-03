// messageDiv.js

export function createMessageDiv(oponentName, character, imgUrl) {

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