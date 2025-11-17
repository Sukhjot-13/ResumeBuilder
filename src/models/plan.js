
import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // Other plan-specific fields (e.g., price, features) go here
});

export default (mongoose.models && mongoose.models.Plan) || mongoose.model('Plan', PlanSchema);
