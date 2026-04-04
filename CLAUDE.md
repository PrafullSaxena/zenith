## PM2 Services

| Port | Name | Type |
|------|------|------|
| 5173 | zenith-5173 | Electron-Vite |

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # First time
pm2 start all                    # After first time
pm2 stop all / pm2 restart all
pm2 start zenith-5173 / pm2 stop zenith-5173
pm2 logs / pm2 status / pm2 monit
pm2 save                         # Save process list
pm2 resurrect                    # Restore saved list
```
