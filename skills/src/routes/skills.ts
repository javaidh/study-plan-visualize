import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    skillCreatedPublisher,
    skillDeletedPublisher,
    skillUpdatedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { Skills } from '../models/skills';
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
            // first time default version to 1
            const version = 1;
            const skillDoc = await Skills.insertSkill({
                name,
                version
            });
            if (!skillDoc) throw new Error('unable to create skill');
            if (!skillDoc.name || !skillDoc.version)
                throw new Error(
                    'we need skill name to publish skill:created event'
                );
            const courseToJSON = skillDoc.course
                ? JSON.stringify(skillDoc.course)
                : undefined;
            const bookToJSON = skillDoc.book
                ? JSON.stringify(skillDoc.book)
                : undefined;
            // publish skillCreatedEvent
            await new skillCreatedPublisher(natsWrapper.client).publish({
                _id: skillDoc._id.toString(),
                name: skillDoc.name,
                version: skillDoc.version,
                course: courseToJSON,
                book: bookToJSON
            });
            res.status(201).send({ data: [skillDoc] });
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

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new Error('cannot find skill with the required id');

            const skillDeleted = await Skills.deleteSkillById(_id);

            // publish event
            if (skillDeleted) {
                if (!skill.version || !skill.name)
                    throw new Error(
                        'version dbStatus and name are needed to update record'
                    );
                const courseToJSON = skill.course
                    ? JSON.stringify(skill.course)
                    : undefined;
                const bookToJSON = skill.book
                    ? JSON.stringify(skill.book)
                    : undefined;

                await new skillDeletedPublisher(natsWrapper.client).publish({
                    _id: skill._id.toString(),
                    name: skill.name,
                    version: skill.version,
                    course: courseToJSON,
                    book: bookToJSON
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
// this is a course updated or book updated event. This will not change skill name
router.post(
    '/api/skills/updateEvent',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            let { id, courseId, bookId } = req.body;
            if (!id)
                throw new BadRequestError('please provide id to update skill');

            //sanitize id
            const _id = new ObjectId(id);
            const course = courseId ? new ObjectId(courseId) : undefined;
            const book = bookId ? new ObjectId(bookId) : undefined;

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new Error('cannot find skill with the required id');
            if (!skill.version || !skill.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = skill.version + 1;
            const updateSkill = await Skills.updateSkillByCourseBook({
                _id,
                version: newVersion,
                course,
                book
            });

            if (!updateSkill)
                throw new DatabaseErrors('unable to update fields');

            // find updated skill to publish event and send to front -end
            const skillDoc = await Skills.findSkillByIdAndVersion(
                _id,
                newVersion
            );

            if (skillDoc) {
                if (!skillDoc.version || !skillDoc.name)
                    throw new Error(
                        'we need skill database doc details to publish this event'
                    );
                const courseToJSON = skillDoc.course
                    ? JSON.stringify(skillDoc.course)
                    : undefined;
                const bookToJSON = skillDoc.book
                    ? JSON.stringify(skillDoc.book)
                    : undefined;
                await new skillUpdatedPublisher(natsWrapper.client).publish({
                    _id: skillDoc._id.toString(),
                    name: skillDoc.name,
                    version: skillDoc.version,
                    course: courseToJSON,
                    book: bookToJSON
                });
            }
            res.status(201).send({ data: [skillDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.post(
    '/api/skills/update',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name to update skill'
                );
            // check if a skill already exists with that name thsi functions internally only checks active value
            const existingSkill = await Skills.getSkillByName(name);
            if (existingSkill?.length) {
                throw new BadRequestError(
                    'The skill name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);

            // find skill with id get the version number increment version number, update the record, publish the record to nats
            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new Error('cannot find skill with the required id');
            if (!skill.version || !skill.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = skill.version + 1;
            // id is used to find the record
            const updateSkill = await Skills.updateSkillName({
                _id,
                name,
                version: newVersion
            });
            if (!updateSkill) throw new Error('unable to update skill by name');

            const skillDoc = await Skills.findSkillByIdAndVersion(
                _id,
                newVersion
            );
            if (skillDoc) {
                if (!skillDoc.version || !skillDoc.name)
                    throw new Error(
                        'we need skill database doc details to publish this event'
                    );
                const courseToJSON = skillDoc.course
                    ? JSON.stringify(skillDoc.course)
                    : undefined;
                const bookToJSON = skillDoc.book
                    ? JSON.stringify(skillDoc.book)
                    : undefined;
                await new skillUpdatedPublisher(natsWrapper.client).publish({
                    _id: skillDoc._id.toString(),
                    name: skillDoc.name,
                    version: skillDoc.version,
                    course: courseToJSON,
                    book: bookToJSON
                });
            }

            res.status(201).send({ data: [skillDoc] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as skillRouter };
