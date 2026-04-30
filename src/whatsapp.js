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
let listenersBound = false;
const messageWaiters = new Map();

const MESSAGE_ACK_TIMEOUT_MS = Number(process.env.MESSAGE_ACK_TIMEOUT_MS || 20000);

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
  bindSocketListeners(sock);
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

function bindSocketListeners(client) {
  if (listenersBound) return;

  client.ev.on("messages.update", (updates) => {
    for (const update of updates || []) {
      const keyId = update?.key?.id;
      if (!keyId) continue;

      const waiter = messageWaiters.get(keyId);
      if (!waiter) continue;

      const status = Number(update?.update?.status || 0);
      // status >= 1 menandakan pesan sudah di-ack oleh server/perangkat penerima.
      if (status >= 1) {
        waiter.resolve({ keyId, status });
        messageWaiters.delete(keyId);
      }
    }
  });

  listenersBound = true;
}

async function ensureWhatsAppNumber(client, jid) {
  const [check] = await client.onWhatsApp(jid);
  if (!check?.exists) {
    throw new Error("Nomor tujuan tidak terdaftar di WhatsApp");
  }
}

function waitForMessageAck(keyId, timeoutMs = MESSAGE_ACK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      messageWaiters.delete(keyId);
      reject(
        new Error(
          "Pesan belum mendapatkan ACK dalam batas waktu. Coba ulang beberapa detik lagi."
        )
      );
    }, timeoutMs);

    messageWaiters.set(keyId, {
      resolve: (payload) => {
        clearTimeout(timer);
        resolve(payload);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

async function sendWithAck(client, jid, content) {
  await ensureWhatsAppNumber(client, jid);
  const sent = await client.sendMessage(jid, content);
  const keyId = sent?.key?.id;

  if (!keyId) {
    throw new Error("Gagal mendapatkan ID message dari WhatsApp");
  }

  const ack = await waitForMessageAck(keyId);
  return { sent, ack };
}

async function sendTextMessage({ to, text }) {
  if (!text) throw new Error("Parameter 'text' wajib diisi");
  const client = await connectWhatsApp();
  const jid = normalizeJid(to);
  return sendWithAck(client, jid, { text });
}

async function sendImageMessage({ to, imageUrl, imagePath, caption }) {
  if (!imageUrl && !imagePath) {
    throw new Error("Isi salah satu: 'imageUrl' atau 'imagePath'");
  }

  const client = await connectWhatsApp();
  const jid = normalizeJid(to);
  const imagePayload = imagePath ? { url: imagePath } : { url: imageUrl };

  return sendWithAck(client, jid, {
    image: imagePayload,
    caption: caption || "",
  });
}

module.exports = {
  connectWhatsApp,
  sendTextMessage,
  sendImageMessage,
};
