const { MongoClient } = require('mongodb');

async function searchEmail() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    console.log("SCANNING ALL 127.0.0.1 DATABASES FOR EMAIL...");
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      for (const collInfo of collections) {
        const coll = db.collection(collInfo.name);
        const doc = await coll.findOne({ email: "saakashraj.it2025@citchennai.net" });
        if (doc) {
          console.log(`\n>>> FOUND RECORD in DB "${dbInfo.name}", Collection "${collInfo.name}":`);
          console.log(JSON.stringify(doc, null, 2));
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
    console.log("\nSCAN COMPLETED.");
  }
}

searchEmail();
