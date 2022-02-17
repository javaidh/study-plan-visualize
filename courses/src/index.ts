import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { natsWrapper } from '../nats-wrapper';
import {
    SkillCreatedListner,
    SkillUpdatedListner,
    ProgrammingLngCreatedListner,
    ProgrammingLngUpdatedListner
} from './events/listeners';
import { connectDb } from './services/mongodb';
import { courseRouter } from './routes/course';
import { errorHandler } from './middlewares/errorHandler';
import swaggerDocument from './swagger/course-api.json';

const PORT = process.env.PORT || 7000;

const startServer = async () => {
    try {
        const app = express();
        app.set('trust proxy', true);

        // check if environment variable exists
        if (
            !process.env.MONGO_DB_CONNECTION_STRING ||
            !process.env.NATS_URL ||
            !process.env.NATS_CLUSTER_ID ||
            !process.env.NATS_CLIENT_ID
        )
            throw new Error('environment variable not defined');
        console.log(process.env.NATS_CLIENT_ID);

        // connect to nats
        // the second argument clientId needs to be unique for every copy of this service you spinup in kubernetes
        await natsWrapper.connect(
            process.env.NATS_CLUSTER_ID,
            process.env.NATS_CLIENT_ID,
            process.env.NATS_URL
        );
        // gracefully shutdown nats if nats try to close
        natsWrapper.client.on('close', () => {
            console.log('nats connection closed');
            process.exit();
        });

        process.on('SIGINT', () => natsWrapper.client.close());
        process.on('SIGTERM', () => natsWrapper.client.close());

        // listen for events from other services
        new SkillCreatedListner(natsWrapper.client).listen();
        new SkillUpdatedListner(natsWrapper.client).listen();
        // TODO: manual check these routes
        new ProgrammingLngCreatedListner(natsWrapper.client).listen();
        new ProgrammingLngUpdatedListner(natsWrapper.client).listen();

        // connect to db
        await connectDb();

        //middleware
        app.use(bodyParser.json());

        // api-documentation
        app.use(
            '/api/course/course-docs',
            swaggerUi.serve,
            swaggerUi.setup(swaggerDocument)
        );
        app.use(courseRouter);

        // error-handler
        app.use(errorHandler);

        //listen on port
        app.listen(PORT, () => {
            console.log(`course service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer();
