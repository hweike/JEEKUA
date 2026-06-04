module.exports = {
  apps: [{
    name: 'feisman-power',                // 项目名称（与宝塔中的名称一致）
    script: 'node_modules/.bin/next',     // 启动脚本
    args: 'start --hostname 0.0.0.0 --port 3000',  // 参数：监听所有IP，端口3000
    cwd: '/www/wwwroot/feisman-power',    // 工作目录（绝对路径，必须）
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: 'LHjK20LkUbYVLazrb16ueQLPmZmkkPuuzt7r1tyVejw',
      DEEPSEEK_API_KEY: 'sk-d736ef3755c243c6aafc99cf160f2895',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com'
    },
    // 可选：内存限制
    max_memory_restart: '1536M',
    // 可选：实例数量
    instances: 1,
    exec_mode: 'fork'
  }]
};