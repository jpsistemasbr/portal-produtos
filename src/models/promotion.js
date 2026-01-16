import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Promotion = sequelize.define(
  "Promotion",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    promoPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    bannerUrl: { type: DataTypes.STRING, allowNull: true },
    linkDemo: { type: DataTypes.STRING, allowNull: true },
    linkVideo: { type: DataTypes.STRING, allowNull: true },
    linkTarget: { type: DataTypes.STRING, allowNull: false, defaultValue: "item" },
    itemType: { type: DataTypes.STRING, allowNull: true },
    itemId: { type: DataTypes.INTEGER, allowNull: true },
    productId: { type: DataTypes.INTEGER, allowNull: true },
    serviceId: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: "promotions",
    timestamps: true
  }
);

export default Promotion;
