import mongoose from 'mongoose';

const { Schema } = mongoose;

const ScheduledContentSchema = new Schema(
  {
    channelMessageId: {
      type: Number,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Bitta kanaldagi xabar faqat bir marta indekslanadi
ScheduledContentSchema.index({ channelId: 1, channelMessageId: 1 }, { unique: true });

export default mongoose.model('ScheduledContent', ScheduledContentSchema);
