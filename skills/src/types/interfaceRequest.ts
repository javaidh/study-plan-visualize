import { Request } from 'express';

export interface ReqAnnotateBodyString extends Request {
    body: { [key: string]: string | undefined };
}
