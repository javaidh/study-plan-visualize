import {
    Publisher,
    Subjects,
    bookCreatedEvent,
    bookDeletedEvent,
    bookUpdatedEvent
} from '@ai-common-modules/events';

export class BookCreatedPublisher extends Publisher<bookCreatedEvent> {
    readonly subject = Subjects.BookCreated;
}

export class BookDeletedPublisher extends Publisher<bookDeletedEvent> {
    readonly subject = Subjects.BookDeleted;
}

export class BookUpdatedPublisher extends Publisher<bookUpdatedEvent> {
    readonly subject = Subjects.BookUpdated;
}
