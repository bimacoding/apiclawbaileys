# WhatsApp API (Baileys + Session OpenClaw)

API ini mendukung:
- Kirim text
- Kirim gambar
- Kirim gambar + text (caption)

Semua memakai session existing (`creds.json`) dari OpenClaw, jadi **tanpa scan QR**.
Session hanya dipakai untuk autentikasi login, bukan membatasi tujuan kirim pesan.

## 1) Setup

1. Install dependency:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Buat folder `session`, lalu copy file OpenClaw:
   - `creds.json`
   - file key lain jika ada

## 2) Jalankan API

```bash
npm run start
```

Default bind: `0.0.0.0:3000` (bisa diakses dari network).

## 3) Endpoint

### Health
`GET /health`

### Kirim Text
`POST /send-text`

Body:
```json
{
  "to": "62812xxxxxxx",
  "text": "Halo dari API Baileys"
}
```
Response sukses sekarang menyertakan `ackStatus`:
```json
{
  "ok": true,
  "id": "3EB0XXXX",
  "ackStatus": 1
}
```

## Validasi Pengiriman (Strict)
- API mengecek nomor tujuan valid di WhatsApp (`onWhatsApp`) sebelum kirim.
- Setelah kirim, API menunggu ACK event message (`messages.update`) sampai timeout.
- Jika timeout, API return error agar tidak dianggap sukses palsu.
- Timeout bisa diatur via `MESSAGE_ACK_TIMEOUT_MS` (default 20000 ms).

### Kirim Gambar
`POST /send-image`

Body (URL image):
```json
{
  "to": "62812xxxxxxx",
  "imageUrl": "https://example.com/image.jpg"
}
```

Body (URL image + caption):
```json
{
  "to": "62812xxxxxxx",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Ini caption"
}
```

Body (file local + caption):
```json
{
  "to": "62812xxxxxxx",
  "imagePath": "./uploads/foto.jpg",
  "caption": "Foto lokal"
}
```

### Kirim Gambar + Text
`POST /send-image-text`

Sama seperti `/send-image` (gunakan `caption` untuk text).
