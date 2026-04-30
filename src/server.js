require("dotenv").config();
const express = require("express");
const {
  connectWhatsApp,
  sendTextMessage,
  sendImageMessage,
} = require("./whatsapp");

const app = express();
app.use(express.json({ limit: "15mb" }));

app.get("/health", async (_req, res) => {
  try {
    await connectWhatsApp();
    return res.json({ ok: true, message: "WhatsApp connected" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/send-text", async (req, res) => {
  try {
    const result = await sendTextMessage(req.body);
    return res.json({ ok: true, id: result?.key?.id });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/send-image", async (req, res) => {
  try {
    const result = await sendImageMessage(req.body);
    return res.json({ ok: true, id: result?.key?.id });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/send-image-text", async (req, res) => {
  try {
    const result = await sendImageMessage(req.body);
    return res.json({ ok: true, id: result?.key?.id });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, async () => {
  try {
    await connectWhatsApp();
    console.log(`API jalan di http://${host}:${port}`);
  } catch (error) {
    console.error("Gagal konek WhatsApp:", error.message);
    console.log(`API tetap jalan di http://${host}:${port}`);
  }
});
