import { Request } from 'express';

export interface AddBook {
    bookName: string | undefined;
    bookAuthor: string | undefined;
    bookVersion: number;
    learningStatus: number | undefined;
    skills?: { id: string; name: string }[];
    languages?: { id: string; name: string }[];
    bookId?: string | undefined;
}

export interface StringBody {
    [key: string]: string | undefined;
}

export interface CustomRequest<T> extends Request {
    body: T;
}
