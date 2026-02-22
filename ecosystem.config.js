module.exports = {
  apps: [{
    name: 'bot-agent-platform',
    script: './dist/app.js',
    cwd: './backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 8915
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8915
    },
    log_file: '../logs/combined.log',
    out_file: '../logs/out.log',
    error_file: '../logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    exec_mode: 'fork'
  }]
};
