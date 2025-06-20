# Backups Directory

This directory contains automated backups of bot data:

- `users_*.json` - User data backups
- `logs_*.json` - Purchase log backups
- `cryptos_*.json` - Cryptocurrency configuration backups

Backups are created automatically every 6 hours and on graceful shutdowns.

Filename format: `{type}_{ISO-timestamp}.json`