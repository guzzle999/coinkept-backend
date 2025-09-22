import { ObjectId } from "mongodb";

export class Transaction {
  constructor(db) {
    this.collection = db.collection("transactions");
  }

  async create(transactionData) {
    const transaction = {
      userId: new ObjectId(transactionData.userId),
      type: transactionData.type, // 'income' or 'expense'
      amount: parseFloat(transactionData.amount),
      category: transactionData.category.trim(),
      subcategory: transactionData.subcategory?.trim() || null,
      description: transactionData.description?.trim() || "",
      date: new Date(transactionData.date),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(transaction);
    return { ...transaction, _id: result.insertedId };
  }

  async findByUserId(userId, filters = {}) {
    const query = { userId: new ObjectId(userId) };

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    return await this.collection
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(filters.limit || 1000)
      .toArray();
  }

  async findById(id, userId) {
    return await this.collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });
  }

  async update(id, userId, updateData) {
    const updateFields = {
      updatedAt: new Date(),
    };

    if (updateData.amount !== undefined)
      updateFields.amount = parseFloat(updateData.amount);
    if (updateData.category) updateFields.category = updateData.category.trim();
    if (updateData.subcategory !== undefined)
      updateFields.subcategory = updateData.subcategory?.trim() || null;
    if (updateData.description !== undefined)
      updateFields.description = updateData.description?.trim() || "";
    if (updateData.date) updateFields.date = new Date(updateData.date);
    if (updateData.type) updateFields.type = updateData.type;

    const result = await this.collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: updateFields }
    );

    return result.matchedCount > 0;
  }

  async delete(id, userId) {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });

    return result.deletedCount > 0;
  }

  async getStatistics(userId, filters = {}) {
    const pipeline = [{ $match: { userId: new ObjectId(userId) } }];

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateMatch = {};
      if (filters.startDate) dateMatch.$gte = new Date(filters.startDate);
      if (filters.endDate) dateMatch.$lte = new Date(filters.endDate);
      pipeline.push({ $match: { date: dateMatch } });
    }

    pipeline.push({
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        categories: { $addToSet: "$category" },
      },
    });

    return await this.collection.aggregate(pipeline).toArray();
  }

  async getCategoryBreakdown(userId, type, filters = {}) {
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId),
          type: type,
        },
      },
    ];

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateMatch = {};
      if (filters.startDate) dateMatch.$gte = new Date(filters.startDate);
      if (filters.endDate) dateMatch.$lte = new Date(filters.endDate);
      pipeline.push({ $match: { date: dateMatch } });
    }

    pipeline.push(
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } }
    );

    return await this.collection.aggregate(pipeline).toArray();
  }
}
