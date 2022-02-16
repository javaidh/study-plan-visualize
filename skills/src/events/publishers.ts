import {
    Publisher,
    Subjects,
    skillCreatedEvent,
    skillUpdatedEvent,
    skillDeletedEvent
} from '@ai-common-modules/events';

export class skillCreatedPublisher extends Publisher<skillCreatedEvent> {
    readonly subject = Subjects.SkillCreated;
}

export class skillDeletedPublisher extends Publisher<skillDeletedEvent> {
    readonly subject = Subjects.SkillDeleted;
}

export class skillUpdatedPublisher extends Publisher<skillUpdatedEvent> {
    readonly subject = Subjects.SkillUpdated;
}
