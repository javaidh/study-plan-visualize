import { InsertOneResult, ObjectId, UpdateResult, WithId } from 'mongodb';

import { connectDb } from '../services/mongodb';
// TODO: convert them into one import
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

export enum databaseStatus {
    inUse = 'active',
    delete = 'inactive'
}

interface returnSkillDocument {
    _id: ObjectId;
    name?: string;
    course?: { _id: ObjectId; name: string };
    book?: { _id: ObjectId; name: string };
    version?: number;
    dbStatus?: databaseStatus;
}

interface insertSkillDocument {
    _id?: ObjectId;
    name: string;
    course?: { _id: ObjectId; name: string };
    book?: { _id: ObjectId; name: string };
    // we are using version property to keep track of events emitted by this service
    // In other services we have to process events in order to avoid data issues
    version: number;
    dbStatus: databaseStatus;
}

export class Skills {
    static async insertSkill(
        skillProps: insertSkillDocument
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection('skills')
                .insertOne(skillProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert skill ');
            const skillCreated = await Skills.getSkillById(insertedId);
            return skillCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create user in database either email in use or database operation failed'
            );
        }
    }

    static async maxVersion(): Promise<WithId<returnSkillDocument>[]> {
        try {
            const db = await connectDb();
            const result: Promise<WithId<returnSkillDocument>[]> = db
                .collection('skills')
                .find()
                .sort({ version: -1 })
                .limit(1)
                .toArray(); // for MAX
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async getSkillByName(
        name: string
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const dbStatus = databaseStatus.inUse;
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
                // you only want to return user password in case you are doing a password check
                .find({ name, dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async getAllSkills(): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const dbStatus = databaseStatus.inUse;
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
                // you only want to return documents that are active in database
                .find({ dbStatus })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async getSkillById(
        _id: ObjectId
    ): Promise<WithId<returnSkillDocument>[] | undefined> {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
                // you only want to return user password in case you are doing a password check
                .find({ _id })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve skill from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async deleteSkillById(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: UpdateResult = await db
                .collection('skills')
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
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async updateSkill(updateProps: {
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
                    .collection('skills')
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
                    .collection('skills')
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
                    .collection('skills')
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
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
}
