import {
    DeleteResult,
    InsertOneResult,
    ObjectId,
    UpdateResult,
    WithId
} from 'mongodb';

import { connectDb } from '../services/mongodb';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

interface returnBookDocument {
    _id?: ObjectId;
    name?: string;
    bookAuthor?: string;
    bookVersion?: number;
    learningStatus?: number;
    languageId?: ObjectId[];
    version?: number;
}

interface insertBookDocument {
    _id?: ObjectId;
    name: string;
    bookAuthor?: string;
    bookVersion?: number;
    learningStatus: number;
    languageId?: ObjectId[];
    version: number;
}

export class Book {
    static async insertBook(BookProps: insertBookDocument) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection('book')
                .insertOne(BookProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert book ');
            const bookCreated = await Book.getBookById(insertedId);
            return bookCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create book in database either name in use or database operation failed'
            );
        }
    }

    static async getBookById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnBookDocument>[] = await db
                .collection('book')
                .find({ _id })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve book from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve book from database');
        }
    }

    static async deleteBookById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: DeleteResult = await db
                .collection('book')
                .deleteOne({ _id });
            return result.deletedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async updateBook(updateProps: {
        _id: ObjectId;
        name: string;
        bookAuthor?: string;
        bookVersion?: number;
        learningStatus: number;
        version: number;
        languageId?: ObjectId[] | undefined;
    }) {
        try {
            const db = await connectDb();
            const {
                _id,
                name,
                bookAuthor,
                bookVersion,
                learningStatus,
                version,
                languageId
            } = updateProps;

            const result: UpdateResult = await db.collection('book').updateOne(
                { _id },
                {
                    $set: {
                        name: name,
                        bookVersion: bookVersion,
                        bookAuthor: bookAuthor,
                        learningStatus: learningStatus,
                        version: version,
                        languageId: languageId
                    }
                }
            );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to update book in database');
        }
    }

    static async getBookByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnBookDocument>[] = await db
                .collection('book')
                .find({ $and: [{ _id: _id }, { version: version }] })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve language from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'No such document exist with id and version'
            );
        }
    }
}
