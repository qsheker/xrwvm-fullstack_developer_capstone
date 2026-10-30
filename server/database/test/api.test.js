const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.MONGO_URL = process.env.TEST_MONGO_URL || 'mongodb://127.0.0.1:27029/best_cars_test';
process.env.REVIEW_API_KEY = 'test-only-service-key';
if (!process.env.MONGO_URL.endsWith('/best_cars_test')) {
  throw new Error('Tests require the disposable best_cars_test database.');
}
const { app, initialize } = require('../app');
const Reviews = require('../review');
before(async () => { await initialize(); });
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('dealer endpoints, state filter and malformed/missing IDs', async () => {
  const all = await request(app).get('/fetchDealers').expect(200);
  assert.equal(all.body.length, 50);
  const kansas = await request(app).get('/fetchDealers/Kansas').expect(200);
  assert.ok(kansas.body.length > 0);
  assert.ok(kansas.body.every(row => row.state === 'Kansas'));
  const detail = await request(app).get('/fetchDealer/3').expect(200);
  assert.equal(detail.body[0].id, 3);
  await request(app).get('/fetchDealer/invalid').expect(400);
  await request(app).get('/fetchDealer/99999').expect(404);
});
test('writes require service authentication and valid JSON', async () => {
  await request(app).post('/insert_review').send({}).expect(403);
  await request(app).post('/insert_review').set('X-Review-Key', process.env.REVIEW_API_KEY)
    .send({}).expect(400);
  await request(app).post('/insert_review').set('Content-Type', 'application/json')
    .set('X-Review-Key', process.env.REVIEW_API_KEY).send('{broken').expect(400);
});
test('concurrent reviews have unique IDs and survive initialization', async () => {
  const payload = { name: 'Integration Tester', username: 'test-driver', dealership: 3,
    review: 'Helpful service and a clear explanation.', purchase: false, sentiment: 'positive' };
  const created = await Promise.all(Array.from({ length: 5 }, () =>
    request(app).post('/insert_review').set('X-Review-Key', process.env.REVIEW_API_KEY)
      .send(payload).expect(201)));
  const ids = created.map(response => response.body.id);
  assert.equal(new Set(ids).size, 5);
  await initialize();
  assert.equal(await Reviews.countDocuments({ id: { $in: ids } }), 5);
  const reviews = await request(app).get('/fetchReviews/dealer/3').expect(200);
  assert.equal(reviews.body[0].id, Math.max(...ids));
});
