# Deployment

## Docker

```bash
docker build -t gagera .
docker run --env-file .env -p 8000:8000 -v gagera-session:/app/session -v gagera-config:/app/config gagera
```

Persist `/app/session` and `/app/config`, or sessions and user configuration will disappear when the container is replaced.

## Production checklist

- Use a private MongoDB database and rotate credentials.
- Put the service behind HTTPS.
- Restrict `/settings` to trusted operators.
- Back up session and configuration data securely.
- Set a non-default `SUDO` value.
- Do not expose pairing codes in logs or screenshots.
