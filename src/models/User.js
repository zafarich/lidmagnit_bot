import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    // User's grade/level
    grade: {
      level: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'C+', 'C'],
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      achievedAt: {
        type: Date,
      },
    },
    // Onboarding progress
    onboarding: {
      isCompleted: {
        type: Boolean,
        default: false,
      },
      currentStep: {
        type: String,
        enum: ['phone', 'name', 'schedule', 'test-info', 'test', 'completed'],
        default: 'phone',
      },
      // Step 1: Student name
      studentName: {
        type: String,
        trim: true,
      },
      // Step 2: Study schedule
      studySchedule: {
        period: {
          type: String,
          enum: ['morning', 'afternoon', 'evening'],
        },
        hour: {
          type: Number,
          min: 0,
          max: 23,
        },
      },
      // Step 3: Test info
      testStarted: {
        type: Boolean,
        default: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Method to check if phone is verified
UserSchema.methods.hasPhoneNumber = function() {
  return !!this.phoneNumber;
};

// Method to update onboarding step
UserSchema.methods.updateOnboardingStep = async function(step) {
  this.onboarding.currentStep = step;
  await this.save();
};

export default mongoose.model('User', UserSchema);
