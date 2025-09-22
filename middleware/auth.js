import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists
    const userModel = new User(req.db);
    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: decoded.userId,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Access token expired", code: "TOKEN_EXPIRED" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userModel = new User(req.db);
      const user = await userModel.findById(decoded.userId);

      if (user) {
        req.user = {
          id: decoded.userId,
          email: user.email,
          name: user.name,
        };
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }

  next();
};

export const generateAccessToken = (userId) => {
  const payload = {
    userId: userId.toString(),
    type: "access",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};
