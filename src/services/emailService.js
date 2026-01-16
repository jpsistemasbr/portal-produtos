import nodemailer from "nodemailer";

function buildTransport() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function sendOrderEmail({ to, portalName, order, items }) {
  if (!to) return;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const list = (items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;">${item.name}</td>
          <td style="padding:6px 0; text-align:center;">${item.quantity || 1}</td>
          <td style="padding:6px 0; text-align:right;">${formatCurrency(item.subtotal || 0)}</td>
        </tr>
      `
    )
    .join("");

  const transporter = buildTransport();
  const subject = `${portalName || "Portal"} - Pedido #${order?.id || ""} recebido`;
  const html = `
    <div style="font-family: Arial, sans-serif; background:#f7f7f9; padding:24px;">
      <div style="max-width:540px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
        <div style="background:#101827; color:#fff; padding:16px 20px; text-align:center;">
          <h2 style="margin:0; font-size:18px;">Pedido recebido com sucesso</h2>
        </div>
        <div style="padding:20px;">
          <p style="margin:0 0 12px; font-size:14px; color:#555;">Seu pedido <strong>#${order?.id || ""}</strong> foi registrado.</p>
          <table style="width:100%; border-collapse:collapse; font-size:13px; color:#444;">
            <thead>
              <tr style="border-bottom:1px solid #eee;">
                <th style="text-align:left; padding-bottom:6px;">Item</th>
                <th style="text-align:center; padding-bottom:6px;">Qtd</th>
                <th style="text-align:right; padding-bottom:6px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${list || ""}
              <tr style="border-top:1px solid #eee;">
                <td colspan="2" style="padding-top:10px; font-weight:bold;">Total</td>
                <td style="padding-top:10px; text-align:right; font-weight:bold;">${formatCurrency(order?.amount || 0)}</td>
              </tr>
            </tbody>
          </table>
          <p style="margin:16px 0 0; font-size:13px; color:#666;">
            Assim que o pagamento for confirmado, voce receberá as próximas etapas no seu email.
            Se tiver duvidas, responda esta mensagem para falar com nossa equipe.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error?.message || error);
  }
}
