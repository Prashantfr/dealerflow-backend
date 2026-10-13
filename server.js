require("dotenv").config();

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
}

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const appointmentRoutes = require("./routes/appointmentRoutes");
const authRoutes = require("./routes/authRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const { apiLimiter } = require("./middleware/rateLimiters");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim());

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
    res.status(200).json({ success: true, message: "OK" });
});

app.use(apiLimiter);

app.use("/", appointmentRoutes);
app.use("/api/auth", authRoutes);

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB Connection Error:");
        console.log(err.message);
    });