import { Message } from 'node-nats-streaming';
import { natsWrapper } from '../nats-wrapper';
import {
    Listener,
    Subjects,
    courseCreatedEvent,
    courseDeletedEvent,
    courseUpdatedEvent
} from '@ai-common-modules/events';
import { Course } from '../models/course';
import { ObjectId } from 'mongodb';
import { Skills } from '../models/skills';
import { skillUpdatedPublisher } from './publishers';

export class CourseCreatedListner extends Listener<courseCreatedEvent> {
    readonly subject = Subjects.CourseCreated;
    queueGroupName = 'skills-service';
    async onMessage(
        data: {
            _id: string;
            name: string;
            courseURL: string;
            learningStatus: number;
            skillId?: string[] | undefined;
            version: number;
        },
        msg: Message
    ): Promise<void> {
        try {
            console.log('EventData', data, msg);
            const { _id, name, courseURL, learningStatus, skillId, version } =
                data;
            // create course in the database regardless if it is assosciated with skills or not
            const parsedCourseId = new ObjectId(_id);
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => new ObjectId(skill))
                : undefined;
            const courseCreated = await Course.insertCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                skillId: parsedSkillIdArray
            });
            if (!parsedSkillIdArray) msg.ack();

            // if course is assosciated with skill then we need to update skill db
            if (parsedSkillIdArray) {
                // if courseId is associsated with multiple skills we need to do promiseAll to update every skill
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourseBook({
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? JSON.stringify(updatedSkill.course)
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class CourseUpdatedListner extends Listener<courseUpdatedEvent> {
    readonly subject = Subjects.CourseUpdated;
    queueGroupName = 'skills-service';
    async onMessage(
        data: {
            _id: string;
            name: string;
            courseURL: string;
            learningStatus: number;
            skillId?: string[] | undefined;
            version: number;
        },
        msg: Message
    ): Promise<void> {
        try {
            console.log('EventData', data, msg);
            const { _id, name, courseURL, learningStatus, skillId, version } =
                data;

            // // first find the course with the assosciated id only update if version is correct
            const parsedCourseId = new ObjectId(_id);
            const existingCourseVersion = version - 1;
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingCourseVersion
            );
            if (!existingCourse)
                throw new Error('cannot find course with this id and version');

            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => new ObjectId(skill))
                : undefined;

            // we will update course regardless what happens to the relationship between course and skill
            const courseUpdated = await Course.updateCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                skillId: parsedSkillIdArray
            });

            //relationship cases compare to old version
            // 1/3 there was no assosciated skillId in the last version so we are good
            if (!parsedSkillIdArray && !existingCourse.skillId) msg.ack();

            // 2/3 this is the case when there were existing skillId in old version of course but no more skillId now
            if (!parsedSkillIdArray && existingCourse.skillId) {
                // just go in skills database remove all the instance where there wer courseId and send update event
                const parsedSkillArray = existingCourse.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version || !skill._id)
                        throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourseBook({
                        _id: skill._id,
                        version: newVersion,
                        course: undefined
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? JSON.stringify(updatedSkill.course)
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishPromiseAll);
                msg.ack();
            }

            // 3/3 this is generic case when there were skill Id in past and now but some SkillId might have been removed or added
            // also handles the case when no skillId in the past but now there is
            if (parsedSkillIdArray) {
                // if courseId is associsated with multiple skills we need to do promiseAll to update every skill
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourseBook({
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? JSON.stringify(updatedSkill.course)
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class CourseDeletedListner extends Listener<courseDeletedEvent> {
    readonly subject = Subjects.CourseDeleted;
    queueGroupName = 'skills-service';
    async onMessage(
        data: {
            _id: string;
            skillId?: string[] | undefined;
            version: number;
        },
        msg: Message
    ): Promise<void> {
        try {
            const { _id, skillId, version } = data;
            // check we have correct event version and then only update
            const existingVersion = version - 1;
            const parsedCourseId = new ObjectId(_id);
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingVersion
            );
            if (!existingVersion) throw new Error('we cant update yet');
            const deleteCourse = await Course.deleteCourseById(parsedCourseId);
            if (!deleteCourse)
                throw new Error(
                    'something went wrong and we will reporcess event when sent back to us'
                );

            // if existingCourse did not have any skillid we can just ackowledge the event
            if (!existingCourse.skillId) msg.ack();

            // check if the deleted course had any skills attahced to it. Go update those skill docs
            if (existingCourse.skillId) {
                const parsedSkillArray = existingCourse.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version || !skill._id)
                        throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourseBook({
                        _id: skill._id,
                        version: newVersion,
                        course: undefined
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? JSON.stringify(updatedSkill.course)
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toString(),
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}
