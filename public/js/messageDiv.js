// messageDiv.js

export function createMessageDiv(oponentName, character, imgUrl) {
    // Create the main div element
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.style.display = "flex";
    messageDiv.style.flexDirection = "column";
    messageDiv.style.alignItems = "center";
    messageDiv.style.width = "300px";
    messageDiv.style.borderRadius = "8px";
  
    // Create a div for the background image
    const imageDiv = document.createElement("div");
    imageDiv.style.backgroundSize = "cover";
    imageDiv.style.backgroundPosition = "center";
    imageDiv.style.width = "280px";
    imageDiv.style.height = "300px";
    imageDiv.style.borderRadius = "8px";
  
    console.log(`IMG URL IS: ${imgUrl}`);
    if (character === "???????") {
      imageDiv.style.backgroundImage = "url('/images/questionMarks.png')";
    } else {
      console.log(`CZMEU NIE MA ZDJĘCIAAAAAA ${imgUrl}`);
      imageDiv.style.backgroundImage = `url(${imgUrl})`;
    }
  
    const textParagraph = document.createElement("p");
    textParagraph.textContent = `${oponentName} - ${character}`;
    textParagraph.style.textAlign = "center";
    textParagraph.style.marginTop = "10px";
  
    messageDiv.appendChild(imageDiv);
    messageDiv.appendChild(textParagraph);
  
    messages.appendChild(messageDiv);
    console.log(`dodaje do diva ${oponentName} - ${character}`);
  }
  