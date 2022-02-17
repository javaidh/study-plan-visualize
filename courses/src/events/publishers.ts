import {
    Publisher,
    Subjects,
    courseCreatedEvent,
    courseDeletedEvent,
    courseUpdatedEvent
} from '@ai-common-modules/events';

export class CourseCreatedPublisher extends Publisher<courseCreatedEvent> {
    readonly subject = Subjects.CourseCreated;
}

export class CourseDeletedPublisher extends Publisher<courseDeletedEvent> {
    readonly subject = Subjects.CourseDeleted;
}

export class CourseUpdatedPublisher extends Publisher<courseUpdatedEvent> {
    readonly subject = Subjects.CourseUpdated;
}
