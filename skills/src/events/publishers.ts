// TODO: fix imports after shifting to node_module
import { Publisher } from '../nats/publisher';
import { Subjects } from '../nats/subjects';
import { skillCreatedEvent } from '../nats/dataTypes';

export class skillCreatedPublisher extends Publisher<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
}
