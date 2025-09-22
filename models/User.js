import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

export class User {
  constructor(db) {
    this.collection = db.collection("users");
  }

  async create(userData) {
    const { name, email, password } = userData;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId, password: undefined };
  }

  async findByEmail(email) {
    return await this.collection.findOne({
      email: email.toLowerCase().trim(),
    });
  }

  async findById(id) {
    return await this.collection.findOne({
      _id: new ObjectId(id),
    });
  }

  async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateLastLogin(userId) {
    await this.collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }
}
