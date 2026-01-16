import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Order = sequelize.define(
  "Order",
  {
    itemType: { type: DataTypes.STRING, allowNull: false },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    itemName: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    items: { type: DataTypes.TEXT, allowNull: true },
    method: { type: DataTypes.STRING, allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    statusDetail: { type: DataTypes.STRING, allowNull: true },
    paymentId: { type: DataTypes.STRING, allowNull: true },
    raw: { type: DataTypes.TEXT, allowNull: true },
    customerEmail: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    shippingAddress: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "orders",
    timestamps: true
  }
);

export default Order;
