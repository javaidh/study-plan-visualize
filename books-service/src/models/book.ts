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
    skillId?: ObjectId[];
    languageId?: ObjectId[];
    version?: number;
}

interface insertBookDocument {
    _id?: ObjectId;
    name: string;
    bookAuthor?: string;
    bookVersion?: number;
    learningStatus: number;
    skillId?: ObjectId[];
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
                throw new DatabaseErrors('unable to insert Book ');
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
                // you only want to return user password in case you are doing a password check
                .find({ _id })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve book from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve book from database');
        }
    }

    static async getBookByName(name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnBookDocument>[] = await db
                .collection('book')
                .find({ name })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve book from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve book from database');
        }
    }

    static async getAllBook() {
        try {
            const db = await connectDb();
            const result: WithId<returnBookDocument>[] = await db
                .collection('book')
                // you only want to return documents that are active in database
                .find({})
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve book from database'
                );
            return result;
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

    static async getBookByIdAndName(_id: ObjectId, name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnBookDocument>[] = await db
                .collection('book')
                // you only want to return user password in case you are doing a password check
                .find({ $and: [{ _id: _id }, { name: name }] })
                .toArray();
            if (!result.length)
                throw new DatabaseErrors(
                    'Unable to retrieve programming language from database'
                );
            const document = result[0];
            return document;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
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
        skillId?: ObjectId[] | undefined;
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
                skillId,
                languageId
            } = updateProps;

            const result: UpdateResult = await db.collection('book').updateOne(
                { _id },
                {
                    $set: {
                        name: name,
                        bookAuthor: bookAuthor,
                        bookVersion: bookVersion,
                        learningStatus: learningStatus,
                        version: version,
                        skillId: skillId,
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
                    'Unable to retrieve skill from database'
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

    static async updateBookRemoveSkillId(
        _id: ObjectId,
        version: number,
        skillId: ObjectId
    ) {
        try {
            const db = await connectDb();
            const result: UpdateResult = await db
                .collection('book')
                .updateOne({ _id }, { $pull: { skillId }, $set: { version } });
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'failed to remove skillId from Book, hence, update Book failed'
            );
        }
    }

    static async updateBookRemoveLanguageId(
        _id: ObjectId,
        version: number,
        languageId: ObjectId
    ) {
        try {
            const db = await connectDb();
            const result: UpdateResult = await db
                .collection('book')
                .updateOne(
                    { _id },
                    { $pull: { languageId }, $set: { version } }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'failed to remove languageId from book, hence, update book failed'
            );
        }
    }
}
