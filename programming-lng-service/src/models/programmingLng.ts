import { InsertOneResult, ObjectId, UpdateResult, WithId } from 'mongodb';

import { connectDb } from '../services/mongodb';
// TODO: convert them into one import
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

export enum databaseStatus {
    inUse = 'active',
    delete = 'inactive'
}

interface returnProgrammingLngDocument {
    _id: ObjectId;
    name?: string;
    course?: { _id: ObjectId; name: string };
    book?: { _id: ObjectId; name: string };
    version?: number;
    dbStatus?: databaseStatus;
}

interface insertProgrammingLngDocument {
    _id?: ObjectId;
    name: string;
    course?: { _id: ObjectId; name: string };
    book?: { _id: ObjectId; name: string };
    // we are using version property to keep track of events emitted by this service
    // In other services we have to process events in order to avoid data issues
    version: number;
    dbStatus: databaseStatus;
}

export class ProgrammingLng {
    static async insertProgrammingLng(
        programmingProps: insertProgrammingLngDocument
    ): Promise<returnProgrammingLngDocument[] | undefined> {
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

    static async maxVersionInDb(): Promise<
        WithId<returnProgrammingLngDocument>[]
    > {
        try {
            const db = await connectDb();
            const result: Promise<WithId<returnProgrammingLngDocument>[]> = db
                .collection('programming')
                .find()
                .sort({ version: -1 })
                .limit(1)
                .toArray(); // for MAX
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }

    static async getProgrammingLngByName(
        name: string
    ): Promise<returnProgrammingLngDocument[] | undefined> {
        try {
            const db = await connectDb();
            const dbStatus = databaseStatus.inUse;
            const result: WithId<returnProgrammingLngDocument>[] = await db
                .collection('programming')
                // you only want to return user password in case you are doing a password check
                .find({ name, dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve programming language from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }

    static async getAllProgrammingLng(): Promise<
        returnProgrammingLngDocument[] | undefined
    > {
        try {
            const db = await connectDb();
            const dbStatus = databaseStatus.inUse;
            const result: WithId<returnProgrammingLngDocument>[] = await db
                .collection('programming')
                // you only want to return documents that are active in database
                .find({ dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve programming language from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }

    static async getProgrammingLngById(
        _id: ObjectId
    ): Promise<WithId<returnProgrammingLngDocument>[] | undefined> {
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

    static async deleteProgrammingLngById(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: UpdateResult = await db
                .collection('programming')
                /// when we delete we dont remove database entry we just change the status to inactive
                .updateOne(
                    { _id },
                    {
                        $set: {
                            dbStatus: databaseStatus.delete,
                            version: version
                        }
                    }
                );
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }
    // this method is for when we recieve event to update course/book
    // TODO: we dont need to increment version in database
    static async updateProgrammingLng(updateProps: {
        _id: ObjectId;
        version: number;
        course?: { _id: ObjectId; name: String };
        book?: { _id: ObjectId; name: String };
    }) {
        try {
            const db = await connectDb();
            const { _id, version, course, book } = updateProps;

            if (course && book) {
                const result: UpdateResult = await db
                    .collection('programming')
                    .updateOne(
                        { _id },
                        {
                            $set: {
                                version: version,
                                course: course,
                                book: book
                            }
                        }
                    );
                return result.acknowledged;
            }

            if (course && !book) {
                const result: UpdateResult = await db
                    .collection('programming')
                    .updateOne(
                        { _id },
                        {
                            $set: {
                                version: version,
                                course: course
                            }
                        }
                    );
                return result.acknowledged;
            }

            if (!course && book) {
                const result: UpdateResult = await db
                    .collection('programming')
                    .updateOne(
                        { _id },
                        {
                            $set: {
                                version: version,
                                book: book
                            }
                        }
                    );
                return result.acknowledged;
            }
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }
    // we dont need to increment version in database
    static async updateProgrammingLngName(updateProps: {
        _id: ObjectId;
        name: string;
    }) {
        try {
            const { _id, name } = updateProps;
            const db = await connectDb();

            const result: UpdateResult = await db
                .collection('programming')
                .updateOne({ _id }, { $set: { name: name } });
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming language from database'
            );
        }
    }

    static async getMaxVersionToInsert() {
        try {
            let version: number;
            const maxVersionDocArray = await ProgrammingLng.maxVersionInDb();
            const maxVersionDoc = maxVersionDocArray[0];
            version = maxVersionDoc.version ? maxVersionDoc.version + 1 : 1;
            return version;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to increment maxVersion');
        }
    }
}
