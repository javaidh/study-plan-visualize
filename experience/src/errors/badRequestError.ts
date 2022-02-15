import { CustomError } from './customError';
import { ErrorStructureInstance } from '../middlewares/errorHandler';

export class BadRequestError extends CustomError {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 400;
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
    serializeErrors(): ErrorStructureInstance[] {
        return [
            {
                message: this.message
            }
        ];
    }
}
