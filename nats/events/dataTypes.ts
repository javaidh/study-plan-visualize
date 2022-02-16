import { Subjects } from "./subjects";

// This file contains all types of data emited by events
export interface skillCreatedEvent {
  subject: Subjects.SkillCreated;
  data: {
    _id: string;
    name: string;
  };
}
