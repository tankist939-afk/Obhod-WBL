const fs = require('fs');
const https = require('https');
const tls = require('tls');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 5000;      // Сколько всего конфигов собираем из источников
const PARALLEL_LIMIT = 40;     // Количество одновременных подключений
const MAX_PING = 700;          // Максимальное время ответа в мс (все что медленнее — удаляем)

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
  "https://raw.githubusercontent.com/btsk161/Freeinternet_byMygalaru.github.io/refs/heads/main/premium.txt",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/main/configs/ru/vless.txt",
  "https://internet-tenshi.kangel.tech/whitelist2",
  "https://raw.githubusercontent.com/ewecrow78-gif/whitelist1/main/list.txt",
  "https://raw.githubusercontent.com/whoahaow/rjsxrd/refs/heads/main/githubmirror/bypass/bypass-all.txt",
  "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/refs/heads/main/whitelist.txt",
  "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt",
  "https://gist.github.com/DestroyST6767/f4dd6f12e5ba9d04ff8d19db0396e310.txt",
  "https://raw.githubusercontent.com/LimeHi/LimeVPN/refs/heads/main/LimeVPN.txt?v=1",
  "https://mifa.world/turbo",
  "https://titandarkness.mooo.com/UufFgrEom4/first",
  "https://gist.githubusercontent.com/j80547013-max/7fb678a5c5c61b6f7457035ab99924ab/raw/41affa80c57aefdbf6e66cab47896f75d91c9aae/gistfile1.txt",
  "https://gist.github.com/DestroyST6767/f4dd6f12e5ba9d04ff8d19db0396e310.txt",
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
  "https://gitverse.ru/api/repos/vansfenix/vansFenix/raw/branch/master/WildVFmini",
  "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
  "https://gitverse.ru/api/repos/Catlerok_glasha/catwhiteMIRROR/raw/branch/master/configs.txt",
  "https://gitverse.ru/api/repos/cid-uscoritel/cid-catwhite-uscoritel/raw/branch/master/configs.txt",
  "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-CIDR-RU-checked.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/Vless-Reality-White-Lists-Rus-Mobile-2.txt",
  "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/refs/heads/main/WHITE-SNI-RU-all.txt",
  "https://mifa.world/vmess",
  "https://mifa.world/trojan",
  "https://mifa.world/hysteria", 
  "https://mifa.world/ss",
  "https://free-obwl.vercel.app/configs/configs.txt", 
  "https://mifa.world/vless",
  "https://mifa.world/other",
];

for (let i = 2; i <= 26; i++) {
  ALL_SOURCES.push(`https://raw.githubusercontent.com/AvenCores/goida-vpn-configs/refs/heads/main/githubmirror/${i}.txt`);
}

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

function fetchUrl(url) {
  return new Promise((resolve) => {
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

function checkTlsWithPing(host, port, sni) {
  return new Promise((resolve) => {
    let resolved = false;
    const startTime = Date.now();

    const timeoutTimer = setTimeout(() => {
      cleanup(false);
    }, MAX_PING);

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

async function main() {
  console.log(`🚀 Начинаем сбалансированный сбор конфигов...`);
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
      if (sniMatch) {
        try {
          sni = decodeURIComponent(sniMatch[1]);
        } catch (e) {
          sni = sniMatch[1]; 
        }
      }

      let isGood = false;
      let label = '';
      const flags = extractFlags(comment);

      // Здесь убрали квадратные скобки из строк шаблона
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
        rawConfigs.push({ urlPart, label, sni });
        if (rawConfigs.length >= MAX_CONFIGS) break;
      }
    }
    if (rawConfigs.length >= MAX_CONFIGS) break;
  }

  console.log(`📥 Фильтр пройден: ${rawConfigs.length} шт. Измеряем скорость TLS-ответа...`);

  const liveConfigs = [];
  let index = 0;

  async function worker() {
    while (index < rawConfigs.length) {
      const currentIdx = index++;
      const cfg = rawConfigs[currentIdx];
      if (!cfg) continue;

      let m = cfg.urlPart.match(/@([^:]+):([0-9]+)/);
      if (!m) m = cfg.urlPart.match(/:\/\/([^:]+):([0-9]+)/);
      
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

  console.log(`✅ Чек окончен! Быстрых серверов найдено: ${liveConfigs.length}`);
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: Obhod WBL GitHub\n#profile-update-interval: 6\n#announce: 👑 Оптимизированный чек | Живых: ${liveConfigs.length} | UTC: ${timestamp}\n\n`;
  
  fs.writeFileSync('configs.txt', header + liveConfigs.join('\n'));
  console.log('💾 Файл configs.txt успешно сохранен!');
}

main();
