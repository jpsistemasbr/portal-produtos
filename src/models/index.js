import sequelize from "../config/database.js";
import Product from "./product.js";
import Promotion from "./promotion.js";
import Event from "./event.js";
import Lead from "./lead.js";
import PortalConfig from "./portalConfig.js";
import Order from "./order.js";

export { sequelize, Product, Promotion };
export { Event };
export { Lead };
export { PortalConfig };
export { Order };
