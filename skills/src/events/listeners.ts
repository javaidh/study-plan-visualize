// TODO: fix imports after shifting to node_module
import { Listener } from '../nats/listener';
import { Subjects } from '../nats/subjects';
import { skillCreatedEvent } from '../nats/dataTypes';
import { Message } from 'node-nats-streaming';

export class SkillCreatedListner extends Listener<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
    queueGroupName = 'skills-service';
    onMessage(data: { _id: string; name: string }, msg: Message): void {
        console.log('EventData', data, msg);
        msg.ack();
    }
}
