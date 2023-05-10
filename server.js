const express = require('express');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const port = 3000;

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
  if (!req.query.latitude || !req.query.longitude) {
    res.status(400).send('Missing latitude or longitude');
    return;
  }

  const latitude = parseFloat(req.query.latitude);
  const longitude = parseFloat(req.query.longitude);

  const supercharger = await findSupercharger(latitude, longitude);
  console.log('supercharger***', supercharger);
  if (supercharger) {
    res.send(`You are within ${supercharger.id}`);
  } else {
    res.send('No supercharger nearby.');
  }
});

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
