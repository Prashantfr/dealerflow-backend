const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        !password.trim()
    ) {
        return res.status(400).json({
            message: "Name, email and password are required"
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
            message: "Invalid email format"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    // Users cannot choose privileged roles
    if (role !== undefined && role !== "sales") {
        return res.status(403).json({
            message: "You cannot assign this role"
        });
    }

    const existingUser = await User.findOne({
        email: cleanEmail
    });

    if (existingUser) {
        return res.status(400).json({
            message: "User already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "sales"
    });

    return res.status(201).json({
        message: "User registered successfully",
        user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        }
    });
};


const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        email: cleanEmail
    });

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
            name: user.name,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    return res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
};

module.exports = {
    registerUser,
    loginUser
};