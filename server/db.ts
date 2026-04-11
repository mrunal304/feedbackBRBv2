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
  locationDetail: { type: String, default: '' },
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

// Define Feedback Schema (one document per customer with visits array)
const feedbackSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  visits: [visitSchema],
});

// Define Customer Card Schema (deprecated, kept for backwards compatibility)
const customerCardSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  totalVisits: { type: Number, default: 1 },
  firstVisitDate: { type: Date, default: Date.now },
  lastVisitDate: { type: Date, default: Date.now },
  visits: [{ type: mongoose.Schema.Types.ObjectId }],
});

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
export const CustomerCardModel = mongoose.model('CustomerCard', customerCardSchema);

// Define Admin User Schema
const adminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

export const AdminUserModel = mongoose.model('AdminUser', adminUserSchema);

// Seed default admin user if none exists
export async function seedAdminUser() {
  const bcrypt = await import('bcryptjs');
  const existing = await AdminUserModel.findOne({ username: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('bomb123', 12);
    await AdminUserModel.create({ username: 'admin', passwordHash: hash });
    console.log('[Admin] Default admin user created');
  }
}

// Migration function to convert flat documents to nested structure
export async function migrateFeedbackStructure() {
  try {
    console.log('[Migration] Starting feedback structure migration...');
    
    // Get all documents using Mongoose
    const allDocs = await FeedbackModel.find({}).lean();
    
    if (allDocs.length === 0) {
      console.log('[Migration] No documents found, skipping migration');
      return { migrated: 0, deleted: 0 };
    }

    // Group by phoneNumber
    const groupedByPhone: Record<string, any> = {};

    for (const doc of allDocs) {
      const phone = doc.phoneNumber;
      
      if (!phone) continue;

      if (!groupedByPhone[phone]) {
        groupedByPhone[phone] = {
          phoneNumber: phone,
          name: doc.name || 'Unknown',
          visits: [],
          docIds: [],
        };
      }

      groupedByPhone[phone].docIds.push(doc._id);
      groupedByPhone[phone].name = doc.name || groupedByPhone[phone].name;

      // Check if this document already has visits array (already migrated)
      if (doc.visits && Array.isArray(doc.visits) && doc.visits.length > 0) {
        // Already in new format, add all visits
        groupedByPhone[phone].visits.push(...doc.visits);
      } else if (doc.location) {
        // Old flat format, convert to visit object
        groupedByPhone[phone].visits.push({
          _id: doc._id,
          location: doc.location,
          visitType: doc.visitType || 'dine_in',
          ratings: doc.ratings || {},
          comments: doc.comments || '',
          status: doc.status || 'pending',
          createdAt: doc.createdAt || new Date(),
          dateKey: doc.dateKey,
        });
      }
    }

    let migratedCount = 0;
    let deletedCount = 0;

    // For each phone number, create consolidated document
    for (const [phone, data] of Object.entries(groupedByPhone)) {
      if (data.visits.length > 0) {
        // Delete all old documents for this phone number
        const deleteResult = await FeedbackModel.deleteMany({ phoneNumber: phone });
        deletedCount += deleteResult.deletedCount || 0;

        // Create single consolidated document
        await FeedbackModel.create({
          phoneNumber: phone,
          name: data.name,
          visits: data.visits,
        });

        migratedCount++;
      }
    }

    console.log(`[Migration] Migration complete: ${migratedCount} customers consolidated, ${deletedCount} old documents deleted`);
    return { migrated: migratedCount, deleted: deletedCount };
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  }
}

export { mongoose };
