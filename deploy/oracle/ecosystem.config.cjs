module.exports = {
  apps: [
    {
      name: "badminton-hub",
      cwd: "/srv/badminton-hub/current",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1200M",
      env: {
        NODE_ENV: "production",
      },
      out_file: "/var/log/badminton-hub/out.log",
      error_file: "/var/log/badminton-hub/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};