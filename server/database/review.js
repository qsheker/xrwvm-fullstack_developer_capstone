const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, maxlength: 301 },
  username: { type: String, maxlength: 150 },
  dealership: { type: Number, required: true, index: true },
  review: { type: String, required: true, maxlength: 2000 },
  purchase: { type: Boolean, required: true },
  purchase_date: { type: String, default: '' },
  car_make: { type: String, default: '', maxlength: 100 },
  car_model: { type: String, default: '', maxlength: 100 },
  car_year: { type: Number, default: null },
  sentiment: { type: String, enum: ['', 'positive', 'negative', 'neutral'], default: '' },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model('reviews', schema);
