'use strict';

/**
 * PM2 Ecosystem Configuration
 *
 * Start in production:  pm2 start ecosystem.config.js --env production
 * Start in dev:         pm2 start ecosystem.config.js --env development
 * Logs:                 pm2 logs team-workspace-api
 * Monitor:              pm2 monit
 */
module.exports = {
  apps: [
    {
      name:         'team-workspace-api',
      script:       'server.js',
      instances:    'max',          // One worker per CPU core
      exec_mode:    'cluster',      // Cluster mode for load balancing
      watch:        false,          // Never watch in production
      max_memory_restart: '512M',   // Restart if process exceeds 512MB

      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },

      // Logging
      log_date_format:  'YYYY-MM-DD HH:mm:ss Z',
      error_file:       './logs/pm2-error.log',
      out_file:         './logs/pm2-out.log',
      merge_logs:       true,

      // Graceful shutdown
      kill_timeout:     10000,       // Wait 10s before SIGKILL
      wait_ready:       true,        // Wait for process.send('ready')
      listen_timeout:   10000,       // 10s to send ready signal

      // Auto-restart config
      autorestart:      true,
      restart_delay:    3000,        // Wait 3s between restarts
      max_restarts:     10,          // Give up after 10 restarts
      min_uptime:       '10s',       // Must run for 10s to be considered stable
    },
  ],
};
