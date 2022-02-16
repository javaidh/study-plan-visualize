import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { natsWrapper } from './nats-wrapper';
import { connectDb } from './services/mongodb';
import { programmingLngRouter } from './routes/programmingLng';
import { errorHandler } from './middlewares/errorHandler';
import swaggerDocument from './swagger/programming-api.json';

const PORT = process.env.PORT || 5000;

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
        // connect to db
        await connectDb();

        //middleware
        app.use(bodyParser.json());

        // TODO: update JSON file
        //api-documentation
        app.use(
            '/api/programming/programming-docs',
            swaggerUi.serve,
            swaggerUi.setup(swaggerDocument)
        );

        app.use(programmingLngRouter);

        // error-handler
        app.use(errorHandler);

        //listen on port
        app.listen(PORT, () => {
            console.log(`programming language service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer();
