const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = 5000;

// HTTP Sunucusunu başlatıyoruz
const server = app.listen(PORT, () => {
  console.log(`🚀 TULPAR-FF Merkezi Sunucu ${PORT} portunda aktif!`);
});

// WebSocket Sunucusunu HTTP sunucusuna bağlıyoruz
const wss = new WebSocketServer({ server });

// Bağlı olan tüm istemcileri (React ve Python) hafızada tutmak için set
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔗 Yeni bir cihaz (React veya Python) sunucuya bağlandı!');
  clients.add(ws);

  // Herhangi bir cihazdan veri geldiğinde (Python'dan telemetri geldiğinde)
  ws.on('message', (message) => {
    // Gelen veriyi bağlı olan diğer tüm cihazlara (yani React arayüzüne) fırlatıyoruz
    clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ Bir cihazın bağlantısı koptu.');
    clients.delete(ws);
  });
});