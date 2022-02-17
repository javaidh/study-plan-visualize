import { Request } from 'express';

export interface AddCourse {
    courseName: string | undefined;
    courseURL: string | undefined;
    learningStatus: number | undefined;
    skills?: { id: string; name: string }[];
    languages?: { id: string; name: string }[];
    courseId?: string;
}

export interface StringBody {
    [key: string]: string | undefined;
}

export interface CustomRequest<T> extends Request {
    body: T;
}
