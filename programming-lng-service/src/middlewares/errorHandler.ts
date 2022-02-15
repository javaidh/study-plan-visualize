import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../errors/customError';

export type ErrorStructure = {
    errors: ErrorStructureInstance[];
};

export type ErrorStructureInstance = {
    message: string;
    field?: string;
};
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof CustomError) {
        return res
            .status(err.statusCode)
            .send({ errors: err.serializeErrors() });
    }
    res.status(400).send({ errors: [{ message: 'something went wrong' }] });
};
