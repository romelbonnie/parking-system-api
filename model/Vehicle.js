const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true },
    parkingSlot: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSlots" },
    parkedTime: { type: Date },
    vehicleType: { type: String, enum: ["S", "M", "L"] },
    entryPoint: { type: String },
    status: { type: Number }, // 0: if vehicle is still parked, 1: if vehicle was unparked
    unparkedTime: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicles", schema);
