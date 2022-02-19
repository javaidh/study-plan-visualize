import { InsertOneResult, ObjectId, UpdateResult, WithId } from 'mongodb';

import { connectDb } from '../services/mongodb';
// TODO: convert them into one import
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

interface returnProgrammingLngDocument {
    _id?: ObjectId;
    name?: string;
    book?: ObjectId;
    version?: number;
}

interface insertProgrammingLngDocument {
    _id?: ObjectId;
    name: string;
    book?: ObjectId;
    version: number;
}

export class ProgrammingLng {
    static async insertProgrammingLng(
        programmingProps: insertProgrammingLngDocument
    ) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection('programming')
                .insertOne(programmingProps);
            if (!acknowledged)
                throw new DatabaseErrors(
                    'unable to insert programming language '
                );
            const programmingCreated =
                await ProgrammingLng.getProgrammingLngById(insertedId);
            return programmingCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create programming language in database either name in use or database operation failed'
            );
        }
    }

    static async getProgrammingLngById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnProgrammingLngDocument>[] = await db
                .collection('programming')
                // you only want to return user password in case you are doing a password check
                .find({ _id })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve programming from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async findProgrammingLngByIdAndVersion(
        _id: ObjectId,
        version: number
    ) {
        try {
            const db = await connectDb();
            const result = await db
                .collection('programming')
                // you only want to return user password in case you are doing a password check
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
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async findProgrammingLngByIdAndname(_id: ObjectId, name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnProgrammingLngDocument>[] = await db
                .collection('programming')
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

    static async deleteProgrammingLngById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result = await db
                .collection('programming')
                /// when we delete we dont remove database entry we just change the status to inactive
                .deleteOne({ _id });
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async updateLanguage(updateProps: {
        _id: ObjectId;
        name: string;
        version: number;
        book: ObjectId | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, name, version, book } = updateProps;
            const result: UpdateResult = await db
                .collection('programming')
                .updateOne(
                    { _id },
                    {
                        $set: {
                            name: name,
                            version: version,
                            book: book
                        }
                    }
                );
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }
}
