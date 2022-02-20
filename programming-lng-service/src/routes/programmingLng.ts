import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    programmingLngCreatedPublisher,
    programmingLngDeletedPublisher,
    programmingLngUpdatedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { ProgrammingLng, databaseStatus } from '../models/programmingLng';
import { Course } from '../models/course';
import { Book } from '../models/book';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

const router = express.Router();

router.post(
    '/api/programming/learning',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name for language'
                );
            const _id = new ObjectId(id);
            const language = await ProgrammingLng.getProgrammingLngById(_id);
            if (!language)
                throw new BadRequestError(
                    'cannot find language with the required id'
                );
            const { course, book } = language;
            let courseStatus = 0;
            let bookStatus = 0;
            if (course) {
                const courseDocument = await Course.getCourseById(course);
                const { learningStatus } = courseDocument;
                courseStatus = learningStatus ? learningStatus : 0;
            }
            if (book) {
                const bookDocument = await Book.getBookById(book);
                const { learningStatus } = bookDocument;
                bookStatus = learningStatus ? learningStatus : 0;
            }
            let result: number;
            if (courseStatus && bookStatus) {
                result = courseStatus * 0.5 + bookStatus * 0.5;
            } else if (courseStatus && !bookStatus) {
                result = courseStatus;
            } else if (bookStatus && !courseStatus) {
                result = bookStatus;
            } else {
                result = 0;
            }
            res.status(200).send({ data: result });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// create
router.post(
    '/api/programming/add',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            // we need name, version, dbStatus
            const { name } = req.body;
            if (!name)
                throw new BadRequestError(
                    'please provide name for programming language'
                );
            const dbStatus = databaseStatus.active;
            // check if active entries in the db already have language with this name
            const existingLanguage = await ProgrammingLng.getLanguageByName(
                name,
                dbStatus
            );
            if (existingLanguage?.length) {
                throw new BadRequestError('language name already in use');
            }
            // first time default version to 1
            const version = 1;
            const language = await ProgrammingLng.insertProgrammingLng({
                name,
                version,
                dbStatus
            });
            if (!language)
                throw new DatabaseErrors(
                    'unable to create programming language'
                );
            if (!language.name || !language.version)
                throw new Error(
                    'we need programming name to publish prograaming language:created event'
                );
            const courseToJSON = language.course
                ? language.course.toJSON()
                : undefined;
            const bookToJSON = language.book
                ? language.book.toJSON()
                : undefined;

            // publish programming
            await new programmingLngCreatedPublisher(
                natsWrapper.client
            ).publish({
                _id: language._id.toString(),
                name: language.name,
                version: language.version
            });
            res.status(201).send({ data: [language] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// get all languages
router.get(
    '/api/programming/all',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const dbStatus = databaseStatus.active;
            const programmingLanguage =
                await ProgrammingLng.getAllProgrammingLng(dbStatus);
            res.status(200).send({ data: programmingLanguage });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/programming/:id',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);
            const programmingLng = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            res.status(200).send({ data: programmingLng });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete
router.post(
    '/api/programming/destroy',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id } = req.body;
            if (!id)
                throw new BadRequestError(
                    'please provide id to delete programming language'
                );
            const _id = new ObjectId(id);

            const language = await ProgrammingLng.getProgrammingLngById(_id);

            if (!language)
                throw new Error('cannot find programming with the required id');

            const programmingLngDeleted =
                await ProgrammingLng.deleteProgrammingLngById(_id);

            if (programmingLngDeleted) {
                // we need these to publish event
                if (!language.version || !language.name)
                    throw new Error(
                        'version dbStatus and name are needed to publish programminglng delete event'
                    );
                const courseToJSON = language.course
                    ? language.course.toJSON()
                    : undefined;
                const bookToJSON = language.book
                    ? language.book.toJSON()
                    : undefined;
                // publish event
                await new programmingLngDeletedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: language._id.toString(),
                    name: language.name,
                    version: language.version,
                    course: courseToJSON,
                    book: bookToJSON
                });
            }
            res.status(201).send({ data: programmingLngDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.post(
    '/api/programming/update',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name to update programming language'
                );
            // check if a programming language already exists with that name
            const dbStatus = databaseStatus.active;
            const existingProgrammingLng =
                await ProgrammingLng.getLanguageByName(name, dbStatus);
            if (existingProgrammingLng?.length) {
                throw new BadRequestError(
                    'The programming language name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);
            const language = await ProgrammingLng.getProgrammingLngById(_id);
            if (!language)
                throw new BadRequestError(
                    'cannot find programming with the required id'
                );
            if (!language.version || !language.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = language.version + 1;
            const updateProgrammingLng =
                await ProgrammingLng.updateProgrammingLngName({
                    _id,
                    name,
                    version: newVersion
                });
            if (!updateProgrammingLng)
                throw new Error(
                    'unable to update programming language by name'
                );
            const programmingDoc =
                await ProgrammingLng.findProgrammingLngByIdAndVersion(
                    _id,
                    newVersion
                );
            // publish event
            if (programmingDoc) {
                if (!programmingDoc.version || !programmingDoc.name)
                    throw new Error(
                        'we need programming database doc details to publish this event'
                    );
                const courseToJSON = programmingDoc.course
                    ? programmingDoc.course.toJSON()
                    : undefined;
                const bookToJSON = programmingDoc.book
                    ? programmingDoc.book.toJSON()
                    : undefined;
                await new programmingLngUpdatedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: programmingDoc._id.toString(),
                    name: programmingDoc.name,
                    version: programmingDoc.version,
                    course: courseToJSON,
                    book: bookToJSON
                });
            }

            res.status(201).send({ data: [programmingDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as programmingLngRouter };
