const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server'); // I need to make sure server.js exports app and server

describe('Auth Endpoints', () => {
  let testUser = {
    username: 'testuser_' + Date.now(),
    password: 'Password123!'
  };

  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUser,
        fullName: 'Test User',
        age: 27,
        dob: '1999-01-01',
        gender: 'Other',
        interests: ['Coding', 'Testing', 'AI']
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
  });

  it('should not register user with existing username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUser,
        fullName: 'Test User',
        age: 27,
        dob: '1999-01-01',
        gender: 'Other',
        interests: ['Coding']
      });
    
    expect(res.statusCode).toEqual(400);
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });
});
