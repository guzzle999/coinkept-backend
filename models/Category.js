import { ObjectId } from "mongodb";

export class Category {
  constructor(db) {
    this.collection = db.collection("categories");
  }

  async create(categoryData) {
    const category = {
      userId: new ObjectId(categoryData.userId),
      name: categoryData.name.trim(),
      type: categoryData.type, // 'income' or 'expense'
      color: categoryData.color || "#6366f1",
      icon: categoryData.icon || "📊",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(category);
    return { ...category, _id: result.insertedId };
  }

  async findByUserId(userId, type = null) {
    const query = {
      $or: [{ userId: new ObjectId(userId) }, { isDefault: true }],
    };

    if (type) {
      query.type = type;
    }

    return await this.collection
      .find(query)
      .sort({ isDefault: -1, name: 1 })
      .toArray();
  }

  async findById(id, userId) {
    return await this.collection.findOne({
      _id: new ObjectId(id),
      $or: [{ userId: new ObjectId(userId) }, { isDefault: true }],
    });
  }

  async update(id, userId, updateData) {
    const updateFields = {
      updatedAt: new Date(),
    };

    if (updateData.name) updateFields.name = updateData.name.trim();
    if (updateData.color) updateFields.color = updateData.color;
    if (updateData.icon) updateFields.icon = updateData.icon;

    const result = await this.collection.updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(userId),
        isDefault: false, // Can't update default categories
      },
      { $set: updateFields }
    );

    return result.matchedCount > 0;
  }

  async delete(id, userId) {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
      isDefault: false, // Can't delete default categories
    });

    return result.deletedCount > 0;
  }

  async initializeDefaults(userId) {
    const defaultCategories = [
      // Income categories
      { name: "Salary", type: "income", color: "#10b981", icon: "💼" },
      { name: "Freelance", type: "income", color: "#8b5cf6", icon: "💻" },
      { name: "Investment", type: "income", color: "#f59e0b", icon: "📈" },
      { name: "Business", type: "income", color: "#3b82f6", icon: "🏢" },
      { name: "Other Income", type: "income", color: "#6b7280", icon: "💰" },

      // Expense categories
      { name: "Food", type: "expense", color: "#ef4444", icon: "🍽️" },
      { name: "Transport", type: "expense", color: "#f97316", icon: "🚗" },
      { name: "Shopping", type: "expense", color: "#ec4899", icon: "🛍️" },
      { name: "Entertainment", type: "expense", color: "#a855f7", icon: "🎬" },
      { name: "Health", type: "expense", color: "#06b6d4", icon: "⚕️" },
      { name: "Education", type: "expense", color: "#84cc16", icon: "📚" },
      { name: "Bills", type: "expense", color: "#dc2626", icon: "📱" },
      { name: "Travel", type: "expense", color: "#0ea5e9", icon: "✈️" },
      { name: "Online", type: "expense", color: "#8b5cf6", icon: "💻" },
      { name: "Other", type: "expense", color: "#6b7280", icon: "📝" },
    ];

    const userCategories = defaultCategories.map((cat) => ({
      ...cat,
      userId: new ObjectId(userId),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await this.collection.insertMany(userCategories);
    return userCategories;
  }
}
