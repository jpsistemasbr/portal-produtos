import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PortalConfig = sequelize.define(
  "PortalConfig",
  {
    brandLabel: { type: DataTypes.STRING, allowNull: false, defaultValue: "Portal" },
    portalName: { type: DataTypes.STRING, allowNull: false, defaultValue: "Portal Produtos" },
    heroTagline: { type: DataTypes.STRING, allowNull: false, defaultValue: "Portal central de solucoes" },
    heroTitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Escolha com clareza. Decida com confianca." },
    heroSubtitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Compare ofertas, veja demos e finalize o pagamento com seguranca." },
    promoBandTitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Destaques da semana" },
    promoBandSubtitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Condicoes especiais com garantia e suporte dedicado." },
    promoBandCtaLabel: { type: DataTypes.STRING, allowNull: false, defaultValue: "Ver itens" },
    promoSectionTitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Promocoes em destaque" },
    menuBgColor: { type: DataTypes.STRING, allowNull: false, defaultValue: "#0b1119" },
    pageBgColor: { type: DataTypes.STRING, allowNull: false, defaultValue: "#0b1119" },
    textColor: { type: DataTypes.STRING, allowNull: false, defaultValue: "#f5f7fa" },
    adminEmail: { type: DataTypes.STRING, allowNull: false, defaultValue: "admin@catalogo.com" },
    adminPasswordHash: { type: DataTypes.STRING, allowNull: true },
    showProducts: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showServices: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showPromotions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showDetails: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showPayments: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showContact: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showSuccess: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    successTitle: { type: DataTypes.STRING, allowNull: false, defaultValue: "Compra confirmada" },
    successMessage: { type: DataTypes.TEXT, allowNull: false, defaultValue: "Seu pagamento foi registrado. Em breve voce recebera o acesso e as instrucoes." },
    supportEmail: { type: DataTypes.STRING, allowNull: true },
    supportWhatsApp: { type: DataTypes.STRING, allowNull: true },
    pixelEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pixelId: { type: DataTypes.STRING, allowNull: true },
    mpEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    mpAccessToken: { type: DataTypes.STRING, allowNull: true },
    mpPublicKey: { type: DataTypes.STRING, allowNull: true },
    pixKey: { type: DataTypes.STRING, allowNull: true },
    pixQrUrl: { type: DataTypes.STRING, allowNull: true },
    mpCheckIntervalMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 }
  },
  {
    tableName: "portal_config",
    timestamps: true
  }
);

export default PortalConfig;
