import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Lead = sequelize.define(
  "Lead",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    source: { type: DataTypes.STRING, allowNull: true }
  },
  {
    tableName: "leads",
    timestamps: true
  }
);

export default Lead;
