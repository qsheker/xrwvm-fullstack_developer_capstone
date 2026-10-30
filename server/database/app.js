const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Reviews = require('./review');
const Dealerships = require('./dealership');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
const Counter = mongoose.model('Counter', new mongoose.Schema({
  _id: String, seq: Number
}));

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    const error = new Error('ID must be a positive integer.');
    error.status = 400;
    throw error;
  }
  return id;
}
async function dealer(id) {
  const found = await Dealerships.findOne({ id }).lean();
  if (!found) {
    const error = new Error('Dealer not found.');
    error.status = 404;
    throw error;
  }
  return found;
}
function requireReviewKey(req, res, next) {
  const expected = process.env.REVIEW_API_KEY;
  const received = req.get('X-Review-Key') || '';
  if (!expected || Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Review writes require the Django service key.' });
  }
  next();
}

app.get('/', (req, res) => res.json({ service: 'Best Cars dealership API' }));
app.get('/healthz', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
});
app.get('/fetchReviews', asyncRoute(async (req, res) => {
  res.json(await Reviews.find().sort({ id: -1 }).lean());
}));
app.get('/fetchReviews/dealer/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  await dealer(id);
  res.json(await Reviews.find({ dealership: id }).sort({ id: -1 }).lean());
}));
app.get('/fetchDealers', asyncRoute(async (req, res) => {
  res.json(await Dealerships.find().sort({ id: 1 }).lean());
}));
app.get('/fetchDealers/:state', asyncRoute(async (req, res) => {
  const filter = req.params.state === 'All' ? {} : { state: req.params.state };
  res.json(await Dealerships.find(filter).sort({ id: 1 }).lean());
}));
app.get('/fetchDealer/:id', asyncRoute(async (req, res) => {
  res.json([await dealer(parseId(req.params.id))]);
}));
app.post('/insert_review', requireReviewKey, asyncRoute(async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof data.purchase !== 'boolean' || typeof data.review !== 'string' ||
      !data.review.trim() || data.review.length > 2000 ||
      typeof data.name !== 'string' || !data.name.trim() || data.name.length > 301 ||
      !Number.isSafeInteger(data.dealership)) {
    return res.status(400).json({ error: 'Invalid review data.' });
  }
  await dealer(parseId(data.dealership));
  if (data.purchase && (
    typeof data.purchase_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.purchase_date) ||
    typeof data.car_make !== 'string' || !data.car_make ||
    typeof data.car_model !== 'string' || !data.car_model ||
    !Number.isInteger(data.car_year) || data.car_year < 2015 || data.car_year > 2023
  )) {
    return res.status(400).json({ error: 'Invalid vehicle or purchase details.' });
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: 'review' }, { $inc: { seq: 1 } }, { new: true });
  const saved = await Reviews.create({
    id: counter.seq, name: data.name.trim(), username: data.username,
    dealership: data.dealership, review: data.review.trim(), purchase: data.purchase,
    purchase_date: data.purchase ? data.purchase_date : '',
    car_make: data.purchase ? data.car_make : '',
    car_model: data.purchase ? data.car_model : '',
    car_year: data.purchase ? data.car_year : null,
    sentiment: data.sentiment || '', created_at: new Date()
  });
  res.status(201).json(saved);
}));
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((error, req, res, next) => { // Express requires all four arguments.
  if (error instanceof SyntaxError || error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  const status = error.status || 503;
  if (status >= 500) console.error(error.name + ': request failed');
  res.status(status).json({ error: status < 500 ? error.message : 'Database service unavailable.' });
});

async function initialize() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27029/dealershipsDB',
    { serverSelectionTimeoutMS: 10000 });
  await Promise.all([Reviews.init(), Dealerships.init()]);
  // Upsert by stable IDs. Restarting never erases reviews or overwrites existing records.
  for (const [filename, key, Model] of [
    ['dealerships.json', 'dealerships', Dealerships],
    ['reviews.json', 'reviews', Reviews]
  ]) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', filename), 'utf8'))[key];
    await Model.bulkWrite(data.map(row => ({
      updateOne: { filter: { id: row.id }, update: { $setOnInsert: row }, upsert: true }
    })));
  }
  const latest = await Reviews.findOne().sort({ id: -1 }).lean();
  await Counter.updateOne({ _id: 'review' },
    { $max: { seq: latest ? latest.id : 0 } }, { upsert: true });
}
if (require.main === module) {
  initialize().then(() => {
    const server = app.listen(process.env.PORT || 3030, '0.0.0.0', () => {
      console.log('Best Cars API ready on port ' + (process.env.PORT || 3030));
    });
    const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }).catch(error => {
    console.error('Database initialization failed: ' + error.name);
    process.exit(1);
  });
}
module.exports = { app, initialize };
