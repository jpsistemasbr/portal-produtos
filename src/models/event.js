import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Event = sequelize.define(
  "Event",
  {
    itemType: { type: DataTypes.STRING, allowNull: false, defaultValue: "site" },
    itemId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    eventName: { type: DataTypes.STRING, allowNull: false, defaultValue: "unknown" },
    device: { type: DataTypes.STRING, allowNull: false, defaultValue: "unknown" },
    payload: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "events",
    timestamps: true
  }
);

export default Event;
