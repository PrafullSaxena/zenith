module.exports = {
  apps: [
    {
      name: 'zenith-5173',
      cwd: './',
      script: 'node_modules/.bin/electron-vite',
      args: 'dev',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
}
