import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
import { natsWrapper } from '../../nats-wrapper';
import {
    CustomRequest,
    AddCourse,
    StringBody
} from '../types/interfaceRequest';
import {
    CourseCreatedPublisher,
    CourseDeletedPublisher,
    CourseUpdatedPublisher
} from '../events/publishers';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { Skills } from '../models/skills';
import { ProgrammingLng } from '../models/programmingLng';
import { Course } from '../models/course';

const router = express.Router();

router.post(
    '/api/course/add',
    async (
        req: CustomRequest<AddCourse>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { courseName, courseURL, skills, languages, learningStatus } =
                req.body;
            if (!courseName || !courseURL || !learningStatus)
                throw new BadRequestError('please provide course name and url');
            if (!skills && !languages)
                throw new BadRequestError('provide either skill or language');
            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );

            // check if courseName already exists in database
            const existingCourse = await Course.getCourseByName(courseName);
            if (existingCourse.length)
                throw new DatabaseErrors('course name already in use');
            const version = 1;
            let skillId: ObjectId[] | undefined;
            let languageId: ObjectId[] | undefined;

            //check if skillId and name supplied by user exist in database
            if (skills) {
                const promiseSkillArray = skills.map((skill) => {
                    const parsedId = new ObjectId(skill.id);
                    return Skills.findSkillByIdAndName(parsedId, skill.name);
                });

                const allSkills = await Promise.all(promiseSkillArray);

                const checkInvalidRelationship = allSkills.map((skill) => {
                    if (skill.course)
                        throw new BadRequestError(
                            'this skill is already tied to a course'
                        );
                });

                // map and only keep ids to store in cpurse database
                skillId = allSkills.map((skill) => {
                    return skill._id;
                });
            }
            //check if languageId and name supplied by user exist in database
            if (languages) {
                const promiselanguageArray = languages.map((language) => {
                    const parsedId = new ObjectId(language.id);
                    return ProgrammingLng.findProgrammingLngByIdAndname(
                        parsedId,
                        language.name
                    );
                });

                const allLanguages = await Promise.all(promiselanguageArray);

                const checkInvalidRelationship = allLanguages.map(
                    (language) => {
                        if (language.course)
                            throw new BadRequestError(
                                'this language is already tied to a different course'
                            );
                    }
                );
                // map and only keep ids to store in cpurse database
                languageId = allLanguages.map((language) => {
                    return language._id;
                });
            }
            const courseCreated = await Course.insertCourse({
                name: courseName,
                courseURL,
                learningStatus,
                version,
                skillId,
                languageId
            });

            if (!courseCreated.length)
                throw new DatabaseErrors('unable to create course');

            // publish the event
            const courseDoc = courseCreated[0];
            if (
                !courseDoc.name ||
                !courseDoc.version ||
                !courseDoc.courseURL ||
                !courseDoc.learningStatus
            )
                throw new Error(
                    'course name ,version, courseUrl, learning status required to publish event '
                );
            const skillJSON = courseDoc.skillId?.map((id) => {
                return id.toJSON();
            });
            const languageJSON = courseDoc.languageId?.map((id) => {
                return id.toJSON();
            });
            await new CourseCreatedPublisher(natsWrapper.client).publish({
                _id: courseDoc._id.toString(),
                name: courseDoc.name,
                version: courseDoc.version,
                courseURL: courseDoc.courseURL,
                learningStatus: courseDoc.learningStatus,
                skillId: skillJSON,
                languageId: languageJSON
            });
            res.status(201).send({ data: courseCreated });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/course/all',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const course = await Course.getAllCourse();
            res.status(200).send({ data: course });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/course/:id',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);
            const course = await Course.getCourseById(_id);
            res.status(200).send({ data: course });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete
router.post(
    '/api/course/destroy',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.body;
            if (!id)
                throw new BadRequestError(
                    'please provide id to delete programming language'
                );
            const _id = new ObjectId(id);

            // find the course with id in database
            const courseArray = await Course.getCourseById(_id);
            if (!courseArray.length)
                throw new BadRequestError(
                    'cannot find coursewith the required id'
                );
            const course = courseArray[0];
            if (
                !course.version ||
                !course.name ||
                !course.courseURL ||
                !course.learningStatus
            )
                throw new Error(
                    'version dbStatus and name are needed to publish event'
                );
            const courseDeleted = await Course.deleteCourseById(_id);

            const skillJSON = course.skillId?.map((id) => {
                return id.toJSON();
            });
            const languageJSON = course.languageId?.map((id) => {
                return id.toJSON();
            });

            if (courseDeleted) {
                // publish event
                await new CourseDeletedPublisher(natsWrapper.client).publish({
                    _id: course._id.toString(),
                    name: course.name,
                    courseURL: course.courseURL,
                    learningStatus: course.learningStatus,
                    skillId: skillJSON,
                    languageId: languageJSON,
                    version: course.version
                });
            }
            res.status(201).send({ data: courseDeleted });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// update course
router.post(
    '/api/course/update',
    async (
        req: CustomRequest<AddCourse>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const {
                courseId,
                courseName,
                courseURL,
                skills,
                languages,
                learningStatus
            } = req.body;
            if (!courseName || !courseURL || !learningStatus || !courseId)
                throw new BadRequestError(
                    'please provide course name url, courseId and learning status and courseId'
                );
            if (!skills && !languages)
                throw new BadRequestError('provide either skill or language');

            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );
            const parsedId = new ObjectId(courseId);
            // check if course exists in database
            const existingCourse = await Course.getCourseById(parsedId);
            if (!existingCourse)
                throw new BadRequestError(
                    'course does not exist with name and id'
                );
            const courseDoc = existingCourse[0];
            if (!courseDoc.version || !courseDoc.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );

            const newVersion = courseDoc.version + 1;

            let newSkillId: ObjectId[] | undefined;
            let newLanguageId: ObjectId[] | undefined;

            //check if skillId and name supplied by user exist in database
            if (skills) {
                const promiseSkillArray = skills.map((skill) => {
                    const parsedId = new ObjectId(skill.id);
                    return Skills.findSkillByIdAndName(parsedId, skill.name);
                });

                const allSkills = await Promise.all(promiseSkillArray);

                const checkInvalidRelationship = allSkills.map((skill) => {
                    if (
                        skill.course &&
                        skill.course.toString() !== parsedId.toString()
                    ) {
                        throw new BadRequestError(
                            'this skill is already tied to a course'
                        );
                    }
                });

                // map and only keep ids to store in cpurse database
                newSkillId = allSkills.map((skill) => {
                    return skill._id;
                });
            }
            //check if languageId and name supplied by user exist in database
            if (languages) {
                const promiselanguageArray = languages.map((language) => {
                    const parsedId = new ObjectId(language.id);
                    return ProgrammingLng.findProgrammingLngByIdAndname(
                        parsedId,
                        language.name
                    );
                });
                const allLanguages = await Promise.all(promiselanguageArray);

                const checkInvalidRelationship = allLanguages.map(
                    (language) => {
                        if (
                            language.course &&
                            language.course.toString() !== parsedId.toString()
                        )
                            throw new BadRequestError(
                                'this language is already tied to a different course'
                            );
                    }
                );
                // map and only keep ids to store in course database
                newLanguageId = allLanguages.map((language) => {
                    return language._id;
                });
            }

            // update course database
            const courseCreated = await Course.updateCourse({
                _id: parsedId,
                name: courseName,
                courseURL,
                learningStatus,
                version: newVersion,
                skillId: newSkillId,
                languageId: newLanguageId
            });
            if (!courseCreated) {
                throw new Error('failed to update course');
            }
            // find updated course to publish event and send to front -end
            const updatedCourse = await Course.getCourseByIdAndVersion(
                parsedId,
                newVersion
            );
            if (!updatedCourse)
                throw new DatabaseErrors('unable to update course');

            // publish the event
            if (
                !updatedCourse.name ||
                !updatedCourse.version ||
                !updatedCourse.courseURL ||
                !updatedCourse.learningStatus
            )
                throw new Error(
                    'we need course, version, database status to publish event'
                );

            const skillJSON = updatedCourse.skillId?.map((id) => {
                return id.toJSON();
            });

            const languageJSON = updatedCourse.languageId?.map((id) => {
                return id.toJSON();
            });

            await new CourseUpdatedPublisher(natsWrapper.client).publish({
                _id: updatedCourse._id.toString(),
                name: updatedCourse.name,
                courseURL: updatedCourse.courseURL,
                learningStatus: updatedCourse.learningStatus,
                version: updatedCourse.version,
                skillId: skillJSON,
                languageId: languageJSON
            });

            res.status(201).send({ data: [updatedCourse] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as courseRouter };
