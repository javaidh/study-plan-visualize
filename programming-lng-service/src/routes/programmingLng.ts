import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    programmingLngCreatedPublisher,
    programmingLngDeletedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { ProgrammingLng, databaseStatus } from '../models/programmingLng';
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
            const version = await ProgrammingLng.getMaxVersionToInsert();
            const dbStatus: databaseStatus = databaseStatus.inUse;
            const programmingLngCreated =
                await ProgrammingLng.insertProgrammingLng({
                    name,
                    version,
                    dbStatus
                });
            if (!programmingLngCreated)
                throw new Error('unable to create programming language');
            const programmingLngDoc = programmingLngCreated[0];
            if (!programmingLngDoc.name || !programmingLngDoc.version)
                throw new Error(
                    'we need programming language name to publish programming language:created event'
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

// delete skills
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
            // determine maxVersion to insert in database
            const version = await ProgrammingLng.getMaxVersionToInsert();
            const programmingLngDeleted =
                await ProgrammingLng.deleteProgrammingLngById(_id, version);

            // publish event
            const inactiveSkill = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            if (programmingLngDeleted && inactiveSkill) {
                const programmingLngDoc = inactiveSkill[0];
                if (!programmingLngDoc.version)
                    throw new Error(
                        'we need programming language version to publish this event'
                    );
                await new programmingLngDeletedPublisher(
                    natsWrapper.client
                ).publish({
                    _id: programmingLngDoc._id.toString(),
                    version: programmingLngDoc.version
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
// TODO: In the database function we will not increment number of version.
// TODO: we need to implement an update name route
router.post(
    '/api/programming/updateEvent',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id, course, book } = req.body;
            if (!id)
                throw new BadRequestError(
                    'please provide id to update programming language'
                );
            const _id = new ObjectId(id);
            course ? (course._id = new ObjectId(course._id)) : undefined;
            book ? (book._id = new ObjectId(book._id)) : undefined;
            // determine maxVersion to insert in database
            const version = await ProgrammingLng.getMaxVersionToInsert();

            const updateProgrammingLng =
                await ProgrammingLng.updateProgrammingLng({
                    _id,
                    version,
                    course,
                    book
                });

            if (!updateProgrammingLng)
                throw new DatabaseErrors('unable to update fields');
            const programmingLng = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            res.status(201).send({ data: programmingLng });
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
            const updateProgrammingLng =
                await ProgrammingLng.updateProgrammingLngName({
                    _id,
                    name
                });
            if (!updateProgrammingLng)
                throw new Error(
                    'unable to update programming language by name'
                );
            const programmingLng = await ProgrammingLng.getProgrammingLngById(
                _id
            );
            res.status(201).send({ data: programmingLng });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as programmingLngRouter };
