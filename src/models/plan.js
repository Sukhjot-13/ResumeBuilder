
import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  credits: {
    type: Number,
    required: true,
  },
  interval: {
    type: String, // 'day', 'month', 'year'
    default: 'month',
  },
  stripePriceId: {
    type: String,
  },
});

export default (mongoose.models && mongoose.models.Plan) || mongoose.model('Plan', PlanSchema);
