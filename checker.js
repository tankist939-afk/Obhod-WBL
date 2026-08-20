const fs = require('fs');
const https = require('https');
const http = require('http');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 100000;        
const SOURCE_PARALLEL_LIMIT = 25; 
const SOURCE_TIMEOUT = 8000;       

// ======================== СЛОВАРИ ФЛАГОВ ========================
const URL_FLAG_MAP = {
  '%F0%9F%87%BA%F0%9F%87%B8': '🇺🇸',
  '%F0%9F%87%AC%F0%9F%87%A7': '🇬🇧',
  '%F0%9F%87%A9%F0%9F%87%AA': '🇩🇪',
  '%F0%9F%87%AB%F0%9F%87%B7': '🇫🇷',
  '%F0%9F%87%AB%F0%9F%87%AE': '🇫🇮',
  '%F0%9F%87%B3%F0%9F%87%B1': '🇳🇱',
  '%F0%9F%87%B7%F0%9F%87%BA': '🇷🇺',
  '%F0%9F%87%A8%F0%9F%87%B3': '🇨🇳'
};

const TEXT_COUNTRY_MAP = {
  'us': '🇺🇸', 'usa': '🇺🇸', 
  'uk': '🇬🇧', 'gb': '🇬🇧', 
  'de': '🇩🇪', 'ger': '🇩🇪', 
  'fr': '🇫🇷', 
  'fi': '🇫🇮', 
  'nl': '🇳🇱', 'neth': '🇳🇱', 
  'ru': '🇷🇺', 'rus': '🇷🇺', 
  'cn': '🇨🇳'
};

// ======================== БЕЛЫЕ СПИСКИ ========================
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

// ======================== УТИЛИТЫ ========================
function ipToLong(ip) {
  return ip.split('.').reduce((long, octet) => (long << 8) + parseInt(octet, 10), 0) >>> 0;
}

const PARSED_CIDRS = ALLOWED_CIDRS.map(cidr => {
  const [subnet, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  return { ip: ipToLong(subnet), mask };
});

function normalizeToRawUrl(url) {
  try {
    let u = new URL(url);
    if (u.hostname === 'github.com' && !u.pathname.includes('/raw/')) {
      u.hostname = 'raw.githubusercontent.com';
      u.pathname = u.pathname.replace('/blob/', '/');
      return u.toString();
    }
    if (u.hostname === 'gitverse.ru' && u.pathname.includes('/blob/')) {
      u.pathname = u.pathname.replace('/blob/', '/raw/');
      return u.toString();
    }
    if (u.hostname === 'codeberg.org' && u.pathname.includes('/src/')) {
      u.pathname = u.pathname.replace('/src/', '/raw/');
      return u.toString();
    }
  } catch (e) {}
  return url;
}

function extractFlag(rawLine, sni, comment) {
  for (const [encoded, flag] of Object.entries(URL_FLAG_MAP)) {
    if (rawLine.includes(encoded)) return flag;
  }
  const emojiFlagMatch = comment.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  if (emojiFlagMatch) return emojiFlagMatch[0];
  const combinedText = `${comment} ${sni}`.toLowerCase();
  const tokens = combinedText.split(/[^a-z0-9]+/);
  for (const token of tokens) {
    if (TEXT_COUNTRY_MAP[token]) return TEXT_COUNTRY_MAP[token];
  }
  return '🌐';
}

function discoverSources() {
  const sources = [
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/selected.txt",
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/wl.txt",
    "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/merged.txt",
    "https://raw.githubusercontent.com/arhivedxx7/Keyfreetee/refs/heads/main/RKPdee",
    "https://baronnnn.online/exec?url=http%3A%2F%2F77.110.104.181%3A5002%2Fsub%2FUnVUZywxNzg1MjExMzA41gFLhEIf7k",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeOCh1eOFo0eb1FAfxPZ1iNjq2DaSyibM0BiX7aFVQPOCr5TB6YStAUugDUSZmeIq6gMGqXu8WlLO16GqFe7IQCw%3D",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=cinZa8HatBaIVylElsc%2B0p2hqFgHs2NUsg9TXUIpDoVqMBmTu9cR8EJaKVX4oYKMMVESrt4jkAhDg/R7lNWc%2BQ%3D%3D",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeArtpaVCD9oExsYZPNhmu0V5X02YvaoSzkj%2B0XFqb%2BehYP7alm1UAjMJFfmCuVVbBaqcHQKcft6YIsKkSxQU40w%3D",
    "https://gist.githubusercontent.com/SoloRepozSF/7810f115b912e7640a11809863045755/raw/SANTA",
    "https://vpn.zotus.ru/sub.php",
    "https://tri.su/nNo2N",
    "https://raw.githubusercontent.com/s0ulcoil/rkvpn/refs/heads/main/randomkeys",
    "https://happ.ring-team.ru/sub/bxj50ed5wy",
    "https://p.kfwl.lol/os=ios/h=SCAM.SANTA.LUCHIY/https://link.flagman.click/sub/wWJsbBP7eAxpu2JZkaDVeFM-1",
    "https://tri.su/mjDpk",
    "https://bit.ly/4wQPqhD",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=doAHy/WJZeWcvNQ8P56Ye8epNH09xsBGW3IrmLVHX5eU3idtXuBJja8PKmot6GZBIuFPpshS5WhjLvzQwL%2B/L8xkwszrQwCnYnPMx1Dn2rDHQXTJL%2BP4BJPUP4NpuT0K",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=/dAOgZdLKsAWDwgXttns1xvug62mm5gBfGiXXA0jfMf/50mh1EKdKPn/oulAhbtPZHSy/dKHMy3dupLH9qgt0Q%3D%3D",
    "https://tinyurl.com/LTEapple",
    "https://gist.githubusercontent.com/LIKE-FURRY/5faa3fe21cad35b38ceeac729722fee5/raw/bc0ac4b6e578b0ace54480ef40668bc79ac69778/JsonVvless",
    "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/c1804c102de504bbc4034d9752579b77398f371d/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
    "https://hub.mos.ru/kfwl/subsidia/raw/main/all",
    "https://happ.ring-team.ru/sub/xm1w9dua83",
    "https://happ.ring-team.ru/sub/scb3faxa5f",
    "https://cdn.statically.io/gh/kama55726/KomaryServers/main/KomaryServ",
    "https://cdn.jsdelivr.net/gh/kama55726/KomaryServers@main/KomaryServ",
    "https://happ.ring-team.ru/sub/3r08ng7oni",
    "https://raw.githubusercontent.com/yarikdron01-beep/Key-for-vpnFR/refs/heads/main/Key%20for%20S-WIFI",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=VDH4N81qj/PUjkVvXwahEFfEiyNlFCWkMvnGuGtOpnaBMt1X2coAF2U34j9/zcxb4xpSv0a77Q72n8Gx8zESHg%3D%3D",
    "https://v2hub.link/sub/YsXLqYidStCe4_u-6KDkYXX9Mn4vSj-k4Z350Qg-Fo8",
    "https://clck.ru/3UgVmf",
    "https://raw.githubusercontent.com/LimeHi/LimeVPN/refs/heads/main/LimeVPN.txt",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFCHEKER",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFMINI",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFSTANDART",
    "https://sub.shadow-net.site/JCagv3nBd1huQ92w",
    "https://vpnsvpns.github.io/Prihs/mifa.json",
    "https://vpnsvpns.github.io/Prihs/white.json",
    "https://sub.aska.lol/free",
    "https://raw.githubusercontent.com/amintengizbaev2013-a11y/https-t.me-Happkeo/b7fe6f4281edae621c4c16e0945bbf0e9e674bc9/keys_Made_by_ovi_god.txt",
    "https://raw.githubusercontent.com/SoloRepozSF/Key-for-vpn/refs/heads/main/MAIRAM%20VIP",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=rlHeaQoEBpzko1BDE8na0jsF5BftJauoGPblqn7gZQaXDFrbZIc8ricjyrjJri9Y6GYOnDO/fBFA7YiRUkY2kM/pyn7Wat2CYgCa66mKvss%3D",
    "https://my-vpn.click/subscriptions/cVMejXH4BaM99cd0Iz-ffA.txt",
    "https://happ.ring-team.ru/sub/5brp3tolpz",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=KpDaOrHG/RBjTsFgKHtxQ8bWPs%2BPvU98gu2NoGFrpFJPAtpXKv%2BYhO1aMOLQFAbr9CpU/xpwCVsH%2BAfspVlkUleMEAjPesythZMYN7lTex4%3D",
    "https://happ.ring-team.ru/sub/vcty2nazgk",
    "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
    "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
    "https://gitverse.ru/api/repos/cid-uskoritel/cid-catwhite-uskoritel/raw/branch/master/configs.txt",
    "https://gitverse.ru/api/repos/Catlerok_glasha/catwhiteMIRROR/raw/branch/master/configs.txt",
    "https://gist.githubusercontent.com/LIKE-FURRY/adb315d93aa5c5bfbbe27fdfb5b30fba/raw/9d3025dc2d248f3aa866d73cf9f53d91ca42ffde/XUYN%25D0%25AF-NA-5-DNEY",
    "https://gist.githubusercontent.com/LIKE-FURRY/b6320e3f6d1bcf981db1c22ff575d4be/raw/a212dadbc9583653750bd906907325cee465a1e9/@scanwebsite-SLIVAET-BEZ-OTMETKN-K-BAMBUK-VPN",
    "https://kosmos.tunnelguard.ru/link.php?client_id=cbce1c81-27b4-4579-89ec-bf4678d70b29",
    "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/079197659fbcf476f938e0228258153daca824ad/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
    "https://obwl.vercel.app/configs/obchl.txt",
    "https://obwl.vercel.app/configs/premium.txt",
    "https://obwl.vercel.app/configs/selected.txt",
    "https://obwl.vercel.app/configs/configs.txt",
    "https://free-obwl.vercel.app/configs/configs.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/all-white-sub.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/all-white-lists-servers.txt",
    "https://raw.githubusercontent.com/SER38Off/happ-subscription/refs/heads/main/best-white-lists-russia.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-CIDR-RU-checked.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile.txt",
    "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-SNI-RU-all.txt",
    "https://raw.githubusercontent.com/dequar/deqwl/refs/heads/main/deray.txt",
    "https://raw.githubusercontent.com/v0id9/vpn-configs/refs/heads/main/vpn.txt",
    "https://raw.githubusercontent.com/AirLinkVPN1/AirLinkVPN/refs/heads/main/rkn_white_list",
    "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/refs/heads/main/whitelist.txt",
    "https://raw.githubusercontent.com/prominbro/sub/refs/heads/main/212.txt",
    "https://raw.githubusercontent.com/prominbro/KfWL/refs/heads/main/KfWL.txt",
    "https://mifa.world/vless",
    "https://mifa.world/turbo",
    "https://hub.mos.ru/kfwl/sub/raw/main/sub.txt",
    "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt"
  ];
  return Array.from(new Set(sources)).map(normalizeToRawUrl);
}

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

function extractConfigsFromText(text) {
  const list = [];
  if (!text) return list;
  if (!text.includes('vless://') && !text.includes('trojan://')) {
    try {
      const decoded = Buffer.from(text.trim(), 'base64').toString('utf-8');
      if (decoded.includes('vless://') || decoded.includes('trojan://')) text = decoded;
    } catch (e) {}
  }
  const linkRegex = /(vless|trojan):\/\/[^\s"'<>\`\\]+/g;
  const linkMatches = text.match(linkRegex) || [];
  linkMatches.forEach(link => list.push(link.trim()));
  return list;
}

function fetchTextWithHeaders(url) {
  return new Promise((resolve) => {
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (e) { return resolve(''); }
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36', 'Accept': '*/*' };
    let req = lib.get(url, { headers, timeout: SOURCE_TIMEOUT }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) redirectUrl = new URL(redirectUrl, url).toString();
        return resolve(fetchTextWithHeaders(redirectUrl));
      }
      if (res.statusCode !== 200) return resolve('');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

async function fetchAllSourcesParallel(sources) {
  console.log(`📥 Скачивание ${sources.length} источников...`);
  const results = [];
  let index = 0;
  async function sourceWorker() {
    while (index < sources.length) {
      const currentUrl = sources[index++];
      const text = await fetchTextWithHeaders(currentUrl);
      if (text) results.push(text);
    }
  }
  const workers = Array.from({ length: Math.min(SOURCE_PARALLEL_LIMIT, sources.length) }, sourceWorker);
  await Promise.all(workers);
  return results;
}

// ======================== ГЛАВНЫЙ ПРОЦЕСС ========================
async function main() {
  console.time("⏱️ Общее время выполнения");
  console.log(`🚀 Запуск фильтратора источников...`);
  
  const sources = discoverSources();
  const rawTexts = await fetchAllSourcesParallel(sources);
  
  const finalConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 
  let totalExtracted = 0;
  let rejectedByFilters = 0;

  console.log("⚙️ Парсинг, фильтрация по SNI/CIDR и дедупликация...");

  for (const text of rawTexts) {
    if (finalConfigs.length >= MAX_CONFIGS) break;
    const matches = extractConfigsFromText(text);
    
    for (let line of matches) {
      if (finalConfigs.length >= MAX_CONFIGS) break;
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

      if (!isSniAllowed(sni) && !isIpInCidr(hostOrIp)) {
        rejectedByFilters++;
        continue; 
      }

      const serverKey = `${hostOrIp}:${port}:${sni || 'nosni'}`;
      if (seenServers.has(serverKey)) continue;

      seenUrls.add(line);
      seenServers.add(serverKey);

      // Формирование итогового имени с флагом
      const currentSni = sni ? sni : hostOrIp;
      const flag = extractFlag(line, sni, comment);
      const label = `${flag} Obhod WBL | ${currentSni}`;
      
      finalConfigs.push(`${urlPart}#${label}`);
    }
  }

  console.log(`\n📊 Найдено сырых конфигураций: ${totalExtracted}`);
  console.log(`✂️ Отсеяно фильтрами: ${rejectedByFilters}`);
  console.log(`✅ Итого добавлено: ${finalConfigs.length}`);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL Filtered\n#profile-update-interval: 1\n#announce: 👑 База прокси WBL | Всего: ${finalConfigs.length} | ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + finalConfigs.join('\n'));
  console.log('💾 Результат успешно сохранен в configs.txt!');
  console.timeEnd("⏱️ Общее время выполнения");
}

main();
