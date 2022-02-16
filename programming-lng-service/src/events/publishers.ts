//TODO: add these events to event module
import {
    Publisher,
    Subjects,
    programmingLngCreatedCreatedEvent,
    programmingLngCreatedDeletedEvent
} from '@ai-common-modules/events';

export class programmingLngCreatedPublisher extends Publisher<programmingLngCreatedCreatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageCreated;
}

export class programmingLngDeletedPublisher extends Publisher<programmingLngCreatedDeletedEvent> {
    readonly subject = Subjects.ProgrammingLanguageDeleted;
}
