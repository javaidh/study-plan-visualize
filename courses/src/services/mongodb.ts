import { MongoClient, Db } from 'mongodb';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

export let db: Db;
export let client: MongoClient;
export const URI = process.env.MONGO_DB_CONNECTION_STRING!;

export const mongoDBClient = async (URIString: string) => {
    try {
        const client = await MongoClient.connect(URIString);
        console.log('connected to MongoClient');
        return client;
    } catch (err) {
        return Promise.reject('Cannot connect to mongdb client');
    }
};

export const connectDb = async (uri: string = URI) => {
    try {
        if (db) return db;
        client = await mongoDBClient(uri);
        db = client.db();
        console.log('connected to mongo database');
        return db;
    } catch (err) {
        logErrorMessage(err);
        throw new DatabaseErrors('Error!! could not connect to MongoDb');
    }
};
