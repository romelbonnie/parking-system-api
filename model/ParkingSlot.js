const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    zone: { type: Number },
    slotType: { type: String, enum: ["SP", "MP", "LP"] },
    status: { type: Number, default: 0 },
    ep1Distance: { type: Number },
    ep2Distance: { type: Number },
    ep3Distance: { type: Number },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicles" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingSlots", schema);
