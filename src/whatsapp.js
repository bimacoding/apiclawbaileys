const fs = require("fs");
const path = require("path");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

let sock = null;
let isConnecting = false;

function normalizeJid(to) {
  if (!to || typeof to !== "string") {
    throw new Error("Parameter 'to' wajib diisi");
  }

  const trimmed = to.trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }

  const onlyDigits = trimmed.replace(/\D/g, "");
  if (!onlyDigits) {
    throw new Error("Nomor tujuan tidak valid");
  }

  return `${onlyDigits}@s.whatsapp.net`;
}

async function connectWhatsApp() {
  if (sock || isConnecting) return sock;

  const sessionDir = process.env.SESSION_DIR || "./session";
  const credsPath = path.join(sessionDir, "creds.json");

  if (!fs.existsSync(credsPath)) {
    throw new Error(
      `File session tidak ditemukan: ${credsPath}. Salin creds.json OpenClaw ke folder session.`
    );
  }

  isConnecting = true;
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error?.output?.statusCode || 0) !==
        DisconnectReason.loggedOut;

      sock = null;
      isConnecting = false;

      if (shouldReconnect) {
        void connectWhatsApp();
      }
    }

    if (connection === "open") {
      isConnecting = false;
    }
  });

  return sock;
}

async function sendTextMessage({ to, text }) {
  if (!text) throw new Error("Parameter 'text' wajib diisi");
  const client = await connectWhatsApp();
  return client.sendMessage(normalizeJid(to), { text });
}

async function sendImageMessage({ to, imageUrl, imagePath, caption }) {
  if (!imageUrl && !imagePath) {
    throw new Error("Isi salah satu: 'imageUrl' atau 'imagePath'");
  }

  const client = await connectWhatsApp();
  const imagePayload = imagePath ? { url: imagePath } : { url: imageUrl };

  return client.sendMessage(normalizeJid(to), {
    image: imagePayload,
    caption: caption || "",
  });
}

module.exports = {
  connectWhatsApp,
  sendTextMessage,
  sendImageMessage,
};
