const mongoose = require("mongoose");
const Appointment = require("../models/appointmentModel");
const cloudinary = require("../config/cloudinary");
const validateDocument = require("../utils/validateDocument");

const {
    uploadDocumentToCloudinary
} = require("../utils/documentStorage");

const {
    getAuthenticatedDocumentUrl
} = require("../utils/documentStorage");

const {
    DOCUMENT_REQUIREMENTS
} = require("../utils/documentRequirements");

const ALLOWED_DOCUMENT_TYPES = [
    "business_registration",
    "tax_registration",
    "dealership_agreement",
    "identity_proof"
];


const uploadDocument = async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid appointment ID"
        });
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(type)) {
        return res.status(400).json({
            message: "Invalid document type"
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
            message: "Documents can only be uploaded at the Sales stage"
        });
    }

    // Limit the total number of document versions.
    if (appointment.documents.length >= 12) {
        return res.status(409).json({
            message: "Document upload limit reached"
        });
    }

    // Check whether a document of this type already exists.
    const versions = appointment.documents.filter(
        (doc) => doc.type === type
    );

    const latest = versions[versions.length - 1];

    // Only rejected documents can be replaced.
    if (latest && latest.status !== "rejected") {
        return res.status(409).json({
            message: "Only rejected documents can be replaced"
        });
    }

    // Validate actual file contents.
    const validatedFile = await validateDocument(req.file);

    let uploadedAsset = null;

    try {
        uploadedAsset = await uploadDocumentToCloudinary(
            req.file.buffer
        );

        appointment.documents.push({
            type,
            originalName: req.file.originalname,
            storageKey: uploadedAsset.public_id,
            resourceType: uploadedAsset.resource_type,
            mimeType: validatedFile.mimeType,
            size: req.file.size,
            uploadedBy: req.user.id,
            status: "pending"
        });

        await appointment.save();

        // Return only the metadata needed by the frontend.
        return res.status(201).json({
            message: "Document uploaded successfully",
            document: {
                _id: appointment.documents[
                    appointment.documents.length - 1
                ]._id,
                type,
                originalName: req.file.originalname,
                status: "pending"
            }
        });

    } catch (error) {
        // Remove the Cloudinary asset if MongoDB saving fails.
        if (uploadedAsset) {
            try {
                await cloudinary.uploader.destroy(
                    uploadedAsset.public_id,
                    {
                        resource_type: uploadedAsset.resource_type,
                        type: "authenticated",
                        invalidate: true
                    }
                );
            } catch (cleanupError) {
                console.error(
                    "Cloudinary cleanup failed:",
                    cleanupError.message
                );
            }
        }

        throw error;
    }
};


const downloadDocument = async (req, res) => {
    const { id, documentId } = req.params;

    if (
        !mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(documentId)
    ) {
        return res.status(400).json({
            message: "Invalid appointment or document ID"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    const document = appointment.documents.id(documentId);

    if (!document) {
        return res.status(404).json({
            message: "Document not found"
        });
    }

    const allowedRoles = ["sales", "finance", "legal", "head"];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            message: "You are not authorized to download documents"
        });
    }

    const url = getAuthenticatedDocumentUrl(
    document.storageKey,
    document.resourceType,
    document.mimeType === "application/pdf"
        ? "pdf"
        : document.mimeType === "image/png"
            ? "png"
            : "jpg"
    );

    return res.redirect(302, url);
};


const verifyDocument = async (req, res) => {
    const { id, documentId } = req.params;

    if (!mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(documentId)) {
        return res.status(400).json({
            message: "Invalid appointment or document ID"
        });
    }

    if (!req.body || typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).some(
            key => !["status", "remarks"].includes(key)
        )) {
        return res.status(400).json({
            message: "Invalid request body"
        });
    }

    const { status, remarks = "" } = req.body;

    if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({
            message: "Status must be verified or rejected"
        });
    }

    if (typeof remarks !== "string" || remarks.length > 500) {
        return res.status(400).json({
            message: "Invalid remarks"
        });
    }

    const cleanRemarks = remarks.trim();

    if (status === "rejected" && !cleanRemarks) {
        return res.status(400).json({
            message: "Rejection remarks are required"
        });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
        return res.status(404).json({
            message: "Appointment not found"
        });
    }

    const isSalesCorrection =
        req.user.role === "sales" &&
        appointment.status === "returned";

    if (
        appointment.currentDepartment !== req.user.role ||
        (appointment.status !== "pending" && !isSalesCorrection)
    ) {
        return res.status(403).json({
            message: "You cannot verify documents at this stage"
        });
    }

    const document = appointment.documents.id(documentId);

    if (!document) {
        return res.status(404).json({
            message: "Document not found"
        });
    }

    const requiredTypes =
        DOCUMENT_REQUIREMENTS[req.user.role] || [];

    if (
        req.user.role === "head" ||
        !requiredTypes.includes(document.type)
    ) {
        return res.status(403).json({
            message: "This document belongs to another department"
        });
    }

    const versions = appointment.documents.filter(
        item => item.type === document.type
    );

    const latest = versions[versions.length - 1];

    if (String(latest._id) !== String(document._id)) {
        return res.status(409).json({
            message: "Only the latest document version can be reviewed"
        });
    }

    if (document.status !== "pending") {
        return res.status(409).json({
            message: "Document has already been reviewed"
        });
    }

    document.status = status;
    document.remarks = cleanRemarks;
    document.verifiedBy = req.user.id;
    document.verifiedAt = new Date();

    await appointment.save();

    return res.status(200).json({
        message: `Document ${status} successfully`,
        document: {
            _id: document._id,
            type: document.type,
            status: document.status,
            remarks: document.remarks,
            verifiedBy: document.verifiedBy,
            verifiedAt: document.verifiedAt
        }
    });
};


module.exports = {
    uploadDocument,
    downloadDocument,
    verifyDocument
};