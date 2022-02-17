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

import { Skills } from '../models/skills';
import { ProgrammingLng } from '../models/programmingLng';
import { ObjectId } from 'mongodb';

export class SkillCreatedListner extends Listener<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = 'course-service';
    async onMessage(
        data: { _id: string; name: string; version: number; dbStatus: string },
        msg: Message
    ): Promise<void> {
        const { _id, name, version } = data;
        const convertedId = new ObjectId(_id);
        console.log('EventData', data);
        // persist the data in the skills database created in course collection
        const skillCreated = await Skills.insertSkill({
            _id: convertedId,
            name: name,
            version: version
        });
        console.log('event succesfully processed by course-service');
        msg.ack();
    }
}

export class SkillUpdatedListner extends Listener<skillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
    queueGroupName = 'course-service';
    async onMessage(
        data: { _id: string; name: string; version: number },
        msg: Message
    ): Promise<void> {
        const { _id, name, version } = data;
        const convertedId = new ObjectId(_id);
        const existingVersion = version - 1;
        console.log('EventData', data);
        // persist the data in the skills database created in course collection
        // Only process if version is 1 greater then current version in database
        const existingSkill = await Skills.findSkillByIdAndVersion(
            convertedId,
            existingVersion
        );
        if (existingSkill.length) {
            // that means you are processing right event
            const skillUpdated = await Skills.updateSkillName({
                _id: convertedId,
                name: name,
                version: version
            });
            console.log('event succesfully processed by course-service');
            msg.ack();
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
        console.log('EventData', data);
        // persist the data in the skills database created in course collection
        const programmingLngCreated = await ProgrammingLng.insertProgrammingLng(
            {
                _id: convertedId,
                name: name,
                version: version
            }
        );
        console.log('event succesfully processed by course-service');
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
        console.log('EventData', data);
        // persist the data in the skills database created in course collection
        // Only process if version is 1 greater then current version in database
        const existingProgramming =
            await ProgrammingLng.findProgrammingLngByIdAndVersion(
                convertedId,
                existingVersion
            );
        if (existingProgramming.length) {
            // that means you are processing right event
            const programmingUpdated =
                await ProgrammingLng.updateProgrammingLngName({
                    _id: convertedId,
                    name: name,
                    version: version
                });
            console.log('event succesfully processed by course-service');
            msg.ack();
        }
    }
}
