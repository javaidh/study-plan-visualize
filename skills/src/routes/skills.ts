import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
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
            console.log(existingSkill);
            if (existingSkill?.length) {
                throw new BadRequestError('skill name already in use');
            }

            let version: number;
            const dbStatus: databaseStatus = databaseStatus.inUse;
            // determine maxVersion inside skills collection and assign maxVersion + 1 to new variable
            const maxVersionDocArray = await Skills.maxVersion();
            const maxVersionDoc = maxVersionDocArray[0];
            version = maxVersionDoc.version ? maxVersionDoc.version + 1 : 1;

            const skill = await Skills.insertSkill({ name, version, dbStatus });
            res.status(201).send({ data: skill });
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
            // determine maxVersion inside skills collection and assign maxVersion + 1 to new variable
            let version: number;
            const maxVersionDocArray = await Skills.maxVersion();
            const maxVersionDoc = maxVersionDocArray[0];
            version = maxVersionDoc.version ? maxVersionDoc.version + 1 : 1;
            const skillDeleted = await Skills.deleteSkillById(_id, version);
            res.status(201).send({ data: skillDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);
/*
_id: ObjectId;
        version: number;
        course?: { _id: ObjectId; name: String };
        book?: { _id: ObjectId; name: String };
*/
// update skills
router.post(
    '/api/skills/update',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id, course, book } = req.body;
            if (!id)
                throw new BadRequestError('please provide id to update skill');
            const _id = new ObjectId(id);
            course ? (course._id = new ObjectId(course._id)) : undefined;
            book ? (book._id = new ObjectId(book._id)) : undefined;
            // determine maxVersion inside skills collection and assign maxVersion + 1 to new variable
            let version: number;
            const maxVersionDocArray = await Skills.maxVersion();
            const maxVersionDoc = maxVersionDocArray[0];
            version = maxVersionDoc.version ? maxVersionDoc.version + 1 : 1;

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

export { router as skillRouter };
