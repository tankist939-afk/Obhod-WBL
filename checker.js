const fs = require('fs');
const https = require('https');
const tls = require('tls');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 40000;     // Увеличено, чтобы парсить ВСЕ источники без остановок
const PARALLEL_LIMIT = 40;     // Оптимальный поток для стабильности TLS и GeoIP запросов
const MAX_PING = 900;          // Тайм-аут проверки доступности (в мс)

// Кэш для гео-данных, чтобы экономить ресурсы
const ipGeoCache = new Map();

// ======================== СТАБИЛЬНЫЙ СПИСОК ЖИВЫХ ИСТОЧНИКОВ ========================
async function discoverSources() {
  console.log("📥 Загрузка проверенной базы репозиториев (Raw-ссылки)...");
  
  const sources = new Set([
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/sub1-white-lists.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/sub2-white-lists.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/BEST-sub3-white-lists.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub1.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub11.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub12.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub13.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub14.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub15.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub2.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub3.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub4.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub5.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/white-sub6.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/all-white-sub.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/all-white-lists-servers.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/best-white-lists-russia.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/russia-white-lists.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-CIDR-RU-checked.txt",
    "https://raw.githubusercontent.com/AvenCores/goida-vpn-configs/refs/heads/main/githubmirror/1.txt",
    "https://raw.githubusercontent.com/dequar/deqwl/refs/heads/main/deray.txt",
    "https://sub.cisvpn.xyz/FFT4xcGGwo8k7e9s",
    "https://raw.githubusercontent.com/v0id9/vpn-configs/refs/heads/main/vpn.txt",
    "https://gist.github.com/lsncococososo-rgb/3bee1c3aa943e0019708292aaa5f5fde/raw/ef3bf5892faa2d01ef98892449b5813c8a5ac487/GRN_VPN",
    "https://vspsub.onrender.com/get/6fkgjw",
    "https://vspsub.onrender.com/get/6auai",
    "https://raw.githubusercontent.com/raponchik/EcstasyVPN/refs/heads/main/ne%20dlya%20prodazhi",
    "https://gitverse.ru/api/repos/vansfenix/vansFenix/raw/branch/master/WildVFmini",
    "https://raw.githubusercontent.com/dmitriistekolnikov/Free_vpns_for_Russ/refs/heads/main/Vip.txt",
    "https://raw.githubusercontent.com/dmitriistekolnikov/Free_vpns_for_Russ/refs/heads/main/YouTube.txt",
    "https://raw.githubusercontent.com/ChkavHalyavaVPN/Chkav-HalyavaVPNUS-vpn-duo/refs/heads/main/vpn.txt",
    "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/afaa5733c4b9d573195cfb2af21030e2cb5c1ae3/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
    "https://base44.app/api/apps/6a142ae2965f19733954fc09/files/mp/public/6a142ae2965f19733954fc09/bd1b875de_subscription.txt",
    "https://gist.githubusercontent.com/j80547013-max/6abf8d9a407a9338ec82fc0754beeb99/raw/01890ab4a2fe739c77f1d45495d30ed80a15ab15/gistfile1.txt",
    "https://yax.nenadoblokirowatgnidda.ru/exec?url=http%3A%2F%2F77.110.104.181%3A5002%2Fsub%2FdGd0ZnRnLDE3ODA1ODc4MTI4fdXFeLwfA",
    "https://vspsub.onrender.com/get/88tzen",
    "https://109.237.98.81:2096/kvn/7qpy5bx22ejc4d5i",
    "https://gist.githubusercontent.com/moksim76/19e5c747b19f9ab4610609bcde01fb3d/raw/5d9ac6883ceb0a9e2e94040defabb8b97c1f317d/XuexVpn%2520Free",
    "https://bostvpn.duckdns.org:2096/YVH2bhbw2324w/i3cau11f8qfx49su",
    "https://vspsub.onrender.com/get/5xxuhj",
    "https://vpn.zotus.ru/sub.php",
    "https://tinyurl.com/WIFISUBAERYX",
    "https://tinyurl.com/SUBLTEAERYX",
    "https://gist.githubusercontent.com/zorka-project/efc486572e465d9fb6698264e9895f59/raw/kuertov-project.txt?nocache=1",
    "https://vspsub.onrender.com/get/n6bhp",
    "https://script.google.com/macros/s/AKfycby6bSt2cNMil43ZIv0sHwXUnEHfMqN2hbjGETfPG1m_iwjkO_ih_yp6pXt-NVc48_6w/exec?url=https://mix-macros.alexanderoff.ru/mixed/@vlessrus/?url=http://65.109.221.193:44321/20260608_114432_vpn.txt",
    "https://raw.githubusercontent.com/Ai123999/5Frid/refs/heads/main/5Frid_Notorgamers",
    "https://yax.nenadoblokirowatgnidda.ru/exec?url=http%3A%2F%2F77.110.104.181%3A5002%2Fsub%2FVGdydXNzaWEsMTc4MTc4OTk1Mw20zr9u72oH",
    "https://kfwl-sub.vercel.app/sub",
    "https://hub.mos.ru/kfwl/sub/raw/main/sub.txt",
    "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt",
    "https://gitverse.ru/api/repos/vansfenix/vansFenix/raw/branch/master/ХЕРЗНАЕТЧО",
    "https://github.com/ksenkovsolo/HardVPN-bypass-WhiteLists-/raw/refs/heads/main/vpn-lte/WHITELIST-ALL.txt",
    "https://raw.githubusercontent.com/modrinthmodification-create/ownedvpn/main/subscription.txt",
    "https://raw.githubusercontent.com/kort0881/vpn-checker-backend/refs/heads/main/checked/RU_Best/ru_white_all_WHITE.txt",
    "https://raw.githubusercontent.com/kort0881/vpn-checker-backend/main/checked/RU_Best/ru_white_all_WHITE.txt",
    "https://raw.githubusercontent.com/Ilyacom4ik/free-v2ray-2026/main/subscriptions/FreeCFGHub1.txt",
    "https://raw.githubusercontent.com/ShadowException/VPN/refs/heads/main/configs/VPN-cat",
    "https://sub.pfvpn.cfd/free/sub",
    "https://raw.githubusercontent.com/flaafix/AetrisVPN-white-list-lite/refs/heads/main/AetrisVPN.txt",
    "https://raw.githubusercontent.com/sch2kw4r/sch2VPN/refs/heads/main/sch2VPN",
    "https://alley.serv00.net/youtube",
    "https://rostunnel.vercel.app/mega.txt",
    "https://raw.githubusercontent.com/luxxuria/harvester/refs/heads/main/non_ru.txt",
    "https://gitflic.ru/project/sigil/my-new-cool-project/blob/raw?file=whitelist",
    "https://raw.githubusercontent.com/AirLinkVPN1/AirLinkVPN/refs/heads/main/rkn_white_list",
    "https://raw.githubusercontent.com/btsk161/Freeinternet_byMygalaru.github.io/refs/heads/main/premium.txt",
    "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/main/configs/ru/vless.txt",
    "https://internet-tenshi.kangel.tech/whitelist2",
    "https://raw.githubusercontent.com/ewecrow78-gif/whitelist1/main/list.txt",
    "https://raw.githubusercontent.com/whoahaow/rjsxrd/refs/heads/main/githubmirror/bypass/bypass-all.txt",
    "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/refs/heads/main/whitelist.txt",
    "https://gist.github.com/DestroyST6767/f4dd6f12e5ba9d04ff8d19db0396e310.txt",
    "https://raw.githubusercontent.com/LimeHi/LimeVPN/refs/heads/main/LimeVPN.txt?v=1",
    "https://mifa.world/turbo",
    "https://titandarkness.mooo.com/UufFgrEom4/first",
    "https://gist.githubusercontent.com/j80547013-max/7fb678a5c5c61b6f7457035ab99924ab/raw/41affa80c57aefdbf6e66cab47896f75d91c9aae/gistfile1.txt",
    "https://sub.accessbyme.com/sub/c6710e96370b4c47bae7a6829d4b2b67?fmt=v2b64",
    "https://raw.githubusercontent.com/prominbro/sub/refs/heads/main/212.txt",
    "https://raw.githubusercontent.com/prominbro/KfWL/refs/heads/main/KfWL.txt",
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/merged.txt",
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/wl.txt",
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/selected.txt",
    "https://happ.dska.su/https://sub.vpnul.codes/tatrDZhHJPj4NwbT",
    "https://raw.githubusercontent.com/po5p/TgBot/main/1c89ecb2_Subscription.txt",
    "https://bosttt.duckdns.org:2096/sfuhiuweon24newf/bbc0y4xy195i4loyefwwe3",
    "https://oplatasite.ru/sub/dXNlcl8xODk1NTYwMTgzLDE3ODE5NjEwNzUGBz7FKJurd",
    "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/f4d140f55fc4831652673693f5fe74fc483b762e/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
    "https://sub.savvka.fun/whitelist",
    "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
    "https://gitverse.ru/api/repos/Catlerok_glasha/catwhiteMIRROR/raw/branch/master/configs.txt",
    "https://gitverse.ru/api/repos/cid-uscoritel/cid-catwhite-uscoritel/raw/branch/master/configs.txt",
    "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile-2.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-SNI-RU-all.txt",
    "https://mifa.world/vmess",
    "https://mifa.world/trojan",
    "https://mifa.world/hysteria", 
    "https://mifa.world/ss",
    "https://free-obwl.vercel.app/configs/configs.txt", 
    "https://mifa.world/vless",
    "https://mifa.world/other"
  ]);

  for (let i = 2; i <= 26; i++) {
    sources.add(`https://raw.githubusercontent.com/AvenCores/goida-vpn-configs/refs/heads/main/githubmirror/${i}.txt`);
  }

  const tgChannels = ['vless_configs', 'free_vless_vpn', 'vpn_reality', 'vless_reality_ru'];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

  return Array.from(sources);
}

// ======================== КОМБИНИРОВАННЫЙ ЭКСТРАКТОР ========================
function extractConfigsFromText(text) {
  const list = [];
  const linkRegex = /(vless|trojan):\/\/[^\s"'<>\`]+/g;
  const linkMatches = text.match(linkRegex) || [];
  linkMatches.forEach(link => list.push(link.trim()));

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

// Извлечение флагов из комментария
function extractFlags(text) {
  if (!text) return '';
  try { text = decodeURIComponent(text); } catch(e) {}
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = text.match(flagRegex);
  return matches ? matches.join('') : '';
}

// Преобразование ISO-кода в эмодзи-флаг
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromPoint(...codePoints);
}

// Перевод IP-строки в число для быстрого сравнения подсетей
function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// ======================== ОБЪЕДИНЕННАЯ ГЕОЛОКАЦИЯ ========================
function getCountryByIp(ip) {
  if (ipGeoCache.has(ip)) return Promise.resolve(ipGeoCache.get(ip));
  
  const ipLong = ipToLong(ip);

  // 1. ЛОКАЛЬНАЯ БАЗА: Моментально ловим самые частые IP-диапазоны ру-серверов
  const ruRanges = [
    { start: '5.101.156.0', end: '5.101.159.255' },
    { start: '31.184.192.0', end: '31.184.255.255' },
    { start: '45.132.196.0', end: '45.132.199.255' },
    { start: '77.82.0.0', end: '77.82.255.255' },
    { start: '80.78.240.0', end: '80.78.255.255' },
    { start: '91.210.204.0', end: '91.210.207.255' },
    { start: '94.25.0.0', end: '94.25.255.255' },
    { start: '109.194.0.0', end: '109.195.255.255' },
    { start: '176.59.0.0', end: '176.60.255.255' },
    { start: '178.176.0.0', end: '178.177.255.255' },
    { start: '185.12.92.0', end: '185.12.95.255' },
    { start: '188.162.0.0', end: '188.163.255.255' },
    { start: '213.87.0.0', end: '213.87.255.255' }
  ];

  for (const r of ruRanges) {
    if (ipLong >= ipToLong(r.start) && ipLong <= ipToLong(r.end)) {
      ipGeoCache.set(ip, '🇷🇺');
      return Promise.resolve('🇷🇺');
    }
  }

  // 2. СЕТЕВОЙ ЗАПРОС (прямой эндпоинт без "demo." для стабильности)
  return new Promise((resolve) => {
    setTimeout(() => {
      const url = `https://ip-api.com/json/${ip}?fields=status,countryCode`;
      
      const req = https.get(url, { timeout: 2000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            if (json.status === 'success' && json.countryCode) {
              const flag = getFlagEmoji(json.countryCode);
              ipGeoCache.set(ip, flag);
              return resolve(flag);
            }
          } catch (e) {}
          resolve('🌐');
        });
      });
      
      req.on('error', () => resolve('🌐'));
      req.on('timeout', () => { req.destroy(); resolve('🌐'); });
    }, Math.random() * 2000); 
  });
}

function fetchTextWithHeaders(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, { headers, timeout: 6000 }, (res) => {
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
  console.log(`🚀 Старт объединенного гибридного чекера...`);
  const dynamicSources = await discoverSources();
  
  const rawConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 

  for (const src of dynamicSources) {
    let text = await fetchTextWithHeaders(src, { 'User-Agent': 'Mozilla/5.0' });
    if (!text) continue;

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

      const serverKey = `${hostOrIp}:${port}:${sni || 'nosni'}`;
      if (seenServers.has(serverKey)) continue;

      // Читаем флаг из комментария (если он там есть)
      let parsedFlag = extractFlags(comment);
      if (parsedFlag && parsedFlag.length > 4) {
        parsedFlag = parsedFlag.substring(0, 4);
      }

      seenUrls.add(line);
      seenServers.add(serverKey); 
      rawConfigs.push({ urlPart, hostOrIp, port, sni, parsedFlag });

      if (rawConfigs.length >= MAX_CONFIGS) break;
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`📥 Извлечено уникальных конфигов: ${rawConfigs.length}. Тестируем скорость и геопозицию...`);

  const liveConfigs = [];
  let index = 0;

  async function worker() {
    while (index < rawConfigs.length) {
      const currentIdx = index++;
      const cfg = rawConfigs[currentIdx];
      if (!cfg) continue;

      const alive = await checkTlsWithPing(cfg.hostOrIp, cfg.port, cfg.sni);
      if (alive) {
        let finalFlag = '🌐';
        const isIp = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cfg.hostOrIp);

        // ИЗМЕНЕНИЕ: Сначала определяем страну по реальному IP-адресу
        if (isIp) {
          finalFlag = await getCountryByIp(cfg.hostOrIp);
        }
        
        // Резервный вариант: если по IP определить не удалось, берем флаг из комментария источника
        if (finalFlag === '🌐' && cfg.parsedFlag) {
          finalFlag = cfg.parsedFlag;
        }

        const currentSni = cfg.sni ? cfg.sni : cfg.hostOrIp;
        const label = `${finalFlag} | ${currentSni} | Obhod WBL`;
        
        liveConfigs.push(`${cfg.urlPart}#${label}`);
      }
    }
  }

  const workers = Array.from({ length: PARALLEL_LIMIT }, worker);
  await Promise.all(workers);

  console.log(`✅ Готово! Проверку прошли: ${liveConfigs.length} серверов.`);
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL Hybrid Cleaner\n#profile-update-interval: 1\n#announce: 👑 Комбинированная база | Живых: ${liveConfigs.length} | ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 configs.txt успешно сохранен!');
}

main();
