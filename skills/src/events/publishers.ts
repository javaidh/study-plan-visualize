import {
    Publisher,
    Subjects,
    skillCreatedEvent,
    skillDeletedEvent
} from '@ai-common-modules/events';

export class skillCreatedPublisher extends Publisher<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
}

export class skillDeletedPublisher extends Publisher<skillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
}
