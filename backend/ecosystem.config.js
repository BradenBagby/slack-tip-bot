module.exports = {
    apps: [
      {
        name: 'api',
        script: process.env.NODE_ENV === 'development' ? 'src/index.ts' : 'dist/index.js',
        exec_mode: 'fork',
        instances: 1,
        watch: process.env.NODE_ENV === 'development' ? ['src/'] : false,
        ignore_watch: ["node_modules"],
        interpreter: process.env.NODE_ENV === 'development' ? 'ts-node' : undefined,
        env: {
          NODE_ENV: 'development',
        },
        env_production: {
          NODE_ENV: 'production',
        }
      },
    ],
    post_exit: (signal) => {
      if (signal === 'SIGINT' && process.env.NODE_ENV === 'development') {
        console.log('Stopping all processes due to Ctrl+C...');
        pm2.delete('all', (err) => {
          if (err) {
            console.error('Error while stopping PM2 processes:', err);
          } else {
            console.log('All PM2 processes stopped.');
            process.exit(0);
          }
        });
      }
    }
  };
  