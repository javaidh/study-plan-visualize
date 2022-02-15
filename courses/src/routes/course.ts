import express, { NextFunction, Response, Request } from 'express';

const router = express.Router();

router.get('/api/skills', (req: Request, res: Response) => {
    res.status(200).send('helloworld');
});

export { router as courseRouter };
