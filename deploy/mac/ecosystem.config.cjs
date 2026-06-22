module.exports = {
  apps: [
    {
      name: "badminton-hub",
      cwd: `${process.env.HOME}/badminton-hub/current`,
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1200M",
      env_file: `${process.env.HOME}/.badminton-hub.env`,
      env: {
        NODE_ENV: "production",
      },
      out_file: `${process.env.HOME}/Library/Logs/badminton-hub/out.log`,
      error_file: `${process.env.HOME}/Library/Logs/badminton-hub/error.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
