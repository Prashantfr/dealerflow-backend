const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    department: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ["approve", "reject", "return", "resubmit"]
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
    },
    fromDepartment: {
        type: String,
        enum: ["sales", "finance", "legal", "head"],
        required: true
    },
    toDepartment: {
        type: String,
        enum: ["sales", "finance", "legal", "head"],
        required: true
    }
});

const documentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: [
                "business_registration",
                "tax_registration",
                "dealership_agreement",
                "identity_proof"
            ]
        },

        originalName: {
            type: String,
            required: true
        },

        storageKey: {
            type: String,
            required: true
        },

        resourceType: {
            type: String,
            required: true,
            enum: ["image", "raw"]
        },

        mimeType: {
            type: String,
            required: true
        },

        size: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending"
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        },

        remarks: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

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

    returnToDepartment: {
        type: String,
        enum: ["sales", "finance", "legal", "head", null],
        default: null
    },

    history: [historySchema],
    documents: {
       type: [documentSchema],
       default: []
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

module.exports = mongoose.model(
    "Appointment",
    appointmentSchema
);
