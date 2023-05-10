const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;

async function loadSuperchargerData() {
  const response = await axios.get('https://supercharge.info/service/supercharge/allSites');
  const data = response.data;
  const client = new MongoClient('mongodb://0.0.0.0:27017/');
  await client.connect();
  const db = client.db('charge-chat');
  const collection = db.collection('superchargers');

  const radius = 40 / 111000; // Convert yards to roughly degrees
  const sides = 36; // Number of polygon sides

  for (const item of data) {
    console.log('loading item: ', item);
    // Create a circular polygon
    const polygon = {
      type: 'Polygon',
      coordinates: [[]]
    };

    for (let i = 0; i <= sides; i++) {
      const angle = 2 * Math.PI * i / sides;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      polygon.coordinates[0].push([item.gps.longitude + dx, item.gps.latitude + dy]);
    }

    // Insert the document into MongoDB
    await collection.updateOne(
      { id: item.id },
      {
        $setOnInsert: { id: item.id },
        $set: {
          location: polygon,
          name: item.name
          // Include any other fields you want to store
        }
      },
      { upsert: true }
    );
  }

  await client.close();
}

// Call the function
loadSuperchargerData().then(() => {
  console.log('Supercharger data loaded successfully.');
}).catch(error => {
  console.error('Error loading supercharger data:', error);
});
