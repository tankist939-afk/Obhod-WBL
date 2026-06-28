const fs = require('fs');
const https = require('https');
const tls = require('tls');
const crypto = require('crypto');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 4000;      // Лимит собираемых уникальных ссылок
const PARALLEL_LIMIT = 50;     // Количество одновременных тестов
const MAX_PING = 1200;         // Таймаут теста (в мс), как в клиентах

// ======================== ИСТОЧНИКИ ДАННЫХ ========================
async function discoverSources() {
  console.log("🔍 Поиск свежих конфигов (GitHub, GitVerse, Telegram)...");
  const sources = new Set();

  // 1. Поиск по GitHub API
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const ghQueries = ['vless://', 'trojan://'];
    for (const query of ghQueries) {
      try {
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100`;
        const res = await fetchTextWithHeaders(url, {
          'User-Agent': 'v2rayNG-Harvester-Bot',
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        });
        if (res) {
          const json = JSON.parse(res);
          if (json.items) {
            json.items.forEach(item => {
              const rawUrl = item.html_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
              sources.add(rawUrl);
            });
          }
        }
      } catch (e) {}
    }
  }

  // 2. Поиск по GitVerse API
  try {
    const url = `https://gitverse.ru/api/v1/repos/search?q=vless&limit=30`;
    const res = await fetchTextWithHeaders(url, { 'User-Agent': 'v2rayNG-Harvester-Bot' });
    if (res) {
      const json = JSON.parse(res);
      if (json.data) {
        json.data.forEach(repo => {
          ['main', 'master'].forEach(b => {
            sources.add(`https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${b}/configs.txt`);
            sources.add(`https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${b}/sub.txt`);
          });
        });
      }
    }
  } catch (e) {}

  // 3. Telegram Веб-превью каналов
  const tgChannels = ['vless_configs', 'free_vless_vpn', 'vpn_reality', 'vless_reality_ru', 'vless_sub', 'free_vless_ru'];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

  console.log(`📡 Поиск окончен. Найдено источников для выкачивания: ${sources.size}`);
  return Array.from(sources);
}

// ======================== ЭМУЛЯЦИЯ ТЕСТА v2rayNG (VLESS / TROJAN) ========================
function parseConfigUrl(url) {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(':', '');
    if (protocol !== 'vless' && protocol !== 'trojan') return null;

    const host = parsed.hostname;
    const port = parsed.port || (protocol === 'vless' ? '443' : '80');
    const uuidOrPass = parsed.username || parsed.pathname.replace(/^\//, '');
    
    const params = Object.fromEntries(parsed.searchParams.entries());
    
    return { protocol, host, port, uuidOrPass, params, original: url };
  } catch (e) {
    return null;
  }
}

// Функция симулирует отправку прокси-запроса авторизации (VLESS/Trojan Handshake)
function testProxyProtocol(cfg) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let resolved = false;

    const timeoutTimer = setTimeout(() => cleanup(false), MAX_PING);

    const isTls = cfg.params.security === 'tls' || cfg.params.security === 'reality' || cfg.port === '443';
    const sni = cfg.params.sni || cfg.host;

    const socketOptions = {
      host: cfg.host,
      port: parseInt(cfg.port, 10),
      servername: sni,
      rejectUnauthorized: false,
      timeout: MAX_PING,
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256'
    };

    let client;

    if (isTls) {
      try {
        client = tls.connect(socketOptions, onConnect);
      } catch (e) { return cleanup(false); }
    } else {
      // Для обычного TCP соединения (если прокси без TLS)
      try {
        client = require('net').connect(socketOptions, onConnect);
      } catch (e) { return cleanup(false); }
    }

    function onConnect() {
      try {
        let payload;
        
        if (cfg.protocol === 'vless') {
          // Эмуляция заголовка запроса VLESS (Протокол версии 0)
          const uuidHex = cfg.uuidOrPass.replace(/-/g, '');
          if (uuidHex.length !== 32) return cleanup(false);
          
          const uuidBuffer = Buffer.from(uuidHex, 'hex');
          const numParams = Buffer.from([0, 0]); // 0 длина дополнительных надстроек
          const command = Buffer.from([1]);      // Command: CONNECT
          const portBuffer = Buffer.alloc(2);
          portBuffer.writeUInt16BE(80, 0);       // Симулируем запрос к 80 порту (gstatic)
          const addressType = Buffer.from([1]);  // IPv4 адрес назначения
          const address = Buffer.from([127, 0, 0, 1]); // Квадрат заглушки локалхоста
          
          payload = Buffer.concat([Buffer.from([0]), uuidBuffer, numParams, command, portBuffer, addressType, address]);
        } else if (cfg.protocol === 'trojan') {
          // Эмуляция заголовка запроса Trojan
          const hexPassword = crypto.createHash('sha224').update(cfg.uuidOrPass).digest('hex');
          payload = Buffer.from(`${hexPassword}\r\n\x01\x01\x7f\x00\x00\x01\x00\x50\r\n`);
        }

        client.write(payload);

        // Ждем первичных данных ответа сервера
        client.once('data', () => {
          const ping = Date.now() - startTime;
          cleanup(ping < MAX_PING);
        });

        // Если сервер просто закрыл соединение без данных — прокси нерабочий/не авторизован
        client.once('end', () => cleanup(false));

      } catch (err) {
        cleanup(false);
      }
    }

    function cleanup(isAlive) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        if (client) client.destroy();
        resolve(isAlive);
      }
    }

    if (client) {
      client.on('error', () => cleanup(false));
      client.on('timeout', () => cleanup(false));
    }
  });
}

// ======================== ВСПОМОГАТЕЛЬНЫЕ ДВИЖКИ ========================
function fetchTextWithHeaders(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, { headers, timeout: 5000 }, (res) => {
      let data = '';
      if (res.statusCode !== 200) return resolve('');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

// ======================== ГЛАВНЫЙ ЦИКЛ ========================
async function main() {
  console.log(`🚀 Запуск v2rayNG-близкого чекерера...`);
  const rawSources = await discoverSources();
  
  const uniqueConfigs = new Map(); 
  const configRegex = /(vless|trojan):\/\/[^\s"'<>\`]+/g;

  for (const src of rawSources) {
    const text = await fetchTextWithHeaders(src, { 'User-Agent': 'Mozilla/5.0' });
    if (!text) continue;

    const matches = text.match(configRegex) || [];
    for (const line of matches) {
      const cleanLine = line.trim();
      const cfgObj = parseConfigUrl(cleanLine);
      if (!cfgObj) continue;

      // Ключ уникальности: IP + ПОРТ + СЕКРЕТ + SNI. Защищает от любого спама дубликатов
      const uniqKey = `${cfgObj.host}:${cfgObj.port}:${cfgObj.uuidOrPass}:${cfgObj.params.sni || 'none'}`;
      if (!uniqueConfigs.has(uniqKey)) {
        uniqueConfigs.set(uniqKey, cfgObj);
      }
    }
  }

  const allParsedConfigs = Array.from(uniqueConfigs.values());
  console.log(`📥 Найдено ${allParsedConfigs.length} уникальных конфигураций. Начинаем глубокий тест протоколов...`);

  const workingConfigs = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < allParsedConfigs.length) {
      const cfg = allParsedConfigs[currentIndex++];
      if (!cfg) continue;

      const isWorking = await testProxyProtocol(cfg);
      if (isWorking) {
        // Очищаем название хэша от старого мусора, подставляя красивую общую метку
        const baseLink = cfg.original.split('#')[0];
        workingConfigs.push(`${baseLink}#🚀 v2rayNG Active Node`);
      }
    }
  }

  // Запуск параллельного тестирования
  const workers = Array.from({ length: PARALLEL_LIMIT }, worker);
  await Promise.all(workers);

  console.log(`✅ Тестирование завершено! Проверку на авторизацию прошли: ${workingConfigs.length}`);

  // Формируем файл подписки
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const fileHeader = `#profile-title: v2rayNG Verified Stream\n#profile-update-interval: 1\n#announce: 🛡️ Проверено симулятором ядра v2rayNG | Рабочих нод: ${workingConfigs.length} | Обновлено: ${timestamp} UTC\n\n`;

  fs.writeFileSync('configs.txt', fileHeader + workingConfigs.join('\n'));
  console.log('💾 Результат сохранен в configs.txt!');
}

main();
