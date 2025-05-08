// server.js
// A simple Node.js server that proxies an RTSP stream over WebSockets using rtsp-relay.

// 1. Install dependencies:
//    npm install express express-ws rtsp-relay

const express = require('express');
const expressWs = require('express-ws');

// Initialize Express and attach WebSocket support
const app = express();
expressWs(app);

// Import proxy helper and client script URL from rtsp-relay
const { proxy, scriptUrl } = require('rtsp-relay')(app);

// RTSP source URL (can be parameterized or read from env)
const RTSP_URL = process.env.RTSP_URL || '192.168.1.101';

const login = 'admin';
const password = 'A96IW2Ud';
const port = "554";

function createProxy(mode) {
    return proxy({
        url: `rtsp://${login}:${password}@${RTSP_URL}:${port}/${mode}`,
        transport: 'tcp',  // Use TCP for more reliable delivery (optional)
        verbose: true,     // Enables logging
        additionalOptions: {
            rtsp: {
                readableHighWaterMark: 1024 * 1024, // Увеличиваем буфер для чтения
            }
        }
    })
}

// Create a WebSocket handler for the RTSP->WS proxy
// const streamHandler = proxy({
//   url: RTSP_URL,
//   transport: 'tcp',  // Use TCP for more reliable delivery (optional)
//   verbose: true,     // Enables logging
// });

// Mount the WebSocket endpoint
app.ws('/major', createProxy("cam/realmonitor?channel=1&subtype=1"));
app.ws('/minor', createProxy("cam/realmonitor?channel=2&subtype=1"));

// Start the server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
