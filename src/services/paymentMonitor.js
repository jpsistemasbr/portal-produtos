import { PortalConfig } from "../models/index.js";
import { runPaymentCron } from "../controllers/paymentController.js";

const MIN_INTERVAL = 1;

export async function startPaymentMonitor() {
  async function tick() {
    try {
      const config = await PortalConfig.findOne();
      const minutes = Math.max(
        MIN_INTERVAL,
        Number(config?.mpCheckIntervalMinutes || 5)
      );
      console.log(
        `[cron] Verificando pagamentos Mercado Pago (intervalo: ${minutes} min)`
      );
      await runPaymentCron();
      console.log("[cron] Verificacao concluida.");
      setTimeout(tick, minutes * 60 * 1000);
    } catch (error) {
      console.error("[cron] Falha ao verificar pagamentos:", error);
      setTimeout(tick, 5 * 60 * 1000);
    }
  }

  tick();
}
