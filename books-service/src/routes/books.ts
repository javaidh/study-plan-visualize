import express, { NextFunction, Response, Request } from 'express';
import { ObjectId } from 'mongodb';
import { natsWrapper } from '../../nats-wrapper';
import { CustomRequest, AddBook, StringBody } from '../types/interfaceRequest';
import {
    BookCreatedPublisher,
    BookDeletedPublisher,
    BookUpdatedPublisher
} from '../events/publishers';
import { BadRequestError } from '../errors/badRequestError';
import { logErrorMessage } from '../errors/customError';
import { DatabaseErrors } from '../errors/databaseErrors';
import { Skills } from '../models/skills';
import { ProgrammingLng } from '../models/programmingLng';
import { Book } from '../models/book';

const router = express.Router();

router.post(
    '/api/book/add',
    async (req: CustomRequest<AddBook>, res: Response, next: NextFunction) => {
        try {
            const {
                bookName,
                bookAuthor,
                bookVersion,
                skills,
                languages,
                learningStatus
            } = req.body;
            if (!bookName || !bookAuthor || !learningStatus)
                throw new BadRequestError('please provide book name and url');
            if (!skills && !languages)
                throw new BadRequestError('provide either skill or language');
            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );

            // check if bookName already exists in database
            const existingDoc = await Book.getBookByName(bookName);
            if (existingDoc.length)
                throw new DatabaseErrors('book name already in use');
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

                // map and only keep ids to store in cpurse database
                languageId = allLanguages.map((language) => {
                    return language._id;
                });
            }
            const documentCreated = await Book.insertBook({
                name: bookName,
                bookAuthor,
                bookVersion,
                learningStatus,
                version,
                skillId,
                languageId
            });

            if (!documentCreated.length)
                throw new DatabaseErrors('unable to create book');

            // publish the event
            const document = documentCreated[0];
            if (
                !document.name ||
                !document.version ||
                !document.bookAuthor ||
                !document.learningStatus
            )
                throw new Error(
                    'book name ,version, bookAuthor, learning status required to publish event '
                );
            const skillJSON = document.skillId?.map((id) => {
                return id.toJSON();
            });
            const languageJSON = document.languageId?.map((id) => {
                return id.toJSON();
            });
            await new BookCreatedPublisher(natsWrapper.client).publish({
                _id: document._id.toString(),
                name: document.name,
                version: document.version,
                bookAuthor: document.bookAuthor,
                bookVersion: document.bookVersion,
                learningStatus: document.learningStatus,
                skillId: skillJSON,
                languageId: languageJSON
            });
            res.status(201).send({ data: documentCreated });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/book/all',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const documents = await Book.getAllBook();
            res.status(200).send({ data: documents });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

router.get(
    '/api/book/:id',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);
            const document = await Book.getBookById(_id);
            res.status(200).send({ data: document });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// delete
router.post(
    '/api/book/destroy',
    async (
        req: CustomRequest<StringBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { id } = req.body;
            if (!id)
                throw new BadRequestError('please provide id to delete Book');
            const _id = new ObjectId(id);

            // find the course with id in database
            const documentArray = await Book.getBookById(_id);
            if (!documentArray.length)
                throw new BadRequestError(
                    'cannot find book with the required id'
                );
            const document = documentArray[0];
            if (
                !document.version ||
                !document.name ||
                !document.bookAuthor ||
                !document.learningStatus
            )
                throw new Error(
                    'version dbStatus and name are needed to publish event'
                );
            const deletedDocument = await Book.deleteBookById(_id);

            const skillJSON = document.skillId?.map((id) => {
                return id.toJSON();
            });
            const languageJSON = document.languageId?.map((id) => {
                return id.toJSON();
            });

            if (deletedDocument) {
                // publish event
                await new BookDeletedPublisher(natsWrapper.client).publish({
                    _id: document._id.toString(),
                    name: document.name,
                    bookAuthor: document.bookAuthor,
                    bookVersion: document.bookVersion,
                    learningStatus: document.learningStatus,
                    skillId: skillJSON,
                    languageId: languageJSON,
                    version: document.version
                });
            }
            res.status(201).send({ data: deletedDocument });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

// update course
router.post(
    '/api/book/update',
    async (req: CustomRequest<AddBook>, res: Response, next: NextFunction) => {
        try {
            const {
                bookId,
                bookName,
                bookAuthor,
                bookVersion,
                skills,
                languages,
                learningStatus
            } = req.body;
            if (!bookName || !bookAuthor || !learningStatus || !bookId)
                throw new BadRequestError(
                    'please provide course name url, courseId and learning status and courseId'
                );
            if (!skills && !languages)
                throw new BadRequestError('provide either skill or language');

            if (learningStatus < 0 || learningStatus > 100)
                throw new BadRequestError(
                    'learnning status must be between 0 and 100'
                );
            const parsedId = new ObjectId(bookId);
            // check if course exists in database
            const existingDocument = await Book.getBookById(parsedId);
            if (!existingDocument)
                throw new BadRequestError(
                    'course does not exist with name and id'
                );
            const document = existingDocument[0];
            if (!document.version || !document.name)
                throw new Error(
                    'version dbStatus and name are needed to update record'
                );

            const newVersion = document.version + 1;

            let newSkillId: ObjectId[] | undefined;
            let newLanguageId: ObjectId[] | undefined;

            //check if skillId and name supplied by user exist in database
            if (skills) {
                const promiseSkillArray = skills.map((skill) => {
                    const parsedId = new ObjectId(skill.id);
                    return Skills.findSkillByIdAndName(parsedId, skill.name);
                });

                const allSkills = await Promise.all(promiseSkillArray);

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

                // map and only keep ids to store in course database
                newLanguageId = allLanguages.map((language) => {
                    return language._id;
                });
            }

            // update book database
            const documentCreated = await Book.updateBook({
                _id: parsedId,
                name: bookName,
                bookAuthor: bookAuthor,
                bookVersion: bookVersion,
                learningStatus,
                version: newVersion,
                skillId: newSkillId,
                languageId: newLanguageId
            });
            if (!documentCreated) {
                throw new Error('failed to update book');
            }
            // find updated book to publish event and send to front -end
            const updatedDocument = await Book.getBookByIdAndVersion(
                parsedId,
                newVersion
            );
            if (!updatedDocument)
                throw new DatabaseErrors('unable to update course');

            // publish the event
            if (
                !updatedDocument.name ||
                !updatedDocument.version ||
                !updatedDocument.bookAuthor ||
                !updatedDocument.learningStatus
            )
                throw new Error(
                    'we need course, version, database status to publish event'
                );

            const skillJSON = updatedDocument.skillId?.map((id) => {
                return id.toJSON();
            });

            const languageJSON = updatedDocument.languageId?.map((id) => {
                return id.toJSON();
            });

            await new BookUpdatedPublisher(natsWrapper.client).publish({
                _id: updatedDocument._id.toString(),
                name: updatedDocument.name,
                bookAuthor: updatedDocument.bookAuthor,
                bookVersion: updatedDocument.bookVersion,
                learningStatus: updatedDocument.learningStatus,
                version: updatedDocument.version,
                skillId: skillJSON,
                languageId: languageJSON
            });

            res.status(201).send({ data: [updatedDocument] });
        } catch (err) {
            logErrorMessage(err);
            next(err);
        }
    }
);

export { router as booksRouter };
