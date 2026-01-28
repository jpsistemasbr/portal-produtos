import sequelize from "../config/database.js";

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function getColumns(tableName) {
  const [columns] = await sequelize.query(`PRAGMA table_info(${tableName});`);
  return (columns || []).map((col) => col.name);
}

async function getRowCount(tableName, whereClause = "") {
  const [rows] = await sequelize.query(
    `SELECT COUNT(1) as count FROM ${tableName} ${whereClause};`
  );
  return rows?.[0]?.count || 0;
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await getColumns(tableName);
  if (columns.includes(columnName)) return;
  await sequelize.query(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`
  );
}

export async function migrateEventsTable() {
  const exists = await tableExists("events");
  if (!exists) return;

  const columnNames = await getColumns("events");

  const needsMigration =
    !columnNames.includes("itemType") ||
    !columnNames.includes("eventName") ||
    !columnNames.includes("device") ||
    !columnNames.includes("createdAt") ||
    !columnNames.includes("updatedAt");
  if (!needsMigration) return;

  const eventNameExpr = columnNames.includes("eventName")
    ? "eventName"
    : columnNames.includes("event_name")
      ? "event_name"
      : "'unknown'";

  const createdExpr = columnNames.includes("createdAt")
    ? "createdAt"
    : columnNames.includes("created_at")
      ? "created_at"
      : "CURRENT_TIMESTAMP";

  const updatedExpr = columnNames.includes("updatedAt")
    ? "updatedAt"
    : columnNames.includes("updated_at")
      ? "updated_at"
      : createdExpr;

  const payloadExpr = columnNames.includes("payload") ? "payload" : "NULL";
  const deviceExpr = columnNames.includes("device") ? "device" : "'unknown'";

  await sequelize.query("BEGIN TRANSACTION;");
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS events_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemType VARCHAR(255) NOT NULL DEFAULT 'site',
      itemId INTEGER NOT NULL DEFAULT 0,
      eventName VARCHAR(255) NOT NULL DEFAULT 'unknown',
      device VARCHAR(255) NOT NULL DEFAULT 'unknown',
      payload TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await sequelize.query(`
    INSERT INTO events_new (id, itemType, itemId, eventName, device, payload, createdAt, updatedAt)
    SELECT
      id,
      'site' AS itemType,
      0 AS itemId,
      ${eventNameExpr} AS eventName,
      ${deviceExpr} AS device,
      ${payloadExpr} AS payload,
      ${createdExpr} AS createdAt,
      ${updatedExpr} AS updatedAt
    FROM events;
  `);

  await sequelize.query("DROP TABLE events;");
  await sequelize.query("ALTER TABLE events_new RENAME TO events;");
  await sequelize.query("COMMIT;");
}

export async function normalizeLegacyDates() {
  await sequelize.query(`
    UPDATE events
    SET createdAt = CURRENT_TIMESTAMP
    WHERE createdAt IS NULL OR createdAt = '' OR createdAt = 'Invalid date';
  `);
  await sequelize.query(`
    UPDATE events
    SET updatedAt = createdAt
    WHERE updatedAt IS NULL OR updatedAt = '' OR updatedAt = 'Invalid date';
  `);
  await sequelize.query(`
    UPDATE events
    SET device = 'unknown'
    WHERE device IS NULL OR device = '';
  `);
  await sequelize.query(`
    UPDATE promotions
    SET startDate = NULL
    WHERE startDate IS NULL OR startDate = '' OR startDate = 'Invalid date';
  `);
  await sequelize.query(`
    UPDATE promotions
    SET endDate = NULL
    WHERE endDate IS NULL OR endDate = '' OR endDate = 'Invalid date';
  `);
}

export async function applySchemaUpdates() {
  if (await tableExists("products")) {
    await ensureColumn("products", "linkDemo", "VARCHAR(255)");
    await ensureColumn("products", "linkVideo", "VARCHAR(255)");
    await ensureColumn("products", "type", "VARCHAR(255) NOT NULL DEFAULT 'product'");
    await ensureColumn("products", "fulfillmentType", "VARCHAR(255) NOT NULL DEFAULT 'digital'");
    await ensureColumn("products", "externalUrl", "VARCHAR(255)");
    await ensureColumn("products", "active", "BOOLEAN NOT NULL DEFAULT 1");
    await ensureColumn("products", "detailsList", "TEXT");
  }

  if (await tableExists("services")) {
    await ensureColumn("services", "linkDemo", "VARCHAR(255)");
    await ensureColumn("services", "linkVideo", "VARCHAR(255)");
    await ensureColumn("services", "fulfillmentType", "VARCHAR(255) NOT NULL DEFAULT 'digital'");
    await ensureColumn("services", "externalUrl", "VARCHAR(255)");
    await ensureColumn("services", "active", "BOOLEAN NOT NULL DEFAULT 1");
    await ensureColumn("services", "detailsList", "TEXT");
  }

  if (await tableExists("promotions")) {
    await ensureColumn("promotions", "bannerUrl", "VARCHAR(255)");
    await ensureColumn("promotions", "linkDemo", "VARCHAR(255)");
    await ensureColumn("promotions", "linkVideo", "VARCHAR(255)");
    await ensureColumn("promotions", "linkTarget", "VARCHAR(255) NOT NULL DEFAULT 'item'");
    await ensureColumn("promotions", "itemType", "VARCHAR(255)");
    await ensureColumn("promotions", "itemId", "INTEGER");
  }

  if (await tableExists("events")) {
    await ensureColumn(
      "events",
      "device",
      "VARCHAR(255) NOT NULL DEFAULT 'unknown'"
    );
    await ensureColumn("events", "clientId", "VARCHAR(255)");
    await ensureColumn("events", "pagePath", "VARCHAR(255)");
    await ensureColumn("events", "sessionId", "VARCHAR(255)");
    await ensureColumn("events", "referrer", "VARCHAR(255)");
    await ensureColumn("events", "utmSource", "VARCHAR(255)");
    await ensureColumn("events", "utmMedium", "VARCHAR(255)");
    await ensureColumn("events", "utmCampaign", "VARCHAR(255)");
    await ensureColumn("events", "utmContent", "VARCHAR(255)");
    await ensureColumn("events", "utmTerm", "VARCHAR(255)");
    await ensureColumn("events", "durationMs", "INTEGER");
    await ensureColumn("events", "isBot", "BOOLEAN NOT NULL DEFAULT 0");
  }

  if (!(await tableExists("portal_config"))) {
    await sequelize.query(`
      CREATE TABLE portal_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brandLabel VARCHAR(255) NOT NULL DEFAULT 'Portal',
        portalName VARCHAR(255) NOT NULL DEFAULT 'Portal Produtos',
        heroTagline VARCHAR(255) NOT NULL DEFAULT 'Portal central de solucoes',
        heroTitle VARCHAR(255) NOT NULL DEFAULT 'Escolha com clareza. Decida com confianca.',
        heroSubtitle VARCHAR(255) NOT NULL DEFAULT 'Compare ofertas, veja demos e finalize o pagamento com seguranca.',
        promoBandTitle VARCHAR(255) NOT NULL DEFAULT 'Destaques da semana',
        promoBandSubtitle VARCHAR(255) NOT NULL DEFAULT 'Condicoes especiais com garantia e suporte dedicado.',
        promoBandCtaLabel VARCHAR(255) NOT NULL DEFAULT 'Ver itens',
        promoSectionTitle VARCHAR(255) NOT NULL DEFAULT 'Promocoes em destaque',
        menuBgColor VARCHAR(255) NOT NULL DEFAULT '#0b1119',
        pageBgColor VARCHAR(255) NOT NULL DEFAULT '#0b1119',
        textColor VARCHAR(255) NOT NULL DEFAULT '#f5f7fa',
        adminEmail VARCHAR(255) NOT NULL DEFAULT 'admin@catalogo.com',
        adminPasswordHash VARCHAR(255),
        showProducts BOOLEAN NOT NULL DEFAULT 1,
        showServices BOOLEAN NOT NULL DEFAULT 1,
        showPromotions BOOLEAN NOT NULL DEFAULT 1,
        showDetails BOOLEAN NOT NULL DEFAULT 1,
        showPayments BOOLEAN NOT NULL DEFAULT 1,
        showContact BOOLEAN NOT NULL DEFAULT 1,
        showSuccess BOOLEAN NOT NULL DEFAULT 1,
        mpEnabled BOOLEAN NOT NULL DEFAULT 1,
        mpAccessToken VARCHAR(255),
        mpPublicKey VARCHAR(255),
        pixKey VARCHAR(255),
        pixQrUrl VARCHAR(255),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  if (await tableExists("portal_config")) {
    await ensureColumn("portal_config", "brandLabel", "VARCHAR(255) NOT NULL DEFAULT 'Portal'");
    await ensureColumn("portal_config", "successTitle", "VARCHAR(255) NOT NULL DEFAULT 'Compra confirmada'");
    await ensureColumn(
      "portal_config",
      "successMessage",
      "TEXT NOT NULL DEFAULT 'Seu pagamento foi registrado. Em breve voce recebera o acesso e as instrucoes.'"
    );
    await ensureColumn("portal_config", "heroTagline", "VARCHAR(255) NOT NULL DEFAULT 'Portal central de solucoes'");
    await ensureColumn("portal_config", "heroTitle", "VARCHAR(255) NOT NULL DEFAULT 'Escolha com clareza. Decida com confianca.'");
    await ensureColumn("portal_config", "heroSubtitle", "VARCHAR(255) NOT NULL DEFAULT 'Compare ofertas, veja demos e finalize o pagamento com seguranca.'");
    await ensureColumn("portal_config", "promoBandTitle", "VARCHAR(255) NOT NULL DEFAULT 'Destaques da semana'");
    await ensureColumn("portal_config", "promoBandSubtitle", "VARCHAR(255) NOT NULL DEFAULT 'Condicoes especiais com garantia e suporte dedicado.'");
    await ensureColumn("portal_config", "promoBandCtaLabel", "VARCHAR(255) NOT NULL DEFAULT 'Ver itens'");
    await ensureColumn("portal_config", "promoSectionTitle", "VARCHAR(255) NOT NULL DEFAULT 'Promocoes em destaque'");
    await ensureColumn("portal_config", "menuBgColor", "VARCHAR(255) NOT NULL DEFAULT '#0b1119'");
    await ensureColumn("portal_config", "pageBgColor", "VARCHAR(255) NOT NULL DEFAULT '#0b1119'");
    await ensureColumn("portal_config", "textColor", "VARCHAR(255) NOT NULL DEFAULT '#f5f7fa'");
    await ensureColumn("portal_config", "adminEmail", "VARCHAR(255) NOT NULL DEFAULT 'admin@catalogo.com'");
    await ensureColumn("portal_config", "adminPasswordHash", "VARCHAR(255)");
      await ensureColumn("portal_config", "supportEmail", "VARCHAR(255)");
      await ensureColumn("portal_config", "supportWhatsApp", "VARCHAR(255)");
      await ensureColumn("portal_config", "pixelEnabled", "BOOLEAN NOT NULL DEFAULT 0");
      await ensureColumn("portal_config", "pixelId", "VARCHAR(255)");
      await ensureColumn("portal_config", "mpEnabled", "BOOLEAN NOT NULL DEFAULT 1");
    await ensureColumn("portal_config", "mpAccessToken", "VARCHAR(255)");
    await ensureColumn("portal_config", "mpPublicKey", "VARCHAR(255)");
    await ensureColumn("portal_config", "pixKey", "VARCHAR(255)");
    await ensureColumn("portal_config", "pixQrUrl", "VARCHAR(255)");
    await ensureColumn("portal_config", "mpCheckIntervalMinutes", "INTEGER NOT NULL DEFAULT 5");
  }

  if (!(await tableExists("orders"))) {
    await sequelize.query(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemType VARCHAR(255) NOT NULL,
        itemId INTEGER NOT NULL,
        itemName VARCHAR(255) NOT NULL,
        amount FLOAT NOT NULL DEFAULT 0,
        items TEXT,
        method VARCHAR(255) NOT NULL,
        provider VARCHAR(255),
        status VARCHAR(255) NOT NULL DEFAULT 'pending',
        statusDetail VARCHAR(255),
        paymentId VARCHAR(255),
        raw TEXT,
        customerEmail VARCHAR(255),
        customerPhone VARCHAR(255),
        shippingAddress TEXT,
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  if (await tableExists("orders")) {
    await ensureColumn("orders", "customerEmail", "VARCHAR(255)");
    await ensureColumn("orders", "customerPhone", "VARCHAR(255)");
    await ensureColumn("orders", "items", "TEXT");
    await ensureColumn("orders", "shippingAddress", "TEXT");
    await ensureColumn("orders", "provider", "VARCHAR(255)");
    await ensureColumn("orders", "statusDetail", "VARCHAR(255)");
    await ensureColumn("orders", "raw", "TEXT");
  }

  if (await tableExists("payments")) {
    await sequelize.query("DROP TABLE payments;");
  }

  if (await tableExists("products") && await tableExists("services")) {
    const serviceCount = await getRowCount("services");
    const productServiceCount = await getRowCount(
      "products",
      "WHERE type = 'service'"
    );
    if (serviceCount && !productServiceCount) {
      await sequelize.query(`
        INSERT INTO products (
          name, description, imageUrl, regularPrice,
          linkDemo, linkVideo, fulfillmentType, externalUrl,
          active, detailsList, type, createdAt, updatedAt
        )
        SELECT
          name, description, imageUrl, regularPrice,
          linkDemo, linkVideo, fulfillmentType, externalUrl,
          active, detailsList, 'service', createdAt, updatedAt
        FROM services;
      `);
    }
    if (serviceCount && productServiceCount >= serviceCount) {
      await sequelize.query("DROP TABLE services;");
    }
  }

  if (await tableExists("promotions")) {
    await sequelize.query(`
      UPDATE promotions
      SET itemType = 'product',
          itemId = productId
      WHERE itemId IS NULL AND productId IS NOT NULL;
    `);
    await sequelize.query(`
      UPDATE promotions
      SET itemType = 'service',
          itemId = serviceId
      WHERE itemId IS NULL AND serviceId IS NOT NULL;
    `);
  }
}
