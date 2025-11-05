// backend/models/City.js
const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    externalId: { type: String, default: null },
    id: { type: String, default: null },
    name: { type: String, required: true },
    country: String,
    flagImg: String,
    time: String,
    timezone: String,
    isDST: Boolean,
    date: String,
    weather: String,
    temperature: Number,
    isDay: Boolean,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { timestamps: true }
);

// ✅ Prevent duplicates — same name + country (removed countryCode from index)
citySchema.index({ name: 1, country: 1 }, { unique: true });

const City = mongoose.model("City", citySchema);

// Drop old indexes if they exist
City.collection.dropIndex({ lat: 1, lng: 1 }).catch(() => {});
City.collection.dropIndex({ name: 1, countryCode: 1 }).catch(() => {});

module.exports = City;
