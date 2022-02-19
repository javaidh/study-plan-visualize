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

export enum databaseStatus {
    active = 'active',
    inactive = 'inactive'
}

interface returnSkillDocument {
    _id: ObjectId;
    name?: string;
    course?: ObjectId;
    book?: ObjectId;
    version?: number;
    dbStatus?: databaseStatus;
}

interface insertSkillDocument {
    _id?: ObjectId;
    name: string;
    course?: ObjectId;
    book?: ObjectId;
    version: number;
    dbStatus?: databaseStatus;
}

export class Skills {
    static async insertSkill(skillProps: insertSkillDocument) {
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

    static async getSkillByName(
        name: string,
        dbStatus: databaseStatus
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
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

    static async getAllSkills(
        dbStatus: databaseStatus
    ): Promise<returnSkillDocument[] | undefined> {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
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

    static async getSkillById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
                // you only want to return user password in case you are doing a password check
                .find({ _id })
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
    static async findSkillByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnSkillDocument>[] = await db
                .collection('skills')
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

    static async deleteSkillById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result = await db
                .collection('skills')
                /// when we delete we dont remove database entry we just change the status to inactive
                .updateOne(
                    { _id },
                    {
                        $set: {
                            dbStatus: databaseStatus.inactive
                        }
                    }
                );
            console.log(result);
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }

    static async updateSkillByCourse(updateProps: {
        _id: ObjectId;
        version: number;
        course: ObjectId | undefined;
    }) {
        try {
            const db = await connectDb();
            const { _id, version, course } = updateProps;
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
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
    // we dont need to increment version in database
    static async updateSkillName(updateProps: {
        _id: ObjectId;
        name: string;
        version: number;
    }) {
        try {
            const { _id, name, version } = updateProps;
            const db = await connectDb();

            const result: UpdateResult = await db
                .collection('skills')
                .updateOne({ _id }, { $set: { name: name, version: version } });
            return result.acknowledged;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve skill from database');
        }
    }
}
