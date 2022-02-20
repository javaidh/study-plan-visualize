import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';

import { natsWrapper } from '../nats-wrapper';
import {
    skillCreatedPublisher,
    skillDeletedPublisher,
    skillUpdatedPublisher
} from '../events/publishers';
import { ReqAnnotateBodyString } from '../types/interfaceRequest';
import { databaseStatus, Skills } from '../models/skills';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { Course } from '../models/course';
import { Book } from '../models/book';

const router = express.Router();

router.get(
    '/api/skills/learning',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            console.log('logginf', req.body);
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError('please provide id and name ');
            const _id = new ObjectId(id);

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new BadRequestError(
                    'cannot find skill with the required id'
                );
            const { course, book } = skill;
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
    '/api/skills/add',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            console.log('add route');
            // we need name, version, dbStatus
            const { name } = req.body;
            if (!name)
                throw new BadRequestError('please provide name for skill');
            const dbStatus = databaseStatus.active;
            // check if active entries in the db already have skill with this name
            const existingSkill = await Skills.getSkillByName(name, dbStatus);
            if (existingSkill?.length) {
                throw new BadRequestError('skill name already in use');
            }
            // first time default version to 1
            const version = 1;
            const skillDoc = await Skills.insertSkill({
                name,
                version,
                dbStatus
            });
            if (!skillDoc) throw new DatabaseErrors('unable to create skill');
            if (!skillDoc.name || !skillDoc.version)
                throw new Error(
                    'we need skill name to publish skill:created event'
                );
            const courseToJSON = skillDoc.course
                ? skillDoc.course.toJSON()
                : undefined;
            const bookToJSON = skillDoc.book
                ? skillDoc.book.toJSON()
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
            console.log('all route');
            const dbStatus = databaseStatus.active;
            const skills = await Skills.getAllSkills(databaseStatus.active);
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
            console.log('id route');
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
            console.log('destroy route');
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
                    ? skill.course.toJSON()
                    : undefined;
                const bookToJSON = skill.book ? skill.book.toJSON() : undefined;

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

router.post(
    '/api/skills/update',
    async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
        try {
            console.log('add update');
            const { id, name } = req.body;
            if (!id || !name)
                throw new BadRequestError(
                    'please provide id and name to update skill'
                );
            const dbStatus = databaseStatus.active;
            const existingSkill = await Skills.getSkillByName(name, dbStatus);
            if (existingSkill?.length) {
                throw new BadRequestError(
                    'The skill name you are trying to update is already in use please provide new name'
                );
            }
            const _id = new ObjectId(id);

            const skill = await Skills.getSkillById(_id);
            if (!skill)
                throw new BadRequestError(
                    'cannot find skill with the required id'
                );
            if (!skill.version || !skill.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );
            const newVersion = skill.version + 1;
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
                    ? skillDoc.course.toJSON()
                    : undefined;
                const bookToJSON = skillDoc.book
                    ? skillDoc.book.toJSON()
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
