import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export class RefreshToken {
  constructor(db) {
    this.collection = db.collection("refreshTokens");
  }

  async create(userId, rememberMe = false) {
    const expiresIn = rememberMe ? "30d" : "7d";
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    const payload = {
      userId: userId.toString(),
      type: "refresh",
      rememberMe,
    };

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn,
    });

    const refreshToken = {
      userId: new ObjectId(userId),
      token: token,
      expiresAt: expiresAt,
      rememberMe: rememberMe,
      createdAt: new Date(),
    };

    await this.collection.insertOne(refreshToken);
    return token;
  }

  async findByToken(token) {
    return await this.collection.findOne({ token });
  }

  async verify(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const refreshToken = await this.findByToken(token);

      if (!refreshToken || refreshToken.expiresAt < new Date()) {
        return null;
      }

      return {
        userId: decoded.userId,
        rememberMe: decoded.rememberMe,
      };
    } catch (error) {
      return null;
    }
  }

  async delete(token) {
    const result = await this.collection.deleteOne({ token });
    return result.deletedCount > 0;
  }

  async deleteByUserId(userId) {
    const result = await this.collection.deleteMany({
      userId: new ObjectId(userId),
    });
    return result.deletedCount;
  }

  async rotate(oldToken, userId, rememberMe = false) {
    // Delete old token
    await this.delete(oldToken);

    // Create new token
    return await this.create(userId, rememberMe);
  }

  async cleanup() {
    // Remove expired tokens
    const result = await this.collection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}
