import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    programmingLngCreatedPublisher,
    programmingLngDeletedPublisher,
    programmingLngUpdatedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { ProgrammingLng } from '../models/programmingLng';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

const router = express.Router();

// create
router.post(
    '/api/programming/add',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { name } = req.body;
            if (!name)
                throw new BadRequestError(
                    'please provide name for programming language'
                );

            // check if active entries in the db already have programminglanguage with this name
            const existingLanguage =
                await ProgrammingLng.getProgrammingLngByName(name);
            if (existingLanguage?.length) {
                throw new BadRequestError(
                    'programming language name already in use'
                );
            }
            // determine maxVersion to insert in database
            const version = 1;
            const programmingLngCreated =
                await ProgrammingLng.insertProgrammingLng({
                    name,
                    version
                });
            if (!programmingLngCreated)
                throw new Error('unable to create programming language');
            const programmingLngDoc = programmingLngCreated[0];
            if (!programmingLngDoc.name || !programmingLngDoc.version)
                throw new Error(
                    'we need programming language name, version, database status to publish programming language:created event'
                );

            // publish skillCreatedEvent
            await new programmingLngCreatedPublisher(
                natsWrapper.client
            ).publish({
                _id: programmingLngDoc._id.toString(),
                name: programmingLngDoc.name,
                version: programmingLngDoc.version
            });
            res.status(201).send({ data: programmingLngCreated });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// get all skills
router.get(
    '/api/programming/all',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const programmingLanguage =
                await ProgrammingLng.getAllProgrammingLng();
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
            // find skill with id get the version number increment version number, update the record, publish the record to nats
            const programmingArray = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            if (!programmingArray)
                throw new Error('cannot find programming with the required id');
            const language = programmingArray[0];
            if (!language.version || !language.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const programmingLngDeleted =
                await ProgrammingLng.deleteProgrammingLngById(_id);

            if (programmingLngDeleted) {
                // publish event
                await new programmingLngDeletedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: language._id.toString(),
                    name: language.name,
                    version: language.version
                });
            }
            res.status(201).send({ data: programmingLngDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// update skills
// TODO: this update logic will happen when event recieved so this is not a route
router.post(
    '/api/programming/updateEvent',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            let { id, courseId, bookId } = req.body;
            if (!id)
                throw new BadRequestError(
                    'please provide id to update programming language'
                );
            //sanitize id
            const _id = new ObjectId(id);
            const course = courseId ? new ObjectId(courseId) : undefined;
            const book = bookId ? new ObjectId(bookId) : undefined;

            const programmingArray = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            if (!programmingArray?.length)
                throw new Error('cannot find programming with the required id');
            const language = programmingArray[0];
            if (!language.version || !language.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = language.version + 1;

            const updateProgrammingLng =
                await ProgrammingLng.updateProgrammingLng({
                    _id,
                    version: newVersion,
                    course,
                    book
                });

            if (!updateProgrammingLng)
                throw new DatabaseErrors('unable to update fields');
            // find updated skill to publish event and send to front -end
            const updatedLanguage =
                await ProgrammingLng.findProgrammingLngByIdAndVersion(
                    _id,
                    newVersion
                );

            if (updatedLanguage) {
                const LanguageDoc = updatedLanguage[0];
                if (!LanguageDoc.version || !LanguageDoc.name)
                    throw new Error(
                        'we need skill database doc details to publish this event'
                    );
                await new programmingLngUpdatedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: LanguageDoc._id.toString(),
                    name: LanguageDoc.name,
                    version: LanguageDoc.version
                });
            }
            res.status(201).send({ data: updatedLanguage });
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
            const existingProgrammingLng =
                await ProgrammingLng.getProgrammingLngByName(name);
            if (existingProgrammingLng?.length) {
                throw new BadRequestError(
                    'The programming language name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);
            const programmingArray = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            if (!programmingArray?.length)
                throw new Error('cannot find programming with the required id');
            const language = programmingArray[0];
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
            const updatedProgrammingLng =
                await ProgrammingLng.findProgrammingLngByIdAndVersion(
                    _id,
                    newVersion
                );
            console.log(updatedProgrammingLng);
            // publish event
            if (updatedProgrammingLng.length) {
                const programmingDoc = updatedProgrammingLng[0];
                if (!programmingDoc.version || !programmingDoc.name)
                    throw new Error(
                        'we need programming database doc details to publish this event'
                    );
                await new programmingLngUpdatedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: programmingDoc._id.toString(),
                    name: programmingDoc.name,
                    version: programmingDoc.version
                });
            }

            res.status(201).send({ data: updatedProgrammingLng });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as programmingLngRouter };
