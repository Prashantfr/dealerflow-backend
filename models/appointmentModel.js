
const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    department: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ["approve", "reject", "return"]
    },
    actedBy: {
        type: String,
        required: true
    },
    remarks: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const appointmentSchema = new mongoose.Schema({
    name: String,
    date: String,
    dealer: String,

    status: {
        type: String,
        enum: ["pending", "returned", "approved", "rejected"],
        default: "pending"
    },

    currentDepartment: {
        type: String,
        enum: ["sales", "finance", "legal", "head"],
        default: "sales"
    },

    history: [historySchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
    "Appointment",
    appointmentSchema
);
