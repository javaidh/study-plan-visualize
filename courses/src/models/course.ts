import {
    DeleteResult,
    InsertOneResult,
    ObjectId,
    UpdateResult,
    WithId
} from 'mongodb';

import { connectDb } from '../services/mongodb';
// TODO: convert them into one import
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

interface returnCourseDocument {
    _id?: ObjectId;
    name?: string;
    courseURL?: string;
    learningStatus?: number;
    skillId?: ObjectId[];
    languageId?: ObjectId[];
    version?: number;
}

interface insertCourseDocument {
    _id?: ObjectId;
    name: string;
    courseURL: string;
    learningStatus: number;
    skillId?: ObjectId[];
    languageId?: ObjectId[];
    version: number;
}

export class Course {
    static async insertCourse(CourseProps: insertCourseDocument) {
        try {
            const db = await connectDb();
            const { acknowledged, insertedId }: InsertOneResult = await db
                .collection('course')
                .insertOne(CourseProps);
            if (!acknowledged)
                throw new DatabaseErrors('unable to insert course ');
            const courseCreated = await Course.getCourseById(insertedId);
            return courseCreated;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to create course in database either name in use or database operation failed'
            );
        }
    }

    static async getCourseById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: WithId<returnCourseDocument>[] = await db
                .collection('course')
                // you only want to return user password in case you are doing a password check
                .find({ _id })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve course from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve course from database');
        }
    }

    static async getCourseByName(name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnCourseDocument>[] = await db
                .collection('course')
                .find({ name })
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve course from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve course from database');
        }
    }

    static async getAllCourse() {
        try {
            const db = await connectDb();
            const result: WithId<returnCourseDocument>[] = await db
                .collection('course')
                // you only want to return documents that are active in database
                .find({})
                .toArray();
            if (!result)
                throw new DatabaseErrors(
                    'Unable to retrieve course from database'
                );
            return result;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors('Unable to retrieve course from database');
        }
    }

    static async deleteCourseById(_id: ObjectId) {
        try {
            const db = await connectDb();
            const result: DeleteResult = await db
                .collection('course')
                .deleteOne({ _id });
            return result.deletedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'Unable to retrieve programming from database'
            );
        }
    }

    static async getCourseByIdAndName(_id: ObjectId, name: string) {
        try {
            const db = await connectDb();
            const result: WithId<returnCourseDocument>[] = await db
                .collection('course')
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

    static async updateCourse(updateProps: {
        _id: ObjectId;
        name: string;
        courseURL: string;
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
                courseURL,
                learningStatus,
                version,
                skillId,
                languageId
            } = updateProps;

            // if (skillId && languageId) {
            const result: UpdateResult = await db
                .collection('course')
                .updateOne(
                    { _id },
                    {
                        $set: {
                            name: name,
                            courseURL: courseURL,
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
            throw new DatabaseErrors('Unable to update course in database');
        }
    }

    static async getCourseByIdAndVersion(_id: ObjectId, version: number) {
        try {
            const db = await connectDb();
            const result: WithId<returnCourseDocument>[] = await db
                .collection('course')
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

    static async updateCourseRemoveSkillId(
        _id: ObjectId,
        version: number,
        skillId: ObjectId
    ) {
        try {
            const db = await connectDb();
            const result: UpdateResult = await db
                .collection('course')
                .updateOne({ _id }, { $pull: { skillId }, $set: { version } });
            return result.modifiedCount === 1;
        } catch (err) {
            logErrorMessage(err);
            throw new DatabaseErrors(
                'No such document exist with id and version'
            );
        }
    }
}
