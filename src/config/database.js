import { Sequelize } from "sequelize";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "./data/app.db";
const storage = path.resolve(dbPath);

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage,
  logging: false
});

export default sequelize;
