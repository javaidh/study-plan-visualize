import { ErrorStructureInstance } from '../middlewares/errorHandler';

export abstract class CustomError extends Error {
    abstract statusCode: number;

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CustomError.prototype);
    }

    abstract serializeErrors(): ErrorStructureInstance[];
}

export const logErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        // this is for development & debugging purposes. We dont want internal errors to be sent to users
        console.log(error.message);
    }
};
