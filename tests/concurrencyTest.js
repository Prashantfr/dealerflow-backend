require("dotenv").config();

const mongoose = require("mongoose");
const Appointment = require("../models/appointmentModel");

const testConcurrency = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        const appointment = await Appointment.create({
            name: "Concurrency Test",
            date: "2026-10-20",
            dealer: "Test Motors"
        });

        console.log("Test appointment created");

        const userA = await Appointment.findById(appointment._id);
        const userB = await Appointment.findById(appointment._id);

        console.log("Both users loaded version:", userA.__v);

        userA.name = "Updated by User A";
        await userA.save();

        console.log("User A saved successfully");

        userB.name = "Updated by User B";

        try {
            await userB.save();
            console.log("TEST FAILED: User B saved outdated data");
        } catch (error) {
            if (error.name === "VersionError") {
                console.log("TEST PASSED: Version conflict detected");
            } else {
                throw error;
            }
        }

        await Appointment.findByIdAndDelete(appointment._id);

        console.log("Temporary appointment deleted");

    } catch (error) {
        console.error("Test error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

testConcurrency();