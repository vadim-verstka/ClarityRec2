const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Запуск системы ClarityRec...\n');

const modules = [
  {
    name: 'Модуль рекомендаций',
    dir: path.join(__dirname, 'recommendation-module'),
    port: 3001
  },
  {
    name: 'Модуль объяснений',
    dir: path.join(__dirname, 'explanation-module'),
    port: 3002
  },
  {
    name: 'Веб-приложение',
    dir: path.join(__dirname, 'web-app'),
    port: 3000
  }
];

const processes = [];

// Проверка наличия папок и установка зависимостей при необходимости
modules.forEach((module, index) => {
  if (!fs.existsSync(module.dir)) {
    console.error(`❌ Папка модуля "${module.name}" не найдена: ${module.dir}`);
    process.exit(1);
  }
  
  const nodeModulesPath = path.join(module.dir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`📦 Установка зависимостей для "${module.name}"...`);
    const npmInstall = spawn('npm', ['install'], {
      cwd: module.dir,
      stdio: 'inherit'
    });
    
    npmInstall.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Ошибка установки зависимостей для "${module.name}"`);
        process.exit(1);
      }
      console.log(`✅ Зависимости установлены для "${module.name}"\n`);
      if (index === modules.length - 1) {
        startServers();
      }
    });
  } else {
    if (index === modules.length - 1) {
      startServers();
    }
  }
});

function startServers() {
  console.log('🔧 Запуск серверов...\n');
  
  modules.forEach((module, index) => {
    console.log(`▶️  Запуск: ${module.name} (порт ${module.port})`);
    
    const serverProcess = spawn('node', ['server.js'], {
      cwd: module.dir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    processes.push({
      name: module.name,
      process: serverProcess,
      port: module.port
    });
    
    // Вывод логов с префиксом
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(`[${module.name}] ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`[${module.name}] ${data}`);
    });
    
    serverProcess.on('error', (err) => {
      console.error(`\n❌ Ошибка запуска "${module.name}": ${err.message}`);
    });
    
    serverProcess.on('close', (code) => {
      if (code !== null && code !== 0) {
        console.error(`\n⚠️  "${module.name}" завершился с кодом ${code}`);
      }
    });
    
    // Небольшая задержка между запусками
    if (index < modules.length - 1) {
      setTimeout(() => {}, 500);
    }
  });
  
  // Ждем немного и показываем итоговое сообщение
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Все серверы запущены!\n');
    console.log('📡 Веб-приложение доступно по адресу:');
    console.log('   👉 http://localhost:3000\n');
    console.log('🔐 Данные для входа:');
    console.log('   Логин: admin');
    console.log('   Пароль: cradmin123\n');
    console.log('🛑 Для остановки нажмите Ctrl+C');
    console.log('='.repeat(60) + '\n');
  }, 2000);
}

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка всех серверов...');
  
  processes.forEach((item) => {
    console.log(`   Остановка: ${item.name}`);
    item.process.kill('SIGINT');
  });
  
  setTimeout(() => {
    console.log('✅ Все серверы остановлены');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка всех серверов...');
  processes.forEach((item) => {
    item.process.kill('SIGTERM');
  });
  process.exit(0);
});

// Если зависимости уже установлены, запускаем сразу
if (modules.every(m => fs.existsSync(path.join(m.dir, 'node_modules')))) {
  startServers();
}
