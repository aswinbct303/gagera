# Gagera

A focused web interface for pairing a WhatsApp automation session and managing bot settings. Gagera uses Express, Baileys, and optional MongoDB persistence.

## Quick start

```bash
git clone https://github.com/aswinbct303/gagera.git
cd gagera
npm install --legacy-peer-deps
cp .env.example .env
# edit .env with your own values
node index.js
```

Open `http://localhost:8000`, enter a full international WhatsApp number, and follow the pairing instructions. Settings are available at `/settings` after the session has connected.

## Features

- Browser-based WhatsApp pairing-code flow
- Local session persistence with optional MongoDB backup
- Configurable status, calls, messages, menu, language, and work mode behavior
- Authenticated web settings dashboard
- Docker-ready deployment with FFmpeg support

## Configuration

See `docs/CONFIGURATION.md` for supported environment variables. Never commit `.env`, `config.env`, session folders, or database credentials.

## Deployment

For production, persist `session/` and `config/`, provide a private MongoDB URI, set `PORT`, and put the service behind HTTPS. See `docs/DEPLOYMENT.md`.

## Security

Pairing codes and web passwords are sensitive. Do not share them or expose the settings endpoint publicly without HTTPS. Read `SECURITY.md`.

## License

MIT
