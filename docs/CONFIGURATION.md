# Configuration

Copy `.env.example` to `.env` or `config.env`. Environment values provide global defaults; users may override supported values through the settings page.

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/gagera` |
| `PORT` | HTTP port | `8000` |
| `WORK_TYPE` | Bot visibility mode | `public` |
| `LANGUAGE` | Bot language | `english` |
| `HANDLERS` | Command handler configuration | `false` |
| `SUDO` | Owner number(s) | `<international-number>` |
| `MENU_TYPE` | Menu presentation | `video` |
| `AUTO_STATUS_VIEW` | Automatically view status | `true` |
| `STATUS_REACTION` | React to status updates | `false` |
| `STATUS_REPLY` | Reply to status updates | `false` |
| `SAVE_STATUS` | Save status media | `false` |
| `READ_MESSAGES` | Mark messages as read | `false` |
| `REJECT_CALL` | Reject calls | `false` |
| `CALL_BLOCK` | Block calls | `false` |
| `DISABLE_PM` | Disable private messages | `false` |

Boolean values must be the literal strings `true` or `false`. Never put passwords, tokens, or real account numbers in example files.
