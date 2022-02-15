import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { connectDb } from './services/mongodb';
import { booksRouter } from './routes/books';
import { errorHandler } from './middlewares/errorHandler';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        const app = express();
        app.set('trust proxy', true);

        // check if environment variable exists
        if (!process.env.MONGO_DB_CONNECTION_STRING)
            throw new Error('environment variable not defined');

        // connect to db
        await connectDb();

        //middleware
        app.use(bodyParser.json());

        // api-documentation
        //  app.use(
        //     '/api/todo/task-docs',
        //     swaggerUi.serve,
        //     swaggerUi.setup(swaggerDocument)
        // );
        app.use(booksRouter);

        // error-handler
        app.use(errorHandler);

        //listen on port
        app.listen(PORT, () => {
            console.log(`books service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer();
