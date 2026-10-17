module.exports = {
  apps: [
    {
      name: 'dj-valeria',
      script: 'src/index.js',
      cwd: __dirname,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
