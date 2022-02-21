import request from 'supertest';

import { app } from '../../app';

it('returns a 201 on succesful skill creation', async () => {
    return request(app)
        .post('/api/skills/add')
        .send({
            name: 'test'
        })
        .expect(201);
});
