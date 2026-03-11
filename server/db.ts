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

// Define Visit Schema (embedded in customer documents)
const visitSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  location: { type: String, required: true },
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
  dateKey: { type: String },
});

// Define Customer Card Schema
const customerCardSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  totalVisits: { type: Number, default: 1 },
  firstVisitDate: { type: Date, default: Date.now },
  lastVisitDate: { type: Date, default: Date.now },
  visits: [visitSchema],
});

// Define Feedback Schema (flat structure for individual feedback entries)
const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, index: true },
  location: { type: String, required: true },
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
  dateKey: { type: String },
});

export const CustomerCardModel = mongoose.model('CustomerCard', customerCardSchema);
export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export { mongoose };
