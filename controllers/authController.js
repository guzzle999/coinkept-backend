import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId, rememberMe) => {
  const expiresIn = rememberMe ? "30d" : "1h"; // remember me logic
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(409).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);

    const hashed = await bcrypt.hash(password, salt);

    const newUser = await User.create({ name, email, password: hashed });

    res.status(201).json({ message: "User registered", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(user._id, rememberMe);

    res.json({
      message: "Login success",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
