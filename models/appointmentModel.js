const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        name: String,
        date: String,
        dealer: String,

        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "returned"],
            default: "pending"
        },

        currentDepartment: {
            type: String,
            default: "sales"
        },

        history: [
            {
                department: String,
                action: String,
                remarks: { type: String, default: "" },
                actedBy: { type: String, default: "" },
                date: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Appointment", appointmentSchema);