const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  city: { type: String, required: true },
  state: { type: String, required: true, index: true },
  st: String,
  address: { type: String, required: true },
  zip: { type: String, required: true },
  lat: Number,
  long: Number,
  short_name: String,
  full_name: { type: String, required: true }
});
module.exports = mongoose.model('dealerships', schema);
