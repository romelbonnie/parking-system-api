var express = require("express");
var router = express.Router();
var moment = require("moment");
var mongoose = require("mongoose");

const data = require("../config/data");
const config = require("../config/config");

const ParkingSlot = require("../model/ParkingSlot");
const Vehicle = require("../model/Vehicle");

router.get("/slots", async (req, res, next) => {
  const slots = await ParkingSlot.find({})
    .populate("vehicle")
    .sort({ name: "asc" });
  return res.status(200).json(slots);
});

router.get("/vehicles", async (req, res) => {
  const vehicles = await Vehicle.find({});
  return res.status(200).json(vehicles);
});

router.post("/vehicle/park", async (req, res) => {
  try {
    const { plateNumber, vehicleType, entryPoint } = req.body;
    console.log("body", req.body);
    let slotType = "SP";
    if (vehicleType === "M") {
      slotType = "MP";
    } else if (vehicleType === "L") {
      slotType = "LP";
    }

    let sorting = { ep1Distance: "asc" };
    if (entryPoint === "EP2") {
      sorting = { ep2Distance: "asc" };
    } else if (entryPoint === "EP3") {
      sorting = { ep3Distance: "asc" };
    }

    const slots = await ParkingSlot.find({ status: 0, slotType }).sort(sorting);
    const nearestSlot = slots[0];
    const newVehicle = new Vehicle({
      plateNumber,
      vehicleType,
      entryPoint,
      parkingSlot: mongoose.Types.ObjectId(nearestSlot._id),
      parkedTime: new Date(),
    });
    await newVehicle.save();
    await ParkingSlot.updateOne(
      { _id: nearestSlot._id },
      { status: 1, vehicle: mongoose.Types.ObjectId(newVehicle._id) }
    );
    newVehicle.set("parkingSlot", nearestSlot, { strict: false });

    return res.status(200).json(newVehicle);
  } catch (error) {
    return res.status(500).json({ message: error.toString() });
  }
});

router.post("/vehicle/unpark", async (req, res) => {
  const { plateNumber, hours } = req.body;
  try {
    const vehicle = await Vehicle.findOne({ plateNumber }).populate(
      "parkingSlot"
    );
    if (!vehicle) {
      return res
        .status(400)
        .json({ success: false, message: "Vehicle not found!" });
    }

    const now = moment();
    const parkedTime = moment(vehicle.parkedTime);
    const duration = hours
      ? Math.round(hours)
      : Math.round(now.diff(parkedTime, "hours", true));
    let fee = {
      flatRate: config.flatRate,
      excessPerHour: { value: 0, total: 0 },
      full24HourChunk: { value: 0, total: 0 },
    };
    const slotType = vehicle.parkingSlot.slotType;

    if (duration > 3 && duration <= 24) {
      let excess = computeExcessPerHour(duration - 3, slotType);
      fee.excessPerHour.value = duration - 3;
      fee.excessPerHour.total = excess;
    } else if (duration > 24) {
      const firstDayExcess = computeExcessPerHour(21, slotType);
      let excess = 0;
      let overHours = duration - 24;
      if (overHours < 24) {
        excess = computeExcessPerHour(overHours, slotType);
        fee.excessPerHour.value = overHours + 21;
        fee.excessPerHour.total = firstDayExcess + excess;
      } else {
        let remainder = overHours % 24;
        let charge = Math.floor(overHours / 24);
        //compute
        const remainderFee = computeExcessPerHour(remainder, slotType);
        const chargeFee = charge * config.dayChunkRate;
        fee.excessPerHour.total = firstDayExcess + remainderFee;
        fee.excessPerHour.value = remainder + firstDayExcess;
        fee.full24HourChunk.total = chargeFee;
        fee.full24HourChunk.value = charge;
      }
    }

    const total =
      fee.flatRate + fee.excessPerHour.total + fee.full24HourChunk.total;
    vehicle.set("status", 1);
    vehicle.set("unparkedTime", new Date());
    await vehicle.save();

    // update parking slot status
    await ParkingSlot.updateOne(
      { _id: vehicle.parkingSlot._id },
      { status: 0, vehicle: null }
    );

    return res
      .status(200)
      .json({ success: true, vehicle, fee: { ...fee, total } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.toString() });
  }
});

function computeExcessPerHour(duration, slotType) {
  let excess = 0;
  if (slotType === "SP") {
    excess = duration * config.SPRate;
  } else if (slotType === "MP") {
    excess = duration * config.MPRate;
  } else if (slotType === "LP") {
    excess = duration * config.LPRate;
  }

  return excess;
}

// router.get("/populateSlots", (req, res) => {
//   const slots = data.slots;
//   slots.forEach((o) => {
//     const newSlot = new ParkingSlot({ ...o });
//     newSlot.save();
//   });
//   res.send("Slots populated");
// });

module.exports = router;
