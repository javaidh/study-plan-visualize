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
import { databaseStatus, Skills } from '../models/skills';
import { skillUpdatedPublisher } from './publishers';

const queueGroupName = 'skills-service';

export class CourseCreatedListner extends Listener<courseCreatedEvent> {
    readonly subject = Subjects.CourseCreated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseCreatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, name, courseURL, learningStatus, skillId, version } =
                data;
            // create course in the database regardless if it is assosciated with skills or not
            const parsedCourseId = new ObjectId(_id);
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => {
                      return new ObjectId(skill);
                  })
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
                    return Skills.updateSkillByCourse({
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                // find the updated skills in the database with updated version to publish skill:updated event
                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });
                // this variable holds all the updated skill documents. Loop over them and publish skill updated event
                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? updatedSkill.course.toJSON()
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
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class CourseUpdatedListner extends Listener<courseUpdatedEvent> {
    readonly subject = Subjects.CourseUpdated;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseUpdatedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            //TODO:
            // only act on skillId values that are not deleted in database
            // only check in deletion case
            const { _id, name, courseURL, learningStatus, skillId, version } =
                data;
            // first find the course with the assosciated id only update if version is correct
            const parsedCourseId = new ObjectId(_id);
            const existingCourseVersion = version - 1;
            const existingCourse = await Course.getCourseByIdAndVersion(
                parsedCourseId,
                existingCourseVersion
            );
            if (!existingCourse)
                throw new Error('cannot find course with this id and version');

            // santize skillId to be processed later
            const parsedSkillIdArray = skillId
                ? skillId.map((skill) => new ObjectId(skill))
                : undefined;

            // we will update course regardless of what happens to the relationship between course and skill after the update event
            const courseUpdated = await Course.updateCourse({
                _id: parsedCourseId,
                name: name,
                courseURL: courseURL,
                learningStatus: learningStatus,
                version: version,
                skillId: parsedSkillIdArray
            });

            // In order to update skill database to new relation between skill and course
            // We need to know what was the old relationship between them. We have to compare skillArray in previous record
            // to skill array in this event

            // 1/4 there was no assosciated skillId in the last version of course document and new version of course document
            // we just acknowledge the message. No relationship have changed
            if (!parsedSkillIdArray && !existingCourse.skillId) msg.ack();

            // 2/4 this is the case when there were existing skillId in old version of course but no more skillId now
            // we simply remove courseId from all records in skill database
            if (!parsedSkillIdArray && existingCourse.skillId) {
                console.log('inside 2nd case');
                const parsedSkillArray = existingCourse.skillId.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database if skill is active
                const activeSkill = resolvedSkillDoc.filter((skill) => {
                    return skill.dbStatus === databaseStatus.active;
                });
                if (activeSkill.length) {
                    const updateSkills = resolvedSkillDoc.map((skill) => {
                        if (!skill.version || !skill._id)
                            throw new Error('version not defined');
                        const newVersion = skill.version + 1;
                        return Skills.updateSkillByCourse({
                            _id: skill._id,
                            version: newVersion,
                            course: undefined
                        });
                    });
                    const updatedSkills = await Promise.all(updateSkills);

                    // find the updated records in the database to publish event
                    const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                        if (!skill.version)
                            throw new Error('version not defined');

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
                                ? updatedSkill.course.toJSON()
                                : undefined;
                            return new skillUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedSkill._id.toJSON(),
                                name: updatedSkill.name,
                                version: updatedSkill.version,
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                    msg.ack();
                } else msg.ack();
            }

            // 3/4 this handles the case when there are new skillId but no old skillId. So this is like a createcourse case
            // This scenario will happen if course service was assosciated with some other service like language
            if (parsedSkillIdArray && !existingCourse.skillId) {
                console.log('inside 3rd case');
                const parsedSkillArray = parsedSkillIdArray.map((skillId) => {
                    return Skills.getSkillById(skillId);
                });
                const resolvedSkillDoc = await Promise.all(parsedSkillArray);

                // update the skill database
                const updateSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourse({
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedSkills = await Promise.all(updateSkills);

                // find the updated skills in the database with updated version to publish skill:updated event
                const findUpdatedSkills = resolvedSkillDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });
                // this variable holds all the updated skill documents. Loop over them and publish skill updated event
                const resolvedUpdatedSkills = await Promise.all(
                    findUpdatedSkills
                );
                // publish event
                const publishEventPromiseAll = resolvedUpdatedSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? updatedSkill.course.toJSON()
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
                await Promise.all(publishEventPromiseAll);
                msg.ack();
            }
            // 4/4 where skill already has relationship with course but some relationship bewteen skill and course changed in this version
            // We need to find out which relationship have been updated
            if (parsedSkillIdArray && existingCourse.skillId) {
                console.log('inside 4th case');
                // create a copy of parsedSkillIdArray
                let newSkillIdtoBeProcessed: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < parsedSkillIdArray.length; x++) {
                    const value = parsedSkillIdArray[x];
                    newSkillIdtoBeProcessed[x] = { id: value, found: true };
                }
                const exisitngSkillId: {
                    id: ObjectId;
                    found: boolean;
                }[] = [];
                for (let x = 0; x < existingCourse.skillId.length; x++) {
                    const value = existingCourse.skillId[x];
                    exisitngSkillId[x] = { id: value, found: false };
                }

                for (let x = 0; x < exisitngSkillId.length; x++) {
                    let found;
                    for (let y = 0; y < newSkillIdtoBeProcessed.length; y++) {
                        found = false;
                        // do string comparisions and check
                        const stringExistingSkillString =
                            exisitngSkillId[x].id.toString();
                        const newSkillToString =
                            newSkillIdtoBeProcessed[y].id.toString();
                        if (stringExistingSkillString === newSkillToString) {
                            found = true;
                        }
                        if (found) {
                            newSkillIdtoBeProcessed[y].found = false;
                            if (!exisitngSkillId[x].found)
                                exisitngSkillId[x].found = true;
                        }
                    }
                }
                const courseIdtobeAddedToSkill: ObjectId[] = [];
                const courseIdtobeDeletedfromSkill: ObjectId[] = [];
                for (let x = 0; x < newSkillIdtoBeProcessed.length; x++) {
                    if (newSkillIdtoBeProcessed[x].found)
                        courseIdtobeAddedToSkill.push(
                            newSkillIdtoBeProcessed[x].id
                        );
                }

                for (let x = 0; x < exisitngSkillId.length; x++) {
                    if (!exisitngSkillId[x].found)
                        courseIdtobeDeletedfromSkill.push(
                            exisitngSkillId[x].id
                        );
                }

                console.log('courseIDadded console', courseIdtobeAddedToSkill);
                console.log('deletId', courseIdtobeDeletedfromSkill);
                // update the skill database first deletecourseId
                //////////////////////////////////////////
                // hence we have to put a chek here this doesnt exist if skill deleted
                const deleteSkillIdArray = courseIdtobeDeletedfromSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolveddeleteSkillDocs = await Promise.all(
                    deleteSkillIdArray
                );
                console.log(
                    'document retrieved to delete',
                    resolveddeleteSkillDocs
                );
                const updateOnlySkillInUse = resolveddeleteSkillDocs.filter(
                    (skill) => {
                        return skill.dbStatus === databaseStatus.active;
                    }
                );
                if (updateOnlySkillInUse.length) {
                    const updateDeleteCourseId = updateOnlySkillInUse.map(
                        (skill) => {
                            if (!skill.version)
                                throw new Error('version not defined');
                            const newVersion = skill.version + 1;
                            return Skills.updateSkillByCourse({
                                _id: skill._id,
                                version: newVersion,
                                course: undefined
                            });
                        }
                    );

                    const updatedSkillwithDelete = await Promise.all(
                        updateDeleteCourseId
                    );

                    const findUpdatedSkills = resolveddeleteSkillDocs.map(
                        (skill) => {
                            if (!skill.version)
                                throw new Error('version not defined');
                            const newVersion = skill.version + 1;
                            return Skills.findSkillByIdAndVersion(
                                skill._id,
                                newVersion
                            );
                        }
                    );

                    const resolvedDeletedSkills = await Promise.all(
                        findUpdatedSkills
                    );
                    // publish event
                    const publishPromiseAll = resolvedDeletedSkills.map(
                        (updatedSkill) => {
                            if (!updatedSkill.version || !updatedSkill.name)
                                throw new Error(
                                    'we need skill database doc details to publish this event'
                                );
                            const courseToJSON = updatedSkill.course
                                ? updatedSkill.course.toJSON()
                                : undefined;
                            return new skillUpdatedPublisher(
                                natsWrapper.client
                            ).publish({
                                _id: updatedSkill._id.toJSON(),
                                name: updatedSkill.name,
                                version: updatedSkill.version,
                                course: courseToJSON
                            });
                        }
                    );
                    await Promise.all(publishPromiseAll);
                }
                // add new courseId to skill database
                const addSkillIdArray = courseIdtobeAddedToSkill.map(
                    (skillId) => {
                        return Skills.getSkillById(skillId);
                    }
                );
                const resolvedAddSkillIdDoc = await Promise.all(
                    addSkillIdArray
                );

                const updateAddCourseId = resolvedAddSkillIdDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.updateSkillByCourse({
                        _id: skill._id,
                        version: newVersion,
                        course: parsedCourseId
                    });
                });
                const updatedSkillwithAdd = await Promise.all(
                    updateAddCourseId
                );

                const findAddSkills = resolvedAddSkillIdDoc.map((skill) => {
                    if (!skill.version) throw new Error('version not defined');
                    const newVersion = skill.version + 1;
                    return Skills.findSkillByIdAndVersion(
                        skill._id,
                        newVersion
                    );
                });

                const resolvedAddSkills = await Promise.all(findAddSkills);
                // publish event
                const publishPromiseAddAll = resolvedAddSkills.map(
                    (updatedSkill) => {
                        if (!updatedSkill.version || !updatedSkill.name)
                            throw new Error(
                                'we need skill database doc details to publish this event'
                            );
                        const courseToJSON = updatedSkill.course
                            ? updatedSkill.course.toJSON()
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toJSON(),
                            name: updatedSkill.name,
                            version: updatedSkill.version,
                            course: courseToJSON
                        });
                    }
                );
                await Promise.all(publishPromiseAddAll);

                msg.ack();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

export class CourseDeletedListner extends Listener<courseDeletedEvent> {
    readonly subject = Subjects.CourseDeleted;
    queueGroupName = queueGroupName;
    async onMessage(
        data: courseDeletedEvent['data'],
        msg: Message
    ): Promise<void> {
        try {
            const { _id, skillId, version } = data;
            console.log('data', data);
            // check we have correct event version and then only update
            const existingVersion = version;
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
                    return Skills.updateSkillByCourse({
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
                            ? updatedSkill.course.toJSON()
                            : undefined;
                        return new skillUpdatedPublisher(
                            natsWrapper.client
                        ).publish({
                            _id: updatedSkill._id.toJSON(),
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
