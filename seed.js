require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/userModel");
const Appointment = require("./models/appointmentModel");

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@1234";

const demoUsers = [
    { name: "Aarav Sharma", email: "sales@dealerflow.demo", role: "sales" },
    { name: "Priya Nair", email: "finance@dealerflow.demo", role: "finance" },
    { name: "Neha Kapoor", email: "legal@dealerflow.demo", role: "legal" },
    { name: "Vikram Rao", email: "head@dealerflow.demo", role: "head" }
];

const actor = {
    sales: "Aarav Sharma",
    finance: "Priya Nair",
    legal: "Neha Kapoor",
    head: "Vikram Rao"
};

const h = (department, action, date, remarks = "") => ({
    department,
    action,
    remarks,
    actedBy: actor[department],
    date: new Date(date)
});

const sampleAppointments = [
    { name: "Rohan Mehta", dealer: "Greenfield Agro Motors", date: "2026-10-09", status: "pending", currentDepartment: "finance",
      history: [h("sales", "approve", "2026-10-09", "Documents look complete.")] },
    { name: "Anita Verma", dealer: "Sharma Tractors", date: "2026-10-07", status: "pending", currentDepartment: "legal",
      history: [h("sales", "approve", "2026-10-07"), h("finance", "approve", "2026-10-08", "Financials verified.")] },
    { name: "Kabir Singh", dealer: "Himalaya Farm Equipment", date: "2026-09-21", status: "approved", currentDepartment: "head",
      history: [h("sales", "approve", "2026-09-21"), h("finance", "approve", "2026-09-22"), h("legal", "approve", "2026-09-24"), h("head", "approve", "2026-09-26", "Approved for onboarding.")] },
    { name: "Meera Iyer", dealer: "Southern Harvest Co", date: "2026-09-02", status: "rejected", currentDepartment: "legal",
      history: [h("sales", "approve", "2026-09-02"), h("finance", "approve", "2026-09-03"), h("legal", "reject", "2026-09-05", "Licence documents are invalid.")] },
    { name: "Imran Khan", dealer: "Deccan Machinery", date: "2026-08-14", status: "returned", currentDepartment: "sales",
      history: [h("sales", "approve", "2026-08-14"), h("finance", "return", "2026-08-16", "Bank statement is missing.")] },
    { name: "Sana Joshi", dealer: "Western Plains Agro", date: "2026-07-19", status: "approved", currentDepartment: "head",
      history: [h("sales", "approve", "2026-07-19"), h("finance", "approve", "2026-07-20"), h("legal", "approve", "2026-07-22"), h("head", "approve", "2026-07-25")] },
    { name: "Dev Malhotra", dealer: "Punjab Farm Hub", date: "2026-06-11", status: "approved", currentDepartment: "head",
      history: [h("sales", "approve", "2026-06-11"), h("finance", "approve", "2026-06-12"), h("legal", "approve", "2026-06-14"), h("head", "approve", "2026-06-16")] },
    { name: "Tara Bose", dealer: "Eastern Tractors", date: "2026-05-27", status: "pending", currentDepartment: "sales", history: [] }
];

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const u of demoUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
            await User.create({ ...u, password: hashed });
            console.log("Created user:", u.email);
        } else {
            console.log("Already exists:", u.email);
        }
    }

    if ((await Appointment.countDocuments()) === 0) {
        await Appointment.insertMany(sampleAppointments);
        console.log("Inserted sample appointments");
    } else {
        console.log("Appointments already exist, skipping samples");
    }

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});