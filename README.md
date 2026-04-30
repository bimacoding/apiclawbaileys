# WhatsApp API (Baileys + Session OpenClaw)

API ini mendukung:
- Kirim text
- Kirim gambar
- Kirim gambar + text (caption)

Semua memakai session existing (`creds.json`) dari OpenClaw, jadi **tanpa scan QR**.

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

Default: `http://localhost:3000`

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
