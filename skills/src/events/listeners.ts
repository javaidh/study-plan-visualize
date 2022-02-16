import {
    Listener,
    Subjects,
    skillCreatedEvent,
    skillDeletedEvent
} from '@ai-common-modules/events';

// export class SkillCreatedListner extends Listener<skillCreatedEvent> {
//     readonly subject = Subjects.SkillCreated;
//     queueGroupName = 'skills-service';
//     onMessage(data: { _id: string; name: string }, msg: Message): void {
//         console.log('EventData', data, msg);
//         msg.ack();
//     }
// }
