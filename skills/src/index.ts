import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// environemnt variables defined in kubernetes deployments
import 'dotenv/config.js';

// inside module imports
import { skillRouter } from './routes/skills';

const PORT = 4000;

const startServer = async () => {
    try {
        const app = express();
        app.set('trust proxy', true);

        //middleware
        app.use(bodyParser.json());

        // api-documentation
        //  app.use(
        //     '/api/todo/task-docs',
        //     swaggerUi.serve,
        //     swaggerUi.setup(swaggerDocument)
        // );
        app.use(skillRouter);
        // error-handler
        //app.use(errorHandler);

        //listen on port
        app.listen(PORT, () => {
            console.log(`skill service running on ${PORT}`);
        });
    } catch (err) {
        console.log(err);
    }
};

startServer();
