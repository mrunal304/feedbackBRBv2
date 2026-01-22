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
  phoneNumber: { type: String, required: true },
  ratings: {
    interior: { type: Number, required: true, min: 1, max: 5 },
    food: { type: Number, required: true, min: 1, max: 5 },
    service: { type: Number, required: true, min: 1, max: 5 },
    staff: { type: Number, required: true, min: 1, max: 5 },
    hygiene: { type: Number, required: true, min: 1, max: 5 },
  },
  note: { type: String, maxlength: 500 },
  dateKey: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
  contactedAt: { type: Date, default: null },
  contactedBy: { type: String, default: null },
});

// Create index for phone number + date validation
feedbackSchema.index({ phoneNumber: 1, dateKey: 1 }, { unique: true });

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export { mongoose };
