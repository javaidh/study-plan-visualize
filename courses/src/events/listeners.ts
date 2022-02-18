import { Message } from 'node-nats-streaming';
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
import { natsWrapper } from '../../nats-wrapper';
import { CourseUpdatedPublisher } from './publishers';
import { Skills } from '../models/skills';
import { Course } from '../models/course';
import { ProgrammingLng } from '../models/programmingLng';
import { ObjectId } from 'mongodb';

export class SkillCreatedListner extends Listener<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = 'course-service';
    async onMessage(
        data: {
            _id: string;
            name: string;
            version: number;
            course: string | undefined;
        },
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, course } = data;
            const convertedId = new ObjectId(_id);
            // persist the data in the skills database created in course collection
            const parsedCourseId = course ? new ObjectId(course) : undefined;

            const skillCreated = await Skills.insertSkill({
                _id: convertedId,
                name: name,
                version: version,
                course: parsedCourseId
            });
            msg.ack();
        } catch (err) {
            console.log(err);
        }
    }
}

export class SkillUpdatedListner extends Listener<skillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
    queueGroupName = 'course-service';
    async onMessage(
        data: {
            _id: string;
            name: string;
            version: number;
            course: string | undefined;
        },
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, version, course } = data;
            const convertedId = new ObjectId(_id);
            const existingVersion = version - 1;
            // persist the data in the skills database created in course collection
            // Only process if version is 1 greater then current version in database
            const existingSkill = await Skills.findSkillByIdAndVersion(
                convertedId,
                existingVersion
            );
            if (existingSkill) {
                // that means you are processing right event
                const parsedCourseId = course
                    ? new ObjectId(course)
                    : undefined;

                const skillUpdated = await Skills.updateSkill({
                    _id: convertedId,
                    name: name,
                    version: version,
                    course: parsedCourseId
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
    queueGroupName = 'course-service';

    async onMessage(
        data: {
            _id: string;
            name: string;
            version: number;
            course: string | undefined;
        },
        msg: Message
    ): Promise<void> {
        try {
            const { _id, version, course } = data;

            // sanity check: check if skill exists in skill database in course service
            const skillId = new ObjectId(_id);
            const existingSkill = await Skills.findSkillByIdAndVersion(
                skillId,
                version
            );

            if (!existingSkill)
                throw new Error('cannot find skill record with skill id');

            // if skillId exists we have to delete it from skill database
            // regardless of whether this skill was assosciated with course or not
            const deletedSkill = await Skills.deleteSkillById(skillId);

            const parsedCourseId = course ? new ObjectId(course) : undefined;

            // If skill was assosciated with a courswe then we need to update course database to remove that skill Id
            // If it was not assosciated we will just acknowledge that we have processed the event
            if (deletedSkill && parsedCourseId) {
                // sanity check: check if the supplied courseId is correct
                const existingCourse = await Course.getCourseById(
                    parsedCourseId
                );

                if (!existingCourse.length)
                    throw new Error('cannot find course with the id supplied');

                // // pull out the course document
                const courseDoc = existingCourse[0];
                // // pull out the existing version as now we are updating course database so we need a new version
                const exisitngCourseVersion = courseDoc.version;

                if (!exisitngCourseVersion)
                    throw new Error('course version needed to update course');

                const newVersion = exisitngCourseVersion + 1;

                // Update course with newVersion and remove skillId at the same time
                const updated = await Course.updateCourseRemoveSkillId(
                    parsedCourseId,
                    newVersion,
                    skillId
                );

                // pull the updated course from the database to publish an event
                const updatedCourse = await Course.getCourseByIdAndVersion(
                    parsedCourseId,
                    newVersion
                );
                if (!updatedCourse) throw new Error('unable to update course');

                // // publish the event
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
    queueGroupName = 'course-service';
    async onMessage(
        data: { _id: string; name: string; version: number; dbStatus: string },
        msg: Message
    ): Promise<void> {
        const { _id, name, version } = data;
        const convertedId = new ObjectId(_id);
        // persist the data in the skills database created in course collection
        const programmingLngCreated = await ProgrammingLng.insertProgrammingLng(
            {
                _id: convertedId,
                name: name,
                version: version
            }
        );
        msg.ack();
    }
}

export class ProgrammingLngUpdatedListner extends Listener<programmingLngUpdatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageUpdated;
    queueGroupName = 'course-service';
    async onMessage(
        data: { _id: string; name: string; version: number },
        msg: Message
    ): Promise<void> {
        const { _id, name, version } = data;
        const convertedId = new ObjectId(_id);
        const existingVersion = version - 1;
        // persist the data in the skills database created in course collection
        // Only process if version is 1 greater then current version in database
        const existingProgramming =
            await ProgrammingLng.findProgrammingLngByIdAndVersion(
                convertedId,
                existingVersion
            );
        if (existingProgramming) {
            // that means you are processing right event
            const programmingUpdated =
                await ProgrammingLng.updateProgrammingLngName({
                    _id: convertedId,
                    name: name,
                    version: version
                });
            msg.ack();
        }
    }
}
