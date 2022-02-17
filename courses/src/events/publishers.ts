import {
    Publisher,
    Subjects,
    programmingLngCreatedEvent,
    programmingLngDeletedEvent,
    programmingLngUpdatedEvent
} from '@ai-common-modules/events';

export class programmingLngCreatedPublisher extends Publisher<programmingLngCreatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageCreated;
}

export class programmingLngDeletedPublisher extends Publisher<programmingLngDeletedEvent> {
    readonly subject = Subjects.ProgrammingLanguageDeleted;
}

export class programmingLngUpdatedPublisher extends Publisher<programmingLngUpdatedEvent> {
    readonly subject = Subjects.ProgrammingLanguageUpdated;
}
