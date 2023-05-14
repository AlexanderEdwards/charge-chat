const express = require('express');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const port = 3000;
const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });

const sessions = {};

wss.on('connection', (ws, req) => {
  console.log('new socket connection', ws, req);
  const superchargerId = req.url.slice(1);

  if (!sessions[superchargerId]) {
    sessions[superchargerId] = { clients: new Set(), count: 0 };
  }

  const sessionId = sessions[superchargerId].count++;
  sessions[superchargerId].clients.add(ws);

  ws.on('message', (message) => {
    sessions[superchargerId].clients.forEach((client) => {
      if (client !== ws) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    sessions[superchargerId].clients.delete(ws);

    if (sessions[superchargerId].clients.size === 0) {
      delete sessions[superchargerId];
    }
  });
});

async function findSupercharger(latitude, longitude) {
  const client = new MongoClient('mongodb://0.0.0.0:27017/');
  await client.connect();
  const db = client.db('charge-chat');
  const collection = db.collection('superchargers');

  const point = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  const supercharger = await collection.findOne({
    location: {
      $geoIntersects: {
        $geometry: point
      }
    }
  });

  await client.close();

  return supercharger;
}

app.get('/findSupercharger', async (req, res) => {
    console.log('hit the endpoint')
  if (!req.query.latitude || !req.query.longitude) {
    res.status(400).send('Missing latitude or longitude');
    return;
  }

  const latitude = parseFloat(req.query.latitude);
  const longitude = parseFloat(req.query.longitude);

  const supercharger = await findSupercharger(latitude, longitude);
  console.log('supercharger***', supercharger);
  if (supercharger) {
    //res.send(`You are within ${supercharger.id}`);
    res.status(200).json({id: supercharger.id, name: supercharger.name});
  } else {
    res.status(204).json({});
  } 
});

app.use(express.static('public'));

const server =app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (!pathname.startsWith('/')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});