export class WebSocketManager {
    constructor(url) {
      this.ws = new WebSocket(url);
      this.roomCode = null;
      this.playerName = null;
      this.isHost = false;
      this.messageHandlers = {};
  
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
    }
  
    // Initialize WebSocket with room and player info
    init(roomCode, playerName, isHost) {
      this.roomCode = roomCode;
      this.playerName = playerName;
      this.isHost = isHost;
    }
  
    // Register a message handler for a specific message type
    on(type, handler) {
      this.messageHandlers[type] = handler;
    }
  
    // Handle the WebSocket connection open event
    onOpen() {
      console.log('WebSocket connection opened');
      console.log(`PRZESYŁAM GET DATA FROM THE DB ${this.roomCode} i ${this.playerName}`);
      this.sendMessage({
        roomCode: this.roomCode,
        type: 'get-data-from-db',
        name: this.playerName,
      });
    }
  
    // Handle incoming WebSocket messages
    onMessage(event) {
      const data = JSON.parse(event.data);
      const handler = this.messageHandlers[data.type];
  
      if (handler) {
        handler(data);
      } else {
        console.warn(`No handler for message type: ${data.type}`);
      }
    }
  
    // Send a message through the WebSocket
    sendMessage(message) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        console.error('WebSocket is not open');
      }
    }
  }