const fs = require('fs');
const https = require('https');
const tls = require('tls');
// Используем локальную базу данных. Она скачивается один раз при npm install
// и проверяет IP внутри памяти компьютера мгновенно (без запросов в интернет)
const geoip = require('geoip-lite'); 

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 60000;     
const PARALLEL_LIMIT = 1000;   // Твоя желаемая скорость (как в NekoBox)
const MAX_PING = 900;          

// Настройка системного агента Node.js для работы с огромным количеством потоков
https.globalAgent.maxSockets = PARALLEL_LIMIT + 50; // Запас для скачивания источников

// Ротация доменов для теста
const TEST_DOMAINS = ['gosuslugi.ru', 'mos.ru', 'nalog.ru', 'vk.com', 'ok.ru', 'mail.ru', 'yandex.ru', 'dzen.ru', 't.me'];

// ======================== БЕЛЫЕ СПИСКИ (ФИЛЬТРЫ) ========================
const WHITELIST_DOMAINS = new Set([
  'gosuslugi.ru', 'mos.ru', 'nalog.ru', 'zakupki.gov.ru', 'kremlin.ru',
  'government.ru', 'gd.ru', 'genproc.gov.ru', 'mvd.ru', 'mchs.ru',
  'rostrud.gov.ru', 'ach.gov.ru', 'rsv.ru', 'mintrud.gov.ru', 'minfin.gov.ru',
  'council.gov.ru', 'ksrf.ru', 'scrf.gov.ru', 'mid.ru', 'minobrnauki.gov.ru',
  'minzdrav.gov.ru', 'minsport.gov.ru', 'minstroyrf.ru', 'mintrans.gov.ru',
  'minpromtorg.gov.ru', 'digital.gov.ru', 'roskomnadzor.ru',
  'mirpay.ru', 'mironline.ru', 'sbp.nspk.ru',
  'sberbank.ru', 'tbank.ru', 'alfabank.ru', 'vtb.ru', 'psbank.ru',
  'gazprombank.ru', 'open.ru', 'rshb.ru', 'mkb.ru', 'absolutbank.ru',
  'sovcombank.ru', 'bankuralsib.ru', 'raiffeisen.ru', 'citibank.ru',
  'unicreditbank.ru', 'rosbank.ru',
  'beeline.ru', 'megafon.ru', 'mts.ru', 'rt.ru', 't2.ru',
  'sbermobile.ru', 'tmobile.ru', 'ertelecom.ru', 'domru.ru', 'ttk.ru',
  'rostelecom.ru', 'tinkoff.ru', 'yota.ru',
  'vk.com', 'ok.ru', 'mail.ru', 'yandex.ru', 'dzen.ru', 'rutube.ru', 'max.ru',
  'vkvideo.ru', 'sferum.ru', 'disk.yandex.ru', '360.yandex.ru', 'kinopoisk.ru',
  'ivi.ru', 'hh.ru', 'pikabu.ru',
  'ozon.ru', 'wildberries.ru', 'avito.ru', 'megamarket.ru', 'sbermegamarket.ru',
  'magnit.ru', 'vkusvill.ru', 'dixy.ru', 'detmir.ru', 'vkusnoitochka.ru',
  'burgerking.ru', 'kfc.ru', 'cdek.ru', 'samokat.ru', 'kuper.ru', 'gsev.ru',
  'utkonos.ru', 'sbermarket.ru', 'lenta.com', 'perekrestok.ru', '5ka.ru',
  'metro-cc.ru', 'ashan.ru', 'spar.ru', 'petrovich.ru', 'dns-shop.ru', 'drom.ru', 'apteka.ru',
  'rbc.ru', 'gazeta.ru', 'lenta.ru', 'rambler.ru', 'kp.ru', 'ria.ru', 'iz.ru',
  'tass.ru', 'kommersant.ru', 'vedomosti.ru', 'mk.ru', 'rg.ru', 'ntv.ru', '1tv.ru',
  'rt.ru', 'tnt-online.ru', 'ctc.ru', 'matchtv.ru', 'zvezdanews.ru', 'vmeste-rf.tv',
  'aif.ru', 'pnp.ru', 'vesti.ru', 'russia.tv', 'tvzvezda.ru', 'ren.tv', '5-tv.ru',
  'domashniy.ru', 'muz-tv.ru', 'otr-online.ru', 'tvcenter.ru', 'tv3.ru', 'spastv.ru',
  '2gis.ru', 'russianhighways.ru', 'rzd.ru', 'tutu.ru',
  'maxim.taxi', 'gismeteo.ru', 'aeroflot.ru',
  'pobeda.aero', 's7.ru', 'utair.ru', 'grandservis.ru', 'citydrive.ru',
  'obr.ru', 'edu.ru', 'ege.edu.ru', 'school.ru', 'moodle.ru', 'itmo.ru',
  'bmstu.ru', 'spbu.ru', 'msu.ru', 'mipt.ru', 'hse.ru', 'ranepa.ru', 'mgimo.ru',
  'urfu.ru', 'kpfu.ru', 'nntu.ru', 'tpu.ru', 'susu.ru', 'donstu.ru', 'sfedu.ru',
  'job.ru', 'rabota.ru', 'superjob.ru', 'zarplata.ru',
  'sberid.ru', 'goskey.ru', 'chestnyznak.ru', 'sbis.ru', 'diadoc.ru',
  'pfr.gov.ru', 'fss.ru', 'cmcsmd.ru', 'banki.ru', 'm.gosuslugi.ru',
  'kaspersky.ru', 'drweb.ru', 'tensor.ru', 'kontur.ru', 'evotor.ru'
]);

const ALLOWED_CIDRS = [
  '5.255.255.0/24', '77.88.0.0/18', '87.250.250.0/24',
  '95.108.0.0/16', '217.69.128.0/20', '109.120.128.0/17',
  '185.30.164.0/22', '91.200.120.0/24', '193.232.96.0/24',
  '92.223.80.0/22', '178.248.0.0/21'
];

function ipToLong(ip) {
  return ip.split('.').reduce((long, octet) => (long << 8) + parseInt(octet, 10), 0) >>> 0;
}

const PARSED_CIDRS = ALLOWED_CIDRS.map(cidr => {
  const [subnet, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  return { ip: ipToLong(subnet), mask };
});

// Автоматическое приведение репозиториев к RAW ссылкам
function normalizeToRawUrl(url) {
  try {
    let u = new URL(url);
    // GitHub
    if (u.hostname === 'github.com' && !u.pathname.includes('/raw/')) {
      u.hostname = 'raw.githubusercontent.com';
      u.pathname = u.pathname.replace('/blob/', '/');
      return u.toString();
    }
    // GitVerse
    if (u.hostname === 'gitverse.ru' && u.pathname.includes('/blob/')) {
      u.pathname = u.pathname.replace('/blob/', '/raw/');
      return u.toString();
    }
    // Codeberg
    if (u.hostname === 'codeberg.org' && u.pathname.includes('/src/')) {
      u.pathname = u.pathname.replace('/src/', '/raw/');
      return u.toString();
    }
  } catch (e) {}
  return url;
}

  const tgChannels = ['vless_configs', 'free_vless_vpn', 'vpn_reality', 'vless_reality_ru'];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

  // Применяем нормализацию ко всем ссылкам репозиториев для исключения дубликатов и битых форматов
  return Array.from(sources).map(normalizeToRawUrl);
}

// ======================== УТИЛИТЫ ВАЛИДАЦИИ ========================
function isIpInCidr(ip) {
  if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) return false;
  const ipLong = ipToLong(ip);
  for (const cidr of PARSED_CIDRS) {
    if ((ipLong & cidr.mask) === (cidr.ip & cidr.mask)) return true;
  }
  return false;
}

function isSniAllowed(sni) {
  if (!sni) return false;
  const lowerSni = sni.toLowerCase().trim();
  if (WHITELIST_DOMAINS.has(lowerSni)) return true;
  for (const domain of WHITELIST_DOMAINS) {
    if (lowerSni.endsWith('.' + domain) || domain.endsWith('.' + lowerSni)) return true;
  }
  return false;
}

// ======================== УЛУЧШЕННЫЙ ЭКСТРАКТОР ДЛЯ ТГ И HTML ========================
function extractConfigsFromText(text) {
  const list = [];
  
  // Улучшенный безопасный разбор Telegram страниц (вытаскиваем полные данные из атрибутов)
  if (text.includes('class="tgme_channel_info"') || text.includes('</html')) {
    // Регулярка для вытаскивания полных ссылок из href ссылок (в превью тг они не бьются многоточием)
    const hrefRegex = /href="((?:vless|trojan):\/\/[^"]+)"/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(text)) !== null) {
      list.push(hrefMatch[1]);
    }

    // Очищаем HTML для поиска raw конфигов в тегах <code>
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' '); 
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  // Стандартный поиск URIs во всем остальном тексте
  const linkRegex = /(vless|trojan):\/\/[^\s"'<>\`\\]+/g;
  const linkMatches = text.match(linkRegex) || [];
  linkMatches.forEach(link => list.push(link.trim()));

  // Поиск raw IP:PORT с контекстом
  const ipPortRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):([0-9]{2,5})/g;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const pbkRegex = /pbk=([a-zA-Z0-9_-]+)/;
  const sniRegex = /sni=([a-zA-Z0-9\.-]+)/;

  let match;
  while ((match = ipPortRegex.exec(text)) !== null) {
    const ip = match[1];
    const port = match[2];
    const context = text.substring(Math.max(0, match.index - 250), Math.min(text.length, match.index + 400));
    const uuidMatch = context.match(uuidRegex);
    
    if (uuidMatch) {
      const uuid = uuidMatch[0];
      const pbk = context.match(pbkRegex)?.[1] || '';
      const sni = context.match(sniRegex)?.[1] || 'gosuslugi.ru';
      list.push(`vless://${uuid}@${ip}:${port}?security=reality&encryption=none&pbk=${pbk}&sni=${sni}&fp=chrome&type=tcp&flow=xtls-rprx-vision#🌐 | ${sni} | Obhod WBL`);
    }
  }
  return list;
}

function extractFlags(text) {
  if (!text) return '';
  try { text = decodeURIComponent(text); } catch(e) {}
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = text.match(flagRegex);
  return matches ? matches.join('') : '';
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getCountryByIpLocal(ip) {
  const geo = geoip.lookup(ip);
  if (geo && geo.country) return getFlagEmoji(geo.country);
  return '🌐';
}

function fetchTextWithHeaders(url) {
  return new Promise((resolve) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };

    https.get(url, { headers, timeout: 7000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return resolve(fetchTextWithHeaders(res.headers.location));
      }

      if (res.statusCode !== 200) {
        console.error(`⚠️ Ошибка загрузки [Код ${res.statusCode}]: ${url}`);
        return resolve('');
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      console.error(`❌ Ошибка сети для ${url}: ${err.message}`);
      resolve('');
    });
  });
}

// ======================== TLS ТЕСТ С РОТАЦИЕЙ ========================
function checkTlsWithPing(host, port, sni) {
  return new Promise((resolve) => {
    let resolved = false;
    const startTime = Date.now();
    
    const timeoutTimer = setTimeout(() => cleanup(false), MAX_PING);

    const randomSni = TEST_DOMAINS[Math.floor(Math.random() * TEST_DOMAINS.length)];
    const targetSni = sni || randomSni;

    const options = {
      host: host,
      port: parseInt(port, 10),
      servername: targetSni,
      rejectUnauthorized: false,
      timeout: MAX_PING,
      minVersion: 'TLSv1.3',
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384'
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
  console.log(`🚀 Старт ультра-быстрого чекера (Параллельность: ${PARALLEL_LIMIT})...`);
  const dynamicSources = await discoverSources();
  
  const rawConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 

  let totalExtracted = 0;
  let rejectedByFilters = 0;

  // 1. Сбор и фильтрация ссылок
  for (const src of dynamicSources) {
    let text = await fetchTextWithHeaders(src);
    if (!text) continue;

    const matches = extractConfigsFromText(text);
    
    for (let line of matches) {
      if (!line || seenUrls.has(line)) continue;
      totalExtracted++;

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

      // ФИЛЬТРАЦИЯ
      const sniValid = isSniAllowed(sni);
      const cidrValid = isIpInCidr(hostOrIp);

      if (!sniValid && !cidrValid) {
        rejectedByFilters++;
        continue; 
      }

      const serverKey = `${hostOrIp}:${port}:${sni || 'nosni'}`;
      if (seenServers.has(serverKey)) continue;

      let parsedFlag = extractFlags(comment);
      if (parsedFlag && parsedFlag.length > 4) parsedFlag = parsedFlag.substring(0, 4);

      seenUrls.add(line);
      seenServers.add(serverKey); 
      rawConfigs.push({ urlPart, hostOrIp, port, sni, parsedFlag });

      if (rawConfigs.length >= MAX_CONFIGS) break;
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`\n📊 Всего извлечено ссылок: ${totalExtracted}`);
  console.log(`✂️ Отсеяно фильтрами (не БС SNI/CIDR): ${rejectedByFilters}`);
  console.log(`📥 Запуск теста в ${PARALLEL_LIMIT} потоков для ${rawConfigs.length} конфигов...`);

  const liveConfigs = [];
  let index = 0;

  // 2. Асинхронные воркеры
  async function worker() {
    while (index < rawConfigs.length) {
      const currentIdx = index++;
      const cfg = rawConfigs[currentIdx];
      if (!cfg) continue;

      const alive = await checkTlsWithPing(cfg.hostOrIp, cfg.port, cfg.sni);
      if (alive) {
        let finalFlag = '🌐';
        const isIp = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cfg.hostOrIp);

        if (isIp) finalFlag = getCountryByIpLocal(cfg.hostOrIp);
        if (finalFlag === '🌐' && cfg.parsedFlag) finalFlag = cfg.parsedFlag;

        const currentSni = cfg.sni ? cfg.sni : cfg.hostOrIp;
        const label = `${finalFlag} | ${currentSni} | Obhod WBL`;
        
        liveConfigs.push(`${cfg.urlPart}#${label}`);
      }
    }
  }

  const workers = Array.from({ length: PARALLEL_LIMIT }, worker);
  await Promise.all(workers);

  console.log(`✅ Готово! Финальный отбор прошли: ${liveConfigs.length} серверов.`);
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL Turbo Cleaner\n#profile-update-interval: 1\n#announce: 👑 Турбо база | Живых: ${liveConfigs.length} | ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 Результат сохранен в configs.txt!');
}

main();
