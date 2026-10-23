# Usage

## Pair a session

1. Start the service.
2. Open `/` or `/pair`.
3. Enter the WhatsApp number with country code and digits only.
4. Generate the pairing code.
5. In WhatsApp, open **Linked devices → Link with phone number**.
6. Enter the displayed code.

Keep the browser open until the connection is confirmed. Existing sessions reconnect automatically when valid session files are present.

## Open settings

After pairing, the bot sends a web settings password when database-backed settings are available. Open `/settings`, enter the WhatsApp number and password, then save changes by section.

## Troubleshooting

- **No code:** confirm the number is digits only and pairing requests are allowed.
- **Database unavailable:** use local session/config persistence or fix `MONGODB_URI`.
- **Settings rejected:** wait for the session to connect and verify the web password.
- **Media commands fail:** install FFmpeg or use the Docker image.
