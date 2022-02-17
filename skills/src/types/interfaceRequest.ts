import { Request } from 'express';

export interface ReqAnnotateBodyString extends Request {
    body: { [key: string]: string | undefined };
}

export interface StringBody {
    [key: string]: string | undefined;
}
