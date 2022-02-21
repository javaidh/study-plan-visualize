import { Message, version } from 'node-nats-streaming';
import { ObjectId } from 'mongodb';
import {
    Listener,
    Subjects,
    skillCreatedEvent,
    skillDeletedEvent,
    skillUpdatedEvent,
    programmingLngCreatedEvent,
    programmingLngUpdatedEvent,
    programmingLngDeletedEvent
} from '@ai-common-modules/events';

import { queueGroupName } from './quegroup';
import { natsWrapper } from '../../nats-wrapper';
import { BookUpdatedPublisher } from './publishers';
import { Skills } from '../models/skills';
import { Book } from '../models/book';
import { ProgrammingLng } from '../models/programmingLng';

export class SkillCreatedListner extends Listener<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: skillCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, book } = data;
            const convertedId = new ObjectId(_id);
            // persist the data in the skills database created in book collection
            const parsedBookId = book ? new ObjectId(book) : undefined;

            const skillCreated = await Skills.insertSkill({
                _id: convertedId,
                name: name,
                version: version,
                book: parsedBookId
            });
            msg.ack();
        } catch (err) {
            console.log(err);
        }
    }
}

export class SkillUpdatedListner extends Listener<skillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: skillUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, book } = data;
            const convertedId = new ObjectId(_id);
            const existingVersion = version - 1;
            // persist the data in the skills database created in book collection
            // Only process if version is 1 greater then current version in database
            const existingSkill = await Skills.findSkillByIdAndVersion(
                convertedId,
                existingVersion
            );
            if (existingSkill) {
                // that means you are processing right event
                const parsedBookId = book ? new ObjectId(book) : undefined;

                const skillUpdated = await Skills.updateSkill({
                    _id: convertedId,
                    name: name,
                    version: version,
                    book: parsedBookId
                });
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class skillDeletedListener extends Listener<skillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
    queueGroupName = queueGroupName;

    async onMessage(
        data: skillDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, version, book } = data;

            // sanity check: check if skill exists in skill database in book service
            const skillId = new ObjectId(_id);
            const existingSkill = await Skills.findSkillByIdAndVersion(
                skillId,
                version
            );

            if (!existingSkill)
                throw new Error('cannot find skill record with skill id');

            // if skillId exists we have to delete it from skill database
            // regardless of whether this skill was assosciated with book or not
            const deletedSkill = await Skills.deleteSkillById(skillId);

            const parsedBookId = book ? new ObjectId(book) : undefined;

            // If skill was assosciated with a book then we need to update book database to remove that skill Id
            // If it was not assosciated we will just acknowledge that we have processed the event
            if (deletedSkill && parsedBookId) {
                // sanity check: check if the supplied bookId is correct
                const existingBook = await Book.getBookById(parsedBookId);

                if (!existingBook.length)
                    throw new Error('cannot find book with the id supplied');

                // // pull out the book document
                const bookDoc = existingBook[0];
                // // pull out the existing version as now we are updating book database so we need a new version
                const exisitngBookVersion = bookDoc.version;

                if (!exisitngBookVersion)
                    throw new Error('book version needed to update book');

                const newVersion = exisitngBookVersion + 1;

                // Update book with newVersion and remove skillId at the same time
                const updated = await Book.updateBookRemoveSkillId(
                    parsedBookId,
                    newVersion,
                    skillId
                );

                // pull the updated book from the database to publish an event
                const updatedBook = await Book.getBookByIdAndVersion(
                    parsedBookId,
                    newVersion
                );
                if (!updatedBook) throw new Error('unable to update book');

                // publish the event
                if (
                    !updatedBook.name ||
                    !updatedBook.version ||
                    !updatedBook.learningStatus
                )
                    throw new Error(
                        'we need book, version, database status to publish event'
                    );

                const skillJSON = updatedBook.skillId?.map((id) => {
                    return id.toJSON();
                });

                const languageJSON = updatedBook.languageId?.map((id) => {
                    return id.toJSON();
                });

                await new BookUpdatedPublisher(natsWrapper.client).publish({
                    _id: updatedBook._id.toString(),
                    name: updatedBook.name,
                    bookAuthor: updatedBook.bookAuthor,
                    bookVersion: updatedBook.bookVersion,
                    learningStatus: updatedBook.learningStatus,
                    version: updatedBook.version,
                    skillId: skillJSON,
                    languageId: languageJSON
                });

                msg.ack();
            } else if (deletedSkill) {
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class ProgrammingLngCreatedListner extends Listener<programmingLngCreatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: programmingLngCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, book } = data;
            const convertedId = new ObjectId(_id);
            // persist the data in the languages database created in book collection
            const parsedBookId = book ? new ObjectId(book) : undefined;

            const languageCreated = await ProgrammingLng.insertProgrammingLng({
                _id: convertedId,
                name: name,
                version: version,
                book: parsedBookId
            });
            msg.ack();
        } catch (err) {
            console.log(err);
        }
    }
}

export class ProgrammingLngUpdatedListner extends Listener<programmingLngUpdatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: programmingLngUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, book } = data;
            const convertedId = new ObjectId(_id);
            const existingVersion = version - 1;
            // persist the data in the languages database created in book collection
            // Only process if version is 1 greater then current version in database
            const existingLanguage =
                await ProgrammingLng.findProgrammingLngByIdAndVersion(
                    convertedId,
                    existingVersion
                );
            if (existingLanguage) {
                // that means you are processing right event
                const parsedBookId = book ? new ObjectId(book) : undefined;

                const languageUpdated = await ProgrammingLng.updateLanguage({
                    _id: convertedId,
                    name: name,
                    version: version,
                    book: parsedBookId
                });
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class ProgrammingLngDeletedListener extends Listener<programmingLngDeletedEvent> {
    readonly subject = Subjects.ProgrammingLanguageDeleted;
    queueGroupName = queueGroupName;

    async onMessage(
        data: programmingLngDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, version, book } = data;

            // sanity check: check if Language exists in Language database in book service
            const languageId = new ObjectId(_id);
            const existingLanguage =
                await ProgrammingLng.findProgrammingLngByIdAndVersion(
                    languageId,
                    version
                );

            if (!existingLanguage)
                throw new Error('cannot find Language record with Language id');

            // if LanguageId exists we have to delete it from Language database
            // regardless of whether this Language was assosciated with book or not
            const deletedLanguage =
                await ProgrammingLng.deleteProgrammingLngById(languageId);

            const parsedBookId = book ? new ObjectId(book) : undefined;

            // If Language was assosciated with a book then we need to update book database to remove that Language Id
            // If it was not assosciated we will just acknowledge that we have processed the event
            if (deletedLanguage && parsedBookId) {
                // sanity check: check if the supplied bookId is correct
                const existingBook = await Book.getBookById(parsedBookId);

                if (!existingBook.length)
                    throw new Error('cannot find book with the id supplied');

                // // pull out the book document
                const bookDoc = existingBook[0];
                // // pull out the existing version as now we are updating book database so we need a new version
                const exisitngBookVersion = bookDoc.version;

                if (!exisitngBookVersion)
                    throw new Error('book version needed to update book');

                const newVersion = exisitngBookVersion + 1;

                // Update book with newVersion and remove LanguageId at the same time
                const updated = await Book.updateBookRemoveLanguageId(
                    parsedBookId,
                    newVersion,
                    languageId
                );

                // pull the updated book from the database to publish an event
                const updatedBook = await Book.getBookByIdAndVersion(
                    parsedBookId,
                    newVersion
                );
                if (!updatedBook) throw new Error('unable to update book');

                // publish the event
                if (
                    !updatedBook.name ||
                    !updatedBook.version ||
                    !updatedBook.learningStatus
                )
                    throw new Error(
                        'we need book, version, database status to publish event'
                    );

                const skillJSON = updatedBook.skillId?.map((id) => {
                    return id.toJSON();
                });

                const languageJSON = updatedBook.languageId?.map((id) => {
                    return id.toJSON();
                });

                await new BookUpdatedPublisher(natsWrapper.client).publish({
                    _id: updatedBook._id.toString(),
                    name: updatedBook.name,
                    bookAuthor: updatedBook.bookAuthor,
                    bookVersion: updatedBook.bookVersion,
                    learningStatus: updatedBook.learningStatus,
                    version: updatedBook.version,
                    skillId: skillJSON,
                    languageId: languageJSON
                });

                msg.ack();
            } else if (deletedLanguage) {
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}
