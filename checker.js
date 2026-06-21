const fs = require('fs');
const https = require('https'); // <-- ИСПРАВЛЕНО: используем https вместо http

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 5000;      // Сколько всего конфигов собираем из источников
const PARALLEL_LIMIT = 50;     // Сколько прокси проверять ОДНОВРЕМЕННО (потоки)
const TIMEOUT = 800;           // Таймаут проверки порта в миллисекундах

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

const ALL_SOURCES = [
  "https://gitverse.ru/api/repos/cid-uscoritel/cid-catwhite-uscoritel/raw/branch/master/configs.txt",
  "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-CIDR-RU-checked.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile-2.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-SNI-RU-all.txt",
  "https://mifa.world/vmess", "https://mifa.world/trojan", "https://mifa.world/hysteria", "https://mifa.world/ss",
  "https://free-obwl.vercel.app/configs/configs.txt", "https://mifa.world/vless", "https://mifa.world/other",
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
  "https://raw.githubusercontent.com/AvenCores/goida-vpn-configs/refs/heads/main/githubmirror/1.txt",
  "https://raw.githubusercontent.com/dequar/deqwl/refs/heads/main/deray.txt",
  "https://sub.cisvpn.xyz/FFT4xcGGwo8k7e9s",
  "https://raw.githubusercontent.com/v0id9/vpn-configs/refs/heads/main/vpn.txt",
  "https://gist.github.com/lsncococososo-rgb/3bee1c3aa943e0019708292aaa5f5fde/raw/ef3bf5892faa2d01ef98892449b5813c8a5ac487/GRN_VPN",
  "https://vspsub.onrender.com/get/6fkgjw", "https://vspsub.onrender.com/get/6auai",
  "https://raw.githubusercontent.com/raponchik/EcstasyVPN/refs/heads/main/ne%20dlya%20prodazhi",
  "https://gitverse.ru/api/repos/vansfenix/vansFenix/raw/branch/master/WildVFmini",
  "https://raw.githubusercontent.com/dmitriistekolnikov/Free_vpns_for_Russ/refs/heads/main/Vip.txt",
  "https://raw.githubusercontent.com/dmitriistekolnikov/Free_vpns_for_Russ/refs/heads/main/YouTube.txt",
  "https://raw.githubusercontent.com/ChkavHalyavaVPN/Chkav-HalyavaVPNUS-vpn-duo/refs/heads/main/vpn.txt",
  "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/afaa5733c4b9d573195cfb2af21030e2cb5c1ae3/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
  "https://base44.app/api/apps/6a142ae2965f19733954fc09/files/mp/public/6a142ae2965f19733954fc09/bd1b875de_subscription.txt",
  "https://gist.githubusercontent.com/j80547013-max/6abf8d9a407a9338ec82fc0754beeb99/raw/01890ab4a2fe739c77f1d45495d30ed80a15ab15/gistfile1.txt",
  "https://yax.nenadoblokirowatgnidda.ru/exec?url=http%3A%2F%2F77.110.104.181%3A5002%2Fsub%2FdGd0ZnRnLDE3ODA1ODc4MTI4fdXFeLwfA",
  "https://vspsub.onrender.com/get/88tzen", "https://109.237.98.81:2096/kvn/7qpy5bx22ejc4d5i",
  "https://gist.githubusercontent.com/moksim76/19e5c747b19f9ab4610609bcde01fb3d/raw/5d9ac6883ceb0a9e2e94040defabb8b97c1f317d/XuexVpn%2520Free",
  "https://bostvpn.duckdns.org:2096/YVH2bhbw2324w/i3cau11f8qfx49su",
  "https://vspsub.onrender.com/get/5xxuhj", "https://vpn.zotus.ru/sub.php",
  "https://tinyurl.com/WIFISUBAERYX", "https://tinyurl.com/SUBLTEAERYX",
  "https://gist.githubusercontent.com/zorka-project/efc486572e465d9fb6698264e9895f59/raw/kuertov-project.txt?nocache=1",
  "https://vspsub.onrender.com/get/n6bhp"
];

for (let i = 2; i <= 26; i++) {
  ALL_SOURCES.push(`https://raw.githubusercontent.com/AvenCores/goida-vpn-configs/refs/heads/main/githubmirror/${i}.txt`);
}

// Помощники парсинга
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

// Быстрый асинхронный HTTPS-запрос (скачивание списков)
function fetchUrl(url) {
  return new Promise((resolve) => {
    // ИСПРАВЛЕНО: Теперь вызывается https.get вместо http.get
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      if (res.statusCode !== 200) return resolve('');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

// Сетевой параллельный чекер портов
function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = require('net').createConnection({
      host: host,
      port: parseInt(port, 10),
      timeout: TIMEOUT
    });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', (err) => {
      socket.destroy();
      if (err.message.includes('ECONNREFUSED') || err.message.includes('RESET')) resolve(true);
      else resolve(false);
    });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function main() {
  console.log(`🚀 Начинаем сбор конфигов со всех источников...`);
  const rawConfigs = [];
  const seenUrls = new Set();

  for (const src of ALL_SOURCES) {
    const text = await fetchUrl(src);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    
    for (let line of lines) {
      line = line.trim();
      if (!line || seenUrls.has(line)) continue;
      if (!line.startsWith('vless://') && !line.startsWith('trojan://')) continue;

      let urlPart = line, comment = '';
      const hIdx = line.indexOf('#');
      if (hIdx !== -1) {
        urlPart = line.substring(0, hIdx).trim();
        comment = line.substring(hIdx + 1).trim();
      }

      let sni = '';
      const sniMatch = line.match(/[?&]sni=([^&]+)/);
      if (sniMatch) sni = decodeURIComponent(sniMatch[1]);

      let isGood = false;
      let label = '🌐 Proxy';

      if (sni && isWhitelistedSNI(sni)) {
        isGood = true;
        label = `🇷🇺 SNI: ${sni}`;
      } else {
        const ip = extractIP(urlPart);
        if (ip && isWhitelistedIP(ip)) {
          isGood = true;
          label = `🇷🇺 CIDR IP: ${ip}`;
        }
      }

      if (isGood) {
        seenUrls.add(line);
        rawConfigs.push({ urlPart, label });
        if (rawConfigs.length >= MAX_CONFIGS) break;
      }
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`📥 Собрано подходящих по фильтрам: ${rawConfigs.length} шт. Начинаем многопоточный чек...`);

  const liveConfigs = [];
  // Параллельный перебор пулом
  for (let i = 0; i < rawConfigs.length; i += PARALLEL_LIMIT) {
    const chunk = rawConfigs.slice(i, i + PARALLEL_LIMIT);
    await Promise.all(chunk.map(async (cfg) => {
      let m = cfg.urlPart.match(/@([^:]+):([0-9]+)/);
      if (!m) m = cfg.urlPart.match(/:\/\/([^:]+):([0-9]+)/);
      if (m) {
        const alive = await checkPort(m[1], m[2]);
        if (alive) liveConfigs.push(`${cfg.urlPart}#${cfg.label} | Checked`);
      }
    }));
  }

  console.log(`✅ Чек окончен! Живых найдено: ${liveConfigs.length}`);
  
  // Формируем файл подписки
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL GitHub\n#profile-update-interval: 6\n#announce: 👑 Живых прокси: ${liveConfigs.length} | Обновлено: ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 Файл configs.txt успешно сохранен!');
}

main();
