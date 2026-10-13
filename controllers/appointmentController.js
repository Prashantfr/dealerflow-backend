const mongoose = require("mongoose");
const Appointment = require("../models/appointmentModel");

const createAppointment = async (req, res) => {
    const { name, date, dealer } = req.body;

    if (
        typeof name !== "string" ||
        typeof date !== "string" ||
        typeof dealer !== "string" ||
        !name.trim() ||
        !date.trim() ||
        !dealer.trim()
    ) {
        return res.status(400).json({
            message: "Name, date and dealer must be non-empty strings"
        });
    }

    const parsedDate = new Date(date);

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
    ) {
        return res.status(400).json({
            message: "Date must be a valid YYYY-MM-DD date"
        });
    }

    const newAppointment = new Appointment({
        name: name.trim(),
        date,
        dealer: dealer.trim()
    });

    await newAppointment.save();

    return res.status(201).json({
        message: "Appointment created successfully",
        data: newAppointment
    });
};

const getAppointments = async (req, res) => {
    const appointments = await Appointment.find().sort({ _id: -1 });

    res.status(200).json({
        data: appointments
    });
};

const getAppointmentById = async (req, res) => {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    res.status(200).json({
        data: appointment
    });
};

const deleteAppointment = async (req, res) => {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    if (appointment.status !== "pending") {
        return res.status(403).json({
            message: "Completed appointments cannot be deleted"
        });
    }

    await Appointment.findByIdAndDelete(id);

    return res.status(200).json({
        message: "Appointment deleted successfully"
    });
};

const updateAppointment = async (req, res) => {
    const id = req.params.id;
    const { name, date, dealer } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    if (
        typeof name !== "string" ||
        typeof date !== "string" ||
        typeof dealer !== "string" ||
        !name.trim() ||
        !date.trim() ||
        !dealer.trim()
    ) {
        return res.status(400).json({
            message: "Name, date and dealer must be non-empty strings"
        });
    }

    const parsedDate = new Date(date);

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
    ) {
        return res.status(400).json({
            message: "Date must be a valid YYYY-MM-DD date"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    if (!["pending", "returned"].includes(appointment.status)) {
        return res.status(403).json({
            message: "Completed appointments cannot be edited"
        });
    }

    if (appointment.currentDepartment !== "sales") {
        return res.status(403).json({
            message: "Appointment cannot be edited after leaving sales"
        });
    }

    appointment.name = name.trim();
    appointment.date = date;
    appointment.dealer = dealer.trim();

    await appointment.save();

    return res.status(200).json({
        message: "Appointment updated successfully",
        data: appointment
    });
};

const updateStatus = async (req, res) => {
    const id = req.params.id;
    const { action, remarks } = req.body;
    const userRole = req.user.role;

    if (!["approve", "reject", "return"].includes(action)) {
        return res.status(400).json({
            message: "Invalid action"
        });
    }

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    const cleanRemarks = typeof remarks === "string" ? remarks.trim() : "";

    if (cleanRemarks.length > 500) {
        return res.status(400).json({
            message: "Remarks must be 500 characters or less"
        });
    }

    if ((action === "reject" || action === "return") && !cleanRemarks) {
        return res.status(400).json({
            message: "Remarks are required to reject or return an application"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Not found"
        });
    }

    const previousDept = appointment.currentDepartment;

    if (appointment.status === "approved") {
        return res.status(400).json({
            message: "Already approved"
        });
    }

    if (appointment.status === "rejected") {
        return res.status(400).json({
            message: "Already rejected"
        });
    }

    if (appointment.currentDepartment !== userRole) {
        return res.status(403).json({
            message: "You are not allowed to act at this stage"
        });
    }

    const flow = ["sales", "finance", "legal", "head"];

    if (!flow.includes(appointment.currentDepartment)) {
        return res.status(400).json({
            message: "Invalid department flow"
        });
    }

    if (action === "return" && previousDept === "sales") {
        return res.status(400).json({
            message: "Sales is the first stage and cannot return an application"
        });
    }

    if (action === "approve") {
        const index = flow.indexOf(appointment.currentDepartment);

        if (index < flow.length - 1) {
            appointment.currentDepartment = flow[index + 1];
            appointment.status = "pending";
        } else {
            appointment.status = "approved";
        }
    }

    if (action === "reject") {
        appointment.status = "rejected";
    }

    if (action === "return") {
        appointment.status = "returned";
        appointment.currentDepartment = "sales";
    }

    appointment.history.push({
        department: previousDept,
        action: action,
        remarks: cleanRemarks,
        actedBy: req.user.name || "Unknown",
        date: new Date()
    });

    await appointment.save();

    return res.status(200).json({
        message: "Status updated",
        data: appointment
    });
};

module.exports = {
    createAppointment,
    getAppointments,
    getAppointmentById,
    deleteAppointment,
    updateAppointment,
    updateStatus
};