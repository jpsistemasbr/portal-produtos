import "dotenv/config";
import app from "./app.js";
import { sequelize } from "./models/index.js";
import { seedIfEmpty } from "./services/seedService.js";
import {
  migrateEventsTable,
  normalizeLegacyDates,
  applySchemaUpdates
} from "./services/migrationService.js";
import { ensurePortalConfig } from "./services/portalConfigService.js";
import { startPaymentMonitor } from "./services/paymentMonitor.js";

const port = Number(process.env.PORT || 3000);

await sequelize.sync();
await migrateEventsTable();
await applySchemaUpdates();
await normalizeLegacyDates();
await ensurePortalConfig();
await seedIfEmpty();
startPaymentMonitor();

app.listen(port, () => {
  console.log(`Portal rodando em http://localhost:${port}`);
});
