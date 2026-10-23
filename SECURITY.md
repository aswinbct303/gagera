# Security

Gagera handles WhatsApp session credentials and pairing codes. Treat both as account secrets.

- Rotate any credential that has appeared in Git history.
- Keep `.env`, `config.env`, `session/`, and `config/` private.
- Use HTTPS for pairing and settings pages.
- Do not publish pairing codes or web passwords.
- Restrict MongoDB network access and use a least-privilege database user.
- Review externally loaded plugins before enabling them.
- Report suspected credential exposure privately to the repository owner.

Removing a secret from the current tree does not remove it from Git history; rotate it at the provider first.
