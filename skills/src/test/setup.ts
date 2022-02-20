import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient } from 'mongodb';
import { app } from '../app';
import { connectDb, mongoDBClient } from '../services/mongodb';

let mongo: any;
let client: any;
let db: any;

jest.mock('../nats-wrapper');
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    console.log(mongoUri);
    client = await mongoDBClient(mongoUri);
    db = await connectDb(mongoUri);
});

beforeEach(async () => {
    const collections = await db.collections();

    for (let collection of collections) {
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    await client.close();
    await mongo.stop();
});
