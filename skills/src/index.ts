// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { app } from './app';
import { natsWrapper } from './nats-wrapper';
import { connectDb } from './services/mongodb';

import {
    CourseCreatedListner,
    CourseUpdatedListner,
    CourseDeletedListner,
    BookCreatedListner,
    BookDeletedListner,
    BookUpdatedListner
} from './events/listeners';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        // check if environment variable exists
        if (
            !process.env.MONGO_DB_CONNECTION_STRING ||
            !process.env.NATS_URL ||
            !process.env.NATS_CLUSTER_ID ||
            !process.env.NATS_CLIENT_ID
        )
            throw new Error('environment variable not defined');
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

        // listen for events
        new CourseCreatedListner(natsWrapper.client).listen();
        new CourseUpdatedListner(natsWrapper.client).listen();
        new CourseDeletedListner(natsWrapper.client).listen();
        new BookCreatedListner(natsWrapper.client).listen();
        new BookUpdatedListner(natsWrapper.client).listen();
        new BookDeletedListner(natsWrapper.client).listen();
        // connect to db
        await connectDb();

        //listen on port
        app.listen(PORT, () => {
            console.log(`skill service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer();
