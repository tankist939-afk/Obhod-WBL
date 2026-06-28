const fs = require('fs');
const https = require('https');
const tls = require('tls');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 6000;      // Больше лимит, так как парсинг стал глубже
const PARALLEL_LIMIT = 50;     // Количество одновременных тестов
const MAX_PING = 850;          // Оптимальный таймаут (в мс)

// ======================== АВТОНОМНЫЙ ИСТОЧНИК ПОИСКА ========================
async function discoverSources() {
  console.log("🔍 Запуск тотального автопоиска по всему интернету...");
  const sources = new Set([
    // Оставляем только 4 базовых глобальных агрегатора (остальное ищется динамически)
    "https://hub.mos.ru/kfwl/sub/raw/main/sub.txt",
    "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt",
    "https://kfwl-sub.vercel.app/sub",
    "https://free-obwl.vercel.app/configs/configs.txt"
  ]);

  // Глубокий поиск по GitHub API
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const ghQueries = [
      'vless://', 'trojan://', 'reality publickey', 
      'serverName reality', 'flow: xtls-rprx-vision'
    ];
    for (const query of ghQueries) {
      try {
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100`;
        const res = await fetchTextWithHeaders(url, {
          'User-Agent': 'NodeJS-Autonomous-Parser',
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

  // Поиск по GitVerse API
  try {
    const url = `https://gitverse.ru/api/v1/repos/search?q=vless&limit=40`;
    const res = await fetchTextWithHeaders(url, { 'User-Agent': 'NodeJS-Autonomous-Parser' });
    if (res) {
      const json = JSON.parse(res);
      if (json.data) {
        json.data.forEach(repo => {
          ['master', 'main'].forEach(b => {
            sources.add(`https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${b}/configs.txt`);
            sources.add(`https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${b}/sub.txt`);
            sources.add(`https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${b}/merged.txt`);
          });
        });
      }
    }
  } catch (e) {}

  // Telegram-каналы (добавил самые жирные по конфигурациям)
  const tgChannels = [
    'vless_configs', 'free_vless_vpn', 'vpn_reality', 'vless_reality_ru',
    'vless_sub', 'free_vless_ru', 'shadowsocks_vless', 'bypas_rkn'
  ];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

  console.log(`📡 Поиск завершен. Найдено уникальных целевых источников: ${sources.size}`);
  return Array.from(sources);
}

// ======================== УМНЫЙ СБОРЩИК (ССЫЛКИ + ОТДЕЛЬНЫЕ СЕРВЕРА) ========================
function extractConfigsFromText(text) {
  const list = [];
  
  // 1. Сбор стандартных готовых ссылок
  const linkRegex = /(vless|trojan):\/\/[^\s"'<>\`]+/g;
  const linkMatches = text.match(linkRegex) || [];
  linkMatches.forEach(link => list.push(link.trim()));

  // 2. Сбор из "голых" параметров (парсинг отдельных разрозненных серверов)
  // Ищем комбинации IP:PORT, UUID/Паролей и Reality параметров в тексте
  const ipPortRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):([0-9]{2,5})/g;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const pbkRegex = /pbk=([a-zA-Z0-9_-]+)/;
  const sniRegex = /sni=([a-zA-Z0-9\.-]+)/;

  let match;
  while ((match = ipPortRegex.exec(text)) !== null) {
    const ip = match[1];
    const port = match[2];
    
    // Берем небольшой контекст вокруг найденного IP, чтобы вытащить ключи
    const context = text.substring(Math.max(0, match.index - 300), Math.min(text.length, match.index + 500));
    
    const uuidMatch = context.match(uuidRegex);
    if (uuidMatch) {
      const uuid = uuidMatch[0];
      const pbk = context.match(pbkRegex)?.[1] || '';
      const sni = context.match(sniRegex)?.[1] || 'gosuslugi.ru'; // дефолт-заглушка если не найден
      
      // Собираем полноценную vless ссылку из отдельных кусков!
      let generatedVless = `vless://${uuid}@${ip}:${port}?security=reality&encryption=none&pbk=${pbk}&sni=${sni}&fp=chrome&type=tcp&flow=xtls-rprx-vision#🤖 Reconstructed Node`;
      list.push(generatedVless);
    }
  }

  return list;
}

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
function extractFlags(text) {
  if (!text) return '🌐';
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = text.match(flagRegex);
  return matches ? matches.join('') : '🌐';
}

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

function checkTlsWithPing(host, port, sni) {
  return new Promise((resolve) => {
    let resolved = false;
    const startTime = Date.now();
    const timeoutTimer = setTimeout(() => cleanup(false), MAX_PING);

    const options = {
      host: host,
      port: parseInt(port, 10),
      servername: sni || host,
      rejectUnauthorized: false,
      timeout: MAX_PING,
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256'
    };

    let socket;
    try {
      socket = tls.connect(options, () => {
        const ping = Date.now() - startTime;
        cleanup(ping < MAX_PING);
      });
    } catch (e) { return cleanup(false); }

    function cleanup(result) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        if (socket) socket.destroy();
        resolve(result);
      }
    }
    if (socket) {
      socket.on('error', () => cleanup(false));
      socket.on('timeout', () => cleanup(false));
    }
  });
}

// ======================== ГЛАВНЫЙ ПРОЦЕСС ========================
async function main() {
  console.log(`🚀 Запуск умного автономного парсера...`);
  const dynamicSources = await discoverSources();
  
  const rawConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 

  for (const src of dynamicSources) {
    let text = await fetchTextWithHeaders(src, { 'User-Agent': 'Mozilla/5.0' });
    if (!text) continue;

    // Сбор комбинированным методом (и ссылки, и разрозненные сервера)
    const matches = extractConfigsFromText(text);
    
    for (let line of matches) {
      if (!line || seenUrls.has(line)) continue;

      let urlPart = line, comment = '';
      const hIdx = line.indexOf('#');
      if (hIdx !== -1) {
        urlPart = line.substring(0, hIdx).trim();
        comment = line.substring(hIdx + 1).trim();
      }

      let hostMatch = urlPart.match(/@([^:]+):([0-9]+)/) || urlPart.match(/:\/\/([^:]+):([0-9]+)/);
      if (!hostMatch) continue;
      const hostOrIp = hostMatch[1];
      const port = hostMatch[2];

      let sni = '';
      const sniMatch = line.match(/[?&]sni=([^&#\s]+)/);
      if (sniMatch) {
        try { sni = decodeURIComponent(sniMatch[1]); } catch (e) { sni = sniMatch[1]; }
      }

      // Глубокая дедупликация (IP + Порт + SNI)
      const serverKey = `${hostOrIp}:${port}:${sni || 'nosni'}`;
      if (seenServers.has(serverKey)) continue;

      const flags = extractFlags(comment);
      let label = sni ? `${flags} SNI: ${sni}` : `${flags} IP: ${hostOrIp}`;

      seenUrls.add(line);
      seenServers.add(serverKey); 
      rawConfigs.push({ urlPart, label, sni });

      if (rawConfigs.length >= MAX_CONFIGS) break;
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`📥 Извлечено уникальных объектов: ${rawConfigs.length}. Запуск скоростных тестов...`);

  const liveConfigs = [];
  let index = 0;

  async function worker() {
    while (index < rawConfigs.length) {
      const currentIdx = index++;
      const cfg = rawConfigs[currentIdx];
      if (!cfg) continue;

      let m = cfg.urlPart.match(/@([^:]+):([0-9]+)/) || cfg.urlPart.match(/:\/\/([^:]+):([0-9]+)/);
      if (m) {
        const alive = await checkTlsWithPing(m[1], m[2], cfg.sni);
        if (alive) {
          liveConfigs.push(`${cfg.urlPart}#${cfg.label}`);
        }
      }
    }
  }

  const workers = Array.from({ length: PARALLEL_LIMIT }, worker);
  await Promise.all(workers);

  console.log(`✅ Проверку прошли: ${liveConfigs.length} серверов.`);
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL AI Engine\n#profile-update-interval: 1\n#announce: 🤖 Полная автономия | Ссылки + Сборка серверов | Живых: ${liveConfigs.length} | ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 configs.txt обновлен автоматически!');
}

main();
