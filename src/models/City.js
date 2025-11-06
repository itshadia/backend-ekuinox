// backend/models/City.js
const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    externalId: { type: String, default: null }, // removed unique:true
    id: { type: String, default: null },         // removed unique:true
    name: { type: String, required: true },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    flag: { type: String, default: null },
    flagImg: { type: String, default: null },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    time: { type: String, default: null },
    timezone: { type: String, default: null },
    isDST: { type: Boolean, default: false },
    date: { type: String, default: null },
    weather: { type: String, default: "unknown" },
    temperature: { type: Number, default: null },
    isDay: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Per-user uniqueness: prevent same externalId or (name+country) for the same user
CitySchema.index({ user: 1, externalId: 1 }, { unique: true, sparse: true });
CitySchema.index({ user: 1, name: 1, country: 1 }, { unique: true, sparse: true });

const City = mongoose.model("City", CitySchema);

// Drop old global unique indexes that prevent different users from adding same cities
City.collection.dropIndex({ name: 1, country: 1 }).catch(() => {});
City.collection.dropIndex({ externalId: 1 }).catch(() => {});
City.collection.dropIndex({ id: 1 }).catch(() => {});
City.collection.dropIndex("name_1_country_1").catch(() => {});
City.collection.dropIndex("externalId_1").catch(() => {});
City.collection.dropIndex("id_1").catch(() => {});

module.exports = City;
