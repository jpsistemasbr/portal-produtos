import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Event = sequelize.define(
  "Event",
  {
    itemType: { type: DataTypes.STRING, allowNull: false, defaultValue: "site" },
    itemId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    eventName: { type: DataTypes.STRING, allowNull: false, defaultValue: "unknown" },
    device: { type: DataTypes.STRING, allowNull: false, defaultValue: "unknown" },
    clientId: { type: DataTypes.STRING, allowNull: true },
    pagePath: { type: DataTypes.STRING, allowNull: true },
    sessionId: { type: DataTypes.STRING, allowNull: true },
    referrer: { type: DataTypes.STRING, allowNull: true },
    utmSource: { type: DataTypes.STRING, allowNull: true },
    utmMedium: { type: DataTypes.STRING, allowNull: true },
    utmCampaign: { type: DataTypes.STRING, allowNull: true },
    utmContent: { type: DataTypes.STRING, allowNull: true },
    utmTerm: { type: DataTypes.STRING, allowNull: true },
    durationMs: { type: DataTypes.INTEGER, allowNull: true },
    isBot: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    payload: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "events",
    timestamps: true
  }
);

export default Event;
