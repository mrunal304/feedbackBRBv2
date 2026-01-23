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
  normalizedName: { type: String, required: true }, // lowercase version for case-insensitive matching
  phoneNumber: { type: String, required: true },
  location: { type: String, required: true },
  diningOption: { type: String, enum: ["dine-in", "take-out"], required: true },
  visitDate: { type: String, required: true },
  visitTime: { type: String, required: true },
  ratings: {
    qualityOfService: { type: Number, required: true, min: 1, max: 5 },
    speedOfService: { type: Number, required: true, min: 1, max: 5 },
    friendliness: { type: Number, required: true, min: 1, max: 5 },
    foodTemperature: { type: Number, required: true, min: 1, max: 5 },
    menuExplanation: { type: Number, required: true, min: 1, max: 5 },
    likelyToReturn: { type: Number, required: true, min: 1, max: 5 },
  },
  note: { type: String, maxlength: 500 },
  dateKey: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
  contactedAt: { type: Date, default: null },
  contactedBy: { type: String, default: null },
});

// Create index for phone number + date validation
feedbackSchema.index({ phoneNumber: 1, dateKey: 1 }, { unique: true });
// Create index for normalized name for efficient customer history lookups
feedbackSchema.index({ normalizedName: 1 });

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export { mongoose };
