// this file contains all the channel names different services will subscribe to recieve, create event
export enum Subjects {
    SkillCreated = 'skill:created',
    SkillUpdated = 'skill:updated',
    SkillDeleted = 'skill:deleted',
    ProgrammingLanguageCreated = 'programminglanguage:created',
    ProgrammingLanguageUpdated = 'programminglanguage:updated',
    ProgrammingLanguageDeleted = 'programminglanguage:deleted',
    CourseCreated = 'course:created',
    CourseUpdated = 'course:updated',
    CourseDeleted = 'course:deleted',
    BookCreated = 'book:created',
    BookUpdated = 'book:updated',
    BookDeleted = 'book:deleted'
}
