import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Product = sequelize.define(
  "Product",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: false },
    regularPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    linkDemo: { type: DataTypes.STRING, allowNull: true },
    linkVideo: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: "product" },
    fulfillmentType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "digital"
    },
    externalUrl: { type: DataTypes.STRING, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    detailsList: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "products",
    timestamps: true
  }
);

export default Product;
