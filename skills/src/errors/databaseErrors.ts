import { ErrorStructureInstance } from '../middlewares/errorHandler';
import { CustomError } from './customError';

export class DatabaseErrors extends CustomError {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 500;
        Object.setPrototypeOf(this, DatabaseErrors.prototype);
    }

    serializeErrors(): ErrorStructureInstance[] {
        return [
            {
                message: this.message
            }
        ];
    }
}
