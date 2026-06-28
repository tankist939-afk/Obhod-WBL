const fs = require('fs');
const https = require('https');
const tls = require('tls');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 5000;      // Сколько всего конфигов собираем из источников
const PARALLEL_LIMIT = 40;     // Количество одновременных подключений
const MAX_PING = 700;          // Максимальное время ответа в мс

// ======================== СПИСКИ ФИЛЬТРАЦИИ ========================
const WHITELIST_DOMAINS = [
  'gosuslugi.ru', 'mos.ru', 'nalog.ru', 'zakupki.gov.ru', 'kremlin.ru',
  'government.ru', 'gd.ru', 'genproc.gov.ru', 'mvd.ru', 'mchs.ru',
  'rostrud.gov.ru', 'ach.gov.ru', 'rsv.ru', 'mintrud.gov.ru', 'minfin.gov.ru',
  'council.gov.ru', 'ksrf.ru', 'scrf.gov.ru', 'mid.ru', 'minobrnauki.gov.ru',
  'minzdrav.gov.ru', 'minsport.gov.ru', 'minstroyrf.ru', 'mintrans.gov.ru',
  'minpromtorg.gov.ru', 'digital.gov.ru', 'roskomnadzor.ru', 'mirpay.ru', 
  'mironline.ru', 'sbp.nspk.ru', 'sberbank.ru', 'tbank.ru', 'alfabank.ru', 
  'vtb.ru', 'psbank.ru', 'gazprombank.ru', 'open.ru', 'rshb.ru', 'mkb.ru', 
  'absolutbank.ru', 'sovcombank.ru', 'bankuralsib.ru', 'raiffeisen.ru', 
  'citibank.ru', 'unicreditbank.ru', 'rosbank.ru', 'beeline.ru', 'megafon.ru', 
  'mts.ru', 'rt.ru', 't2.ru', 'sbermobile.ru', 'tmobile.ru', 'ertelecom.ru', 
  'domru.ru', 'ttk.ru', 'rostelecom.ru', 'tinkoff.ru', 'yota.ru', 'vk.com', 
  'ok.ru', 'mail.ru', 'yandex.ru', 'dzen.ru', 'rutube.ru', 'max.ru', 'vkvideo.ru', 
  'sferum.ru', 'disk.yandex.ru', '360.yandex.ru', 'kinopoisk.ru', 'ivi.ru', 
  'hh.ru', 'pikabu.ru', 'ozon.ru', 'wildberries.ru', 'avito.ru', 'megamarket.ru', 
  'sbermegamarket.ru', 'magnit.ru', 'vkusvill.ru', 'dixy.ru', 'detmir.ru', 
  'vkusnoitochka.ru', 'burgerking.ru', 'kfc.ru', 'cdek.ru', 'samokat.ru', 
  'kuper.ru', 'gsev.ru', 'utkonos.ru', 'sbermarket.ru', 'lenta.com', 
  'perekrestok.ru', '5ka.ru', 'metro-cc.ru', 'ashan.ru', 'spar.ru', 
  'petrovich.ru', 'dns-shop.ru', 'drom.ru', 'apteka.ru', 'rbc.ru', 'gazeta.ru', 
  'lenta.ru', 'rambler.ru', 'kp.ru', 'ria.ru', 'iz.ru', 'tass.ru', 'kommersant.ru', 
  'vedomosti.ru', 'mk.ru', 'rg.ru', 'ntv.ru', '1tv.ru', 'rt.ru', 'tnt-online.ru', 
  'ctc.ru', 'matchtv.ru', 'zvezdanews.ru', 'vmeste-rf.tv', 'aif.ru', 'pnp.ru', 
  'vesti.ru', 'russia.tv', 'tvzvezda.ru', 'ren.tv', '5-tv.ru', 'domashniy.ru', 
  'muz-tv.ru', 'otr-online.ru', 'tvcenter.ru', 'tv3.ru', 'spastv.ru', '2gis.ru', 
  'russianhighways.ru', 'rzd.ru', 'tutu.ru', 'maxim.taxi', 'gismeteo.ru', 
  'aeroflot.ru', 'pobeda.aero', 's7.ru', 'utair.ru', 'grandservis.ru', 
  'citydrive.ru', 'obr.ru', 'edu.ru', 'ege.edu.ru', 'school.ru', 'moodle.ru', 
  'itmo.ru', 'bmstu.ru', 'spbu.ru', 'msu.ru', 'mipt.ru', 'hse.ru', 'ranepa.ru', 
  'mgimo.ru', 'urfu.ru', 'kpfu.ru', 'nntu.ru', 'tpu.ru', 'susu.ru', 'donstu.ru', 
  'sfedu.ru', 'job.ru', 'rabota.ru', 'superjob.ru', 'zarplata.ru', 'sberid.ru', 
  'goskey.ru', 'chestnyznak.ru', 'sbis.ru', 'diadoc.ru', 'pfr.gov.ru', 'fss.ru', 
  'cmcsmd.ru', 'banki.ru', 'm.gosuslugi.ru', 'kaspersky.ru', 'drweb.ru', 
  'tensor.ru', 'kontur.ru', 'evotor.ru'
];

const ALLOWED_CIDRS = [
  '5.255.255.0/24', '77.88.0.0/18', '87.250.250.0/24',
  '95.108.0.0/16', '217.69.128.0/20', '109.120.128.0/17',
  '185.30.164.0/22', '91.200.120.0/24', '193.232.96.0/24',
  '92.223.80.0/22', '178.248.0.0/21'
];

// ======================== ГЛОБАЛЬНЫЙ АВТОПОИСК ========================
async function discoverSources() {
  console.log("🔍 Запуск расширенного поиска по всему интернету...");
  const sources = new Set([
    // Железные базовые источники (твои старые, гарантированно рабочие)
    "https://hub.mos.ru/kfwl/sub/raw/main/sub.txt",
    "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt",
    "https://raw.githubusercontent.com/Ai123999/5Frid/refs/heads/main/5Frid_Notorgamers",
    "https://raw.githubusercontent.com/kort0881/vpn-checker-backend/refs/heads/main/checked/RU_Best/ru_white_all_WHITE.txt"
  ]);

  // 1. Поиск по GitHub API (С исправленными заголовками и расширенными ключевыми словами)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const ghQueries = ['vless reality ru', 'vless whitelist', 'trojan reality whitelist'];
    for (const query of ghQueries) {
      try {
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=50`;
        const res = await fetchTextWithHeaders(url, {
          'User-Agent': 'NodeJS-Config-Harvester',
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28' // Важная строка для обхода багов API гитхаба
        });
        if (res) {
          const json = JSON.parse(res);
          if (json.items && Array.isArray(json.items)) {
            json.items.forEach(item => {
              const rawUrl = item.html_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
              sources.add(rawUrl);
            });
          }
        }
      } catch (e) { console.log(`⚠️ Ошибка GitHub API: ${e.message}`); }
    }
  }

  // 2. Поиск по GitVerse API (Проверяем и main, и master ветки)
  const gvQueries = ['vless', 'whitelist'];
  for (const q of gvQueries) {
    try {
      const url = `https://gitverse.ru/api/v1/repos/search?q=${encodeURIComponent(q)}&limit=30`;
      const res = await fetchTextWithHeaders(url, { 'User-Agent': 'NodeJS-Config-Harvester' });
      if (res) {
        const json = JSON.parse(res);
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach(repo => {
            ['master', 'main'].forEach(branch => {
              const baseRaw = `https://gitverse.ru/api/repos/${repo.full_name}/raw/branch/${branch}`;
              sources.add(`${baseRaw}/configs.txt`);
              sources.add(`${baseRaw}/whitelist.txt`);
              sources.add(`${baseRaw}/sub.txt`);
            });
          });
        }
      }
    } catch (e) { console.log(`⚠️ Ошибка GitVerse API: ${e.message}`); }
  }

  // 3. Расширенный список Telegram-каналов
  const tgChannels = [
    'vless_configs', 'free_vless_vpn', 'vpn_reality', 
    'vless_trojan_shadowsocks', 'free_configs_vless', 'shadowsocks_vless',
    'bypas_rkn', 'VP_N_Free', 'vless_reality_ru', 'vless_sub', 'free_vless_ru'
  ];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

  console.log(`📡 Поиск завершен. Найдено потенциальных источников: ${sources.size}`);
  return Array.from(sources);
}

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
function isWhitelistedSNI(sni) {
  if (!sni) return false;
  const low = sni.toLowerCase();
  return WHITELIST_DOMAINS.some(d => low === d || low.endsWith('.' + d));
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function isIPInCIDR(ip, cidr) {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
    return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
  } catch { return false; }
}

function isWhitelistedIP(ip) {
  if (!ip) return false;
  return ALLOWED_CIDRS.some(cidr => isIPInCIDR(ip, cidr));
}

function extractIP(url) {
  let m = url.match(/@([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):/);
  if (m) return m[1];
  m = url.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):[0-9]+/);
  return m ? m[1] : null;
}

function extractFlags(text) {
  if (!text) return '🌐';
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = text.match(flagRegex);
  return matches ? matches.join('') : '🌐';
}

function fetchTextWithHeaders(url, headers = {}) {
  return new Promise((resolve) => {
    const options = { headers, timeout: 5000 };
    const req = https.get(url, options, (res) => {
      let data = '';
      if (res.statusCode !== 200) return resolve('');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

function fetchUrl(url) {
  return fetchTextWithHeaders(url, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
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
    } catch (e) {
      return cleanup(false);
    }

    function cleanup(result) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        if (socket) socket.destroy();
        resolve(result);
      }
    }

    socket.on('error', () => cleanup(false));
    socket.on('timeout', () => cleanup(false));
  });
}

// ======================== ОСНОВНОЙ ПРОЦЕСС ========================
async function main() {
  console.log(`🚀 Начинаем всеядный сбор...`);
  const dynamicSources = await discoverSources();
  
  const rawConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 

  for (const src of dynamicSources) {
    let text = await fetchUrl(src);
    if (!text) continue;

    // --- ПЕРЕХВАТ ССЫЛОК НА GOOGLE DRIVE ---
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g;
    let driveMatch;
    while ((driveMatch = driveRegex.exec(text)) !== null) {
      const fileId = driveMatch[1];
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const driveText = await fetchUrl(downloadUrl);
      if (driveText) {
        text += "\n" + driveText;
      }
    }

    // Извлекаем ссылки vless/trojan из любого хаоса
    const configRegex = /(vless|trojan):\/\/[^\s"'\<\>]+/g;
    const matches = text.match(configRegex) || [];
    
    for (let line of matches) {
      line = line.trim();
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
      const sniMatch = line.match(/[?&]sni=([^&]+)/);
      if (sniMatch) {
        try { sni = decodeURIComponent(sniMatch[1]); } catch (e) { sni = sniMatch[1]; }
      }

      // Проверка на дубликаты
      const serverKey = `${hostOrIp}:${port}:${sni || 'nosni'}`;
      if (seenServers.has(serverKey)) continue;

      let isGood = false;
      let label = '';
      const flags = extractFlags(comment);

      if (sni && isWhitelistedSNI(sni)) {
        isGood = true;
        label = `${flags} SNI: ${sni}`; 
      } else {
        const ip = extractIP(urlPart);
        if (ip && isWhitelistedIP(ip)) {
          isGood = true;
          label = `${flags} CIDR: ${ip}`;
        }
      }

      if (isGood) {
        seenUrls.add(line);
        seenServers.add(serverKey); 
        rawConfigs.push({ urlPart, label, sni });
        if (rawConfigs.length >= MAX_CONFIGS) break;
      }
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`📥 Успешно отфильтровано уникальных конфигов: ${rawConfigs.length} шт. Проверяем скорость...`);

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
          liveConfigs.push(`${cfg.urlPart}#${cfg.label} | Obhod WBL`);
        }
      }
    }
  }

  const workers = Array.from({ length: PARALLEL_LIMIT }, worker);
  await Promise.all(workers);

  console.log(`✅ Чек окончен! Скоростных серверов найдено: ${liveConfigs.length}`);
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL Global Explorer\n#profile-update-interval: 6\n#announce: 👑 Глобальный поиск | Живых: ${liveConfigs.length} | UTC: ${timestamp}\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 Результат успешно записан в файл configs.txt!');
}

main();
