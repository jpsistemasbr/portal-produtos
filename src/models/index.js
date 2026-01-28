import sequelize from "../config/database.js";
import Product from "./product.js";
import Service from "./service.js";
import Promotion from "./promotion.js";
import Event from "./event.js";
import Lead from "./lead.js";
import PortalConfig from "./portalConfig.js";
import Order from "./order.js";

export { sequelize, Product, Service, Promotion };
export { Event };
export { Lead };
export { PortalConfig };
export { Order };
