import express from "express";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Category } from "../models/Category.js";
import { authenticateToken, generateAccessToken } from "../middleware/auth.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const userModel = new User(req.db);

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Create user
    const user = await userModel.create({ name, email, password });

    // Initialize default categories
    const categoryModel = new Category(req.db);
    await categoryModel.initializeDefaults(user._id);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshTokenModel = new RefreshToken(req.db);
    const refreshToken = await refreshTokenModel.create(user._id, false);

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const userModel = new User(req.db);
    const user = await userModel.findByEmail(email);

    if (!user || !(await userModel.validatePassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Update last login
    await userModel.updateLastLogin(user._id);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshTokenModel = new RefreshToken(req.db);
    const refreshToken = await refreshTokenModel.create(user._id, rememberMe);

    // Set refresh token as httpOnly cookie
    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
    });

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const refreshTokenModel = new RefreshToken(req.db);
    const tokenData = await refreshTokenModel.verify(refreshToken);

    if (!tokenData) {
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const accessToken = generateAccessToken(tokenData.userId);
    const newRefreshToken = await refreshTokenModel.rotate(
      refreshToken,
      tokenData.userId,
      tokenData.rememberMe
    );

    // Set new refresh token cookie
    const maxAge = tokenData.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
    });

    // Get user info
    const userModel = new User(req.db);
    const user = await userModel.findById(tokenData.userId);

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Token refresh failed" });
  }
});

// Logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const refreshTokenModel = new RefreshToken(req.db);
      await refreshTokenModel.delete(refreshToken);
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

// Logout all devices
router.post("/logout-all", authenticateToken, async (req, res) => {
  try {
    const refreshTokenModel = new RefreshToken(req.db);
    await refreshTokenModel.deleteByUserId(req.user.id);

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ message: "Logout all failed" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Forgot password (placeholder - in production, implement email sending)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userModel = new User(req.db);
    const user = await userModel.findByEmail(email);

    // Always return success for security (don't reveal if email exists)
    res.json({
      message:
        "If an account with that email exists, password reset instructions have been sent.",
    });

    // TODO: Implement email sending with reset token
    // In production: generate reset token, save to DB, send email
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Request failed" });
  }
});

export default router;
