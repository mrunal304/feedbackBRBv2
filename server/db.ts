import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to add your MongoDB connection string?",
  );
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define Feedback Schema
const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  phoneNumber: { type: String }, // Keep for backwards compatibility with existing index
  dateKey: { type: String }, // Keep for backwards compatibility with existing index
  visitType: { type: String, enum: ['dine_in', 'take_out'], default: 'dine_in' },
  ratings: {
    foodTaste: { type: Number, min: 1, max: 5 },
    foodTemperature: { type: Number, min: 1, max: 5 },
    portionSize: { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
    presentation: { type: Number, min: 1, max: 5 },
    overallService: { type: Number, min: 1, max: 5 },
  },
  comments: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'contacted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save middleware to populate fields for backwards compatibility
feedbackSchema.pre('save', function() {
  this.phoneNumber = this.phone;
  // Use timestamp to make each submission unique, allowing unlimited submissions
  this.dateKey = new Date().toISOString().split('T')[0] + '-' + Date.now();
});

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export { mongoose };
