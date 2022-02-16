import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    skillCreatedPublisher,
    skillDeletedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { Skills, databaseStatus } from '../models/skills';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';

const router = express.Router();

// create
router.post(
    '/api/skills/add',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            // we need name, version, dbStatus
            const { name } = req.body;
            if (!name)
                throw new BadRequestError('please provide name for skill');

            // check if active entries in the db already have skill with this name
            const existingSkill = await Skills.getSkillByName(name);
            if (existingSkill?.length) {
                throw new BadRequestError('skill name already in use');
            }
            // determine maxVersion to insert in database
            const version = await Skills.getMaxVersionToInsert();
            const dbStatus: databaseStatus = databaseStatus.inUse;
            const skillCreated = await Skills.insertSkill({
                name,
                version,
                dbStatus
            });
            if (!skillCreated) throw new Error('unable to create skill');
            const skillDoc = skillCreated[0];
            if (!skillDoc.name || !skillDoc.version)
                throw new Error(
                    'we need skill name to publish skill:created event'
                );

            // publish skillCreatedEvent
            await new skillCreatedPublisher(natsWrapper.client).publish({
                _id: skillDoc._id.toString(),
                name: skillDoc.name,
                version: skillDoc.version
            });
            res.status(201).send({ data: skillCreated });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// get all skills
router.get(
    '/api/skills/all',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const skills = await Skills.getAllSkills();
            console.log(skills);
            res.status(200).send({ data: skills });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/skills/:id',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);
            const skill = await Skills.getSkillById(_id);
            res.status(200).send({ data: skill });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete skills
router.post(
    '/api/skills/destroy',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id } = req.body;
            if (!id)
                throw new BadRequestError('please provide id to delete skill');
            const _id = new ObjectId(id);
            // determine maxVersion to insert in database
            const version = await Skills.getMaxVersionToInsert();
            const skillDeleted = await Skills.deleteSkillById(_id, version);

            // publish event
            const inactiveSkill = await Skills.getSkillById(_id);
            if (skillDeleted && inactiveSkill) {
                const skillDoc = inactiveSkill[0];
                if (!skillDoc.version)
                    throw new Error(
                        'we need skill version to publish this event'
                    );
                await new skillDeletedPublisher(natsWrapper.client).publish({
                    _id: skillDoc._id.toString(),
                    version: skillDoc.version
                });
            }
            res.status(201).send({ data: skillDeleted });
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
    '/api/skills/updateEvent',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id, course, book } = req.body;
            if (!id)
                throw new BadRequestError('please provide id to update skill');
            const _id = new ObjectId(id);
            course ? (course._id = new ObjectId(course._id)) : undefined;
            book ? (book._id = new ObjectId(book._id)) : undefined;
            // determine maxVersion to insert in database
            const version = await Skills.getMaxVersionToInsert();

            const updateSkill = await Skills.updateSkill({
                _id,
                version,
                course,
                book
            });

            if (!updateSkill)
                throw new DatabaseErrors('unable to update fields');
            const skill = await Skills.getSkillById(_id);
            res.status(201).send({ data: skill });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);
// TODO: have to check this route
router.post(
    '/api/skills/update',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name to update skill'
                );
            // check if a skill already exists with that name
            const existingSkill = await Skills.getSkillByName(name);
            if (existingSkill?.length) {
                throw new BadRequestError(
                    'The skill name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);
            const updateSkill = await Skills.updateSkillName({ _id, name });
            if (!updateSkill) throw new Error('unable to update skill by name');
            const skill = await Skills.getSkillById(_id);
            res.status(201).send({ data: skill });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as skillRouter };
