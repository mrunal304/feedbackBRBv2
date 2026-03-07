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
  // Personal Info
  name: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, default: "Bomb Rolls and Bowls" },
  visitType: { type: String, enum: ["dine_in", "take_out"], default: "dine_in" },

  // Star Ratings (1-5)
  ratings: {
    qualityOfService: { type: Number, min: 1, max: 5 },
    speedOfService: { type: Number, min: 1, max: 5 },
    friendliness: { type: Number, min: 1, max: 5 },
    foodTemperature: { type: Number, min: 1, max: 5 },
    menuExplanation: { type: Number, min: 1, max: 5 },
    likelyToReturn: { type: Number, min: 1, max: 5 },
  },

  // Final Thoughts
  favouriteDish: { type: String },
  visitAgain: { type: Boolean },
  comments: { type: String },

  // Auto fields
  status: { type: String, enum: ["pending", "contacted"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// Create index for phone number + date validation
feedbackSchema.index({ phone: 1, createdAt: 1 });

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export { mongoose };
