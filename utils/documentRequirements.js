const DOCUMENT_REQUIREMENTS = {
    sales: ["identity_proof"],
    finance: ["tax_registration"],
    legal: [
        "business_registration",
        "dealership_agreement"
    ],
    head: [
        "identity_proof",
        "tax_registration",
        "business_registration",
        "dealership_agreement"
    ]
};

const getUnverifiedDocuments = (appointment, department) => {
    const required = DOCUMENT_REQUIREMENTS[department] || [];

    return required.filter((type) => {
        const versions = appointment.documents.filter(
            (doc) => doc.type === type
        );

        const latest = versions[versions.length - 1];

        return !latest || latest.status !== "verified";
    });
};

module.exports = {
    DOCUMENT_REQUIREMENTS,
    getUnverifiedDocuments
};
