const mongoose = require("mongoose");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");

const {
    getUnverifiedDocuments
} = require("../utils/documentRequirements");

const createAppointment = async (req, res) => {

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            message: "Invalid request body"
        });
    }

    const allowedFields = ["name", "date", "dealer"];

    const receivedFields = Object.keys(req.body);

    const invalidFields = receivedFields.filter(
        (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
        return res.status(400).json({
            message: "Unexpected fields are not allowed",
            fields: invalidFields
        });
    }
   
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

    const userIds = [
        ...new Set(
            appointment.history
                .map((entry) => entry.actedBy)
                .filter((userId) => mongoose.isValidObjectId(userId))
        )
    ];

    const users = await User.find({
        _id: { $in: userIds }
    }).select("_id name").lean();

    const userMap = new Map(
        users.map((user) => [
            String(user._id),
            user.name
        ])
    );

    const appointmentData = appointment.toObject();

    appointmentData.history = appointmentData.history.map((entry) => ({
        ...entry,
        actedByName: userMap.get(String(entry.actedBy)) || null
    }));

    return res.status(200).json({
        data: appointmentData
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

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            message: "Invalid request body"
        });
    }

    const allowedFields = ["name", "date", "dealer"];

    const receivedFields = Object.keys(req.body);

    const invalidFields = receivedFields.filter(
        (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
        return res.status(400).json({
            message: "Unexpected fields are not allowed",
            fields: invalidFields
        });
    }

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

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    if (
        appointment.currentDepartment !== "sales" ||
        !["pending", "returned"].includes(appointment.status)
    ) {
        return res.status(403).json({
            message: "Application cannot be edited at this stage"
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

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    if (!req.body || typeof req.body !== "object" ||
        Array.isArray(req.body)) {
        return res.status(400).json({
            message: "Invalid request body"
        });
    }

    const invalidFields = Object.keys(req.body).filter(
        field => !["action", "remarks"].includes(field)
    );

    if (invalidFields.length) {
        return res.status(400).json({
            message: "Unexpected fields are not allowed",
            fields: invalidFields
        });
    }

    const { action, remarks = "" } = req.body;

    if (!["approve", "reject", "return", "resubmit"].includes(action)) {
        return res.status(400).json({
            message: "Invalid workflow action"
        });
    }

    if (typeof remarks !== "string" || remarks.length > 500) {
        return res.status(400).json({
            message: "Invalid remarks"
        });
    }

    const cleanRemarks = remarks.trim();

    if (["reject", "return"].includes(action) && !cleanRemarks) {
        return res.status(400).json({
            message: "Remarks are required"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    if (["approved", "rejected"].includes(appointment.status)) {
        return res.status(400).json({
            message: "This application is already completed"
        });
    }

    if (appointment.currentDepartment !== req.user.role) {
        return res.status(403).json({
            message: "You cannot act on another department's application"
        });
    }

    const flow = ["sales", "finance", "legal", "head"];
    const currentIndex = flow.indexOf(appointment.currentDepartment);

    if (currentIndex === -1) {
        return res.status(400).json({
            message: "Invalid department"
        });
    }

    if (appointment.status === "returned" && action !== "resubmit") {
        return res.status(400).json({
            message: "Returned applications must be resubmitted"
        });
    }

    if (appointment.status === "pending" && action === "resubmit") {
        return res.status(400).json({
            message: "Only returned applications can be resubmitted"
        });
    }

    if (action === "return" && currentIndex === 0) {
        return res.status(400).json({
            message: "Sales cannot return an application"
        });
    }

    if (action === "approve" || action === "resubmit") {
        const unverified = getUnverifiedDocuments(
            appointment,
            appointment.currentDepartment
        );

        if (unverified.length) {
            return res.status(409).json({
                message: "Required documents must be verified before proceeding",
                documents: unverified
            });
        }
    }

    const previousDepartment = appointment.currentDepartment;

    if (action === "approve") {
        if (currentIndex === flow.length - 1) {
            appointment.status = "approved";
        } else {
            appointment.currentDepartment = flow[currentIndex + 1];
            appointment.status = "pending";
        }
    } 
    
    if (action === "resubmit") {
    let destination = appointment.returnToDepartment;

    // Recover the destination for older returned applications.
    if (!destination) {
        const lastReturn = [...appointment.history]
            .reverse()
            .find((entry) => entry.action === "return");

        if (lastReturn) {
            const returnedBy = lastReturn.fromDepartment;

            if (
                flow.includes(returnedBy) &&
                flow.indexOf(returnedBy) > currentIndex &&
                lastReturn.toDepartment === "sales"
            ) {
                destination = returnedBy;
            }
        }
    }

    if (
        !destination ||
        !flow.includes(destination) ||
        flow.indexOf(destination) <= currentIndex
    ) {
        return res.status(409).json({
            message:
                "Return destination could not be recovered. Check the application's return history."
        });
    }

    appointment.currentDepartment = destination;
    appointment.status = "pending";
    appointment.returnToDepartment = null;
   }



    if (action === "return") {
        appointment.returnToDepartment = previousDepartment;
        appointment.currentDepartment = "sales";
        appointment.status = "returned";
    }

    if (action === "reject") {
        appointment.status = "rejected";
        appointment.returnToDepartment = null;
    }

    appointment.history.push({
        department: previousDepartment,
        action,
        actedBy: String(req.user.id),
        remarks: cleanRemarks,
        date: new Date(),
        fromDepartment: previousDepartment,
        toDepartment: appointment.currentDepartment
    });

    await appointment.save();

    return res.status(200).json({
        message: "Workflow action completed successfully",
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