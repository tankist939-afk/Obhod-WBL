const fs = require('fs');
const https = require('https');
const http = require('http');
const tls = require('tls');
const geoip = require('geoip-lite'); 

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 60000;     
const PARALLEL_LIMIT = 1000;   // Скорость проверки прокси
const SOURCE_PARALLEL_LIMIT = 15; // Параллельность скачивания ИСТОЧНИКОВ
const MAX_PING = 700;          // Таймаут для проверки прокси (мс)
const SOURCE_TIMEOUT = 3500;   // Жесткий таймаут для скачивания одного источника (мс)

// Настройка системного агента Node.js
https.globalAgent.maxSockets = PARALLEL_LIMIT + 100;
https.globalAgent.keepAlive = true;

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

// ======================== ИСТОЧНИКИ (ОЧИЩЕННЫЙ СПИСОК) ========================
async function discoverSources() {
  const sources = new Set([
    "https://bit.ly/4wQPqhD",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=doAHy/WJZeWcvNQ8P56Ye8epNH09xsBGW3IrmLVHX5eU3idtXuBJja8PKmot6GZBIuFPpshS5WhjLvzQwL%2B/L8xkwszrQwCnYnPMx1Dn2rDHQXTJL%2BP4BJPUP4NpuT0K",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=/dAOgZdLKsAWDwgXttns1xvug62mm5gBfGiXXA0jfMf/50mh1EKdKPn/oulAhbtPZHSy/dKHMy3dupLH9qgt0Q%3D%3D",
    "https://tinyurl.com/LTEapple",
    "https://gist.githubusercontent.com/LIKE-FURRY/5faa3fe21cad35b38ceeac729722fee5/raw/bc0ac4b6e578b0ace54480ef40668bc79ac69778/JsonVvless",
    "https://p.kfwl.lol/os=android/h=CB522960-E2A9-7A19-12CB-FD12FEC71E19/https://happ.dska.su/https://vip-get.ru/subscriptions/NjBmOWJiMzMtNmM0OC00MWYzLThkMGQtNDIwZjgzYmMzMjYx?h=CB522960-E2A9-7A19-12CB-FD12FEC71E19",
    "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/c1804c102de504bbc4034d9752579b77398f371d/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
    "https://hub.mos.ru/kfwl/subsidia/raw/main/all",
    "https://raw.githubusercontent.com/s0ulcoil/rkvpn/refs/heads/main/randomkeys",
    "https://happ.ring-team.ru/sub/xm1w9dua83",
    "https://happ.ring-team.ru/sub/scb3faxa5f",
    "https://cdn.statically.io/gh/kama55726/KomaryServers/main/KomaryServ",
    "https://cdn.jsdelivr.net/gh/kama55726/KomaryServers@main/KomaryServ",
    "https://happ.ring-team.ru/sub/3r08ng7oni",
    "https://vedavpn-bot.onrender.com/sub",
    "https://shops.monopoliwers.ir/sub/djMsMTA3NDUsMTc4MzA4MTU2NA09c323826f",
    "https://happ.dska.su/https://sub.fast-cone.com/d6b433f5ae74f4bbaaf14cd843473c34",
    "https://raw.githubusercontent.com/amintengizbaev2013-a11y/https-t.me-Happkeo/refs/heads/main/%D0%9C%D0%90%D0%98%D0%A0%D0%90%D0%9C%20%D0%92%D0%B8%D0%9F.txt",
    "https://raw.githubusercontent.com/yarikdron01-beep/Key-for-vpnFR/refs/heads/main/Key%20for%20S-WIFI",
    "https://happ.dska.su/https://pay.noesissite.ru/sub/N4fxNw9pI5fYzdHJ-Er5RrhDiHj8efvL",
    "https://happ.dska.su/https://sub.clear-vpn.org/RF9EeSYJm8SnQ6p-",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=VDH4N81qj/PUjkVvXwahEFfEiyNlFCWkMvnGuGtOpnaBMt1X2coAF2U34j9/zcxb4xpSv0a77Q72n8Gx8zESHg%3D%3D",
    "https://v2hub.link/sub/YsXLqYidStCe4_u-6KDkYXX9Mn4vSj-k4Z350Qg-Fo8",
    "https://clck.ru/3UgVmf",
    "https://happ.dska.su/https://xray.abvpn.ru/vless/218fd696-e3a2-4c33-b397-a5f13a82969e/5565842392.json",
    "https://happ.dska.su/https://bsdvpn.ru/ZT3R9l_2OsAWZp7t0lZpaPx4MBZz9Q",
    "https://raw.githubusercontent.com/SoloRepozSF/Key-for-vpn/refs/heads/main/ALL%20VPN%20SLIV",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFROBOT",
    "https://raw.githubusercontent.com/LimeHi/LimeVPN/refs/heads/main/LimeVPN.txt",
    "https://happ.dska.su/https://sub.port-server.online/RD-kJbufwzPLDxaF",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFCHEKER",
    "https://happ.dska.su/https://sub.leadnode.net/api/v1/subscription/PSLgrSFakL_xwJtvGMMccd5vCd7CYLbm33_1lucAJ3I/b399d71a-51eb-4df3-837f-696883e500db",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFMINI",
    "https://hub.mos.ru/nfajih/wildvf/-/raw/main/WVFSTANDART",
    "https://sub.shadow-net.site/JCagv3nBd1huQ92w",
    "https://potyjnovpn.apruxdomain.store/sub/owrmx3jp6zsqlccg",
    "https://happ.dska.su/https://sub.extravpn.net/WoqmWDbuJDSnSMSM?h=02ED9BD1-F82A-3F5B-970C-9A6F2CC9741D",
    "https://vpnsvpns.github.io/Prihs/mifa.json",
    "https://happ.dska.su/https://prostovpn.website/profile/462d82fc-51e0-4f49-bcc9-9aa3591b07d4",
    "https://raw.githubusercontent.com/VSd223/vpn/refs/heads/main/vpn",
    "https://happ.dska.su/https://K7E7hFxm5qmoNWFT.mxm-vpn.com/",
    "https://vpnsvpns.github.io/Prihs/white.json",
    "https://sub.unlimitedteam.space/opFLVrd_M0Zmk8uB",
    "https://happ.dska.su/https://sub.updatesvpn.ru/api/sub/jeSzJkmRxAv4KnrP",
    "https://sub.aska.lol/free",
    "https://rtp.panel.moe:2096/sub/ez6zq6yrn7z47j64",
    "https://happ.dska.su/https://sub.netfix.app/HWJCypsq3Bk8PG9R",
    "https://sub.ogi-s.com/sub/yCRNucgWmJBeU9D4",
    "https://raw.githubusercontent.com/amintengizbaev2013-a11y/https-t.me-Happkeo/b7fe6f4281edae621c4c16e0945bbf0e9e674bc9/keys_Made_by_ovi_god.txt",
    "https://raw.githubusercontent.com/SoloRepozSF/Key-for-vpn/refs/heads/main/MAIRAM%20VIP",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=rlHeaQoEBpzko1BDE8na0jsF5BftJauoGPblqn7gZQaXDFrbZIc8ricjyrjJri9Y6GYOnDO/fBFA7YiRUkY2kM/pyn7Wat2CYgCa66mKvss%3D",
    "https://happ.dska.su/https://sp.vpnlider.online/4axqTu0edFeftwwn",
    "https://my-vpn.click/subscriptions/cVMejXH4BaM99cd0Iz-ffA.txt",
    "https://raw.githubusercontent.com/ravvpnshopbot-bit/RVVPN.txt/refs/heads/main/RAVVPN2",
    "https://happ.ring-team.ru/sub/5brp3tolpz",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=KpDaOrHG/RBjTsFgKHtxQ8bWPs%2BPvU98gu2NoGFrpFJPAtpXKv%2BYhO1aMOLQFAbr9CpU/xpwCVsH%2BAfspVlkUleMEAjPesythZMYN7lTex4%3D",
    "https://happ.dska.su/https://key.prosvet.best/sub?token=r6zK7IKXaU6kGGXNrAEnRngADKmG-ixJXOmkCgoBB9CeE3wHYmUmIIgk6-3IW3RH1z389j2hiEjEKrGN2qWNG8kG44IY5t8UtXQ2rgJpzmA",
    "https://happ.ring-team.ru/sub/vcty2nazgk",
    "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
    "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
    "https://gitverse.ru/api/repos/cid-uskoritel/cid-catwhite-uskoritel/raw/branch/master/configs.txt",
    "https://gitverse.ru/api/repos/Catlerok_glasha/catwhiteMIRROR/raw/branch/master/configs.txt",
    "https://gist.githubusercontent.com/LIKE-FURRY/adb315d93aa5c5bfbbe27fdfb5b30fba/raw/9d3025dc2d248f3aa866d73cf9f53d91ca42ffde/XUYN%25D0%25AF-NA-5-DNEY",
    "https://gist.githubusercontent.com/LIKE-FURRY/b6320e3f6d1bcf981db1c22ff575d4be/raw/a212dadbc9583653750bd906907325cee465a1e9/@scanwebsite-SLIVAET-BEZ-OTMETKN-K-BAMBUK-VPN",
    "https://sub.vibesignal.space/BvPJMEfET7o2SbT_",
    "https://happ.dska.su/https://auth.easy-api.live/W5pofaK8qrZ1ARDz?h=CB522960-E2A9-7A19-12CB-FD12FEC71E19",
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
    "https://raw.githubusercontent.com/dmitriistekolnikov/Free_vpns_for_Russ/refs/heads/main/Vip.txt",
    "https://raw.githubusercontent.com/AirLinkVPN1/AirLinkVPN/refs/heads/main/rkn_white_list",
    "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/refs/heads/main/whitelist.txt",
    "https://raw.githubusercontent.com/prominbro/sub/refs/heads/main/212.txt",
    "https://raw.githubusercontent.com/prominbro/KfWL/refs/heads/main/KfWL.txt",
    "https://sub.savvka.fun/whitelist",
    "https://mifa.world/vless",
    "https://mifa.world/turbo",
    "https://hub.mos.ru/kfwl/sub/raw/main/sub.txt",
    "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt"
  ]);

  // Конкретные Telegram-каналы
  const tgChannels = ['vless_configs', 'free_vless_vpn', 'vpn_reality', 'vless_reality_ru'];
  for (const channel of tgChannels) {
    sources.add(`https://t.me/s/${channel}`);
  }

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

// ======================== ЭКСТРАКТОР КРАФТОВЫХ И ТГ ТЕКСТОВ ========================
function extractConfigsFromText(text) {
  const list = [];
  if (!text) return list;

  if (text.includes('class="tgme_channel_info"') || text.includes('</html')) {
    const hrefRegex = /href="((?:vless|trojan):\/\/[^"]+)"/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(text)) !== null) {
      list.push(hrefMatch[1]);
    }
    text = text.replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
  }

  const linkRegex = /(vless|trojan):\/\/[^\s"'<>\`\\]+/g;
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

function extractFlags(text) {
  if (!text) return '';
  try { text = decodeURIComponent(text); } catch(e) {}
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = text.match(flagRegex);
  return matches ? matches.join('') : '';
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getCountryByIpLocal(ip) {
  const geo = geoip.lookup(ip);
  if (geo && geo.country) return getFlagEmoji(geo.country);
  return '🌐';
}

// Быстрое асинхронное скачивание с таймаутом
function fetchTextWithHeaders(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    };

    let req = lib.get(url, { headers, timeout: SOURCE_TIMEOUT }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return resolve(fetchTextWithHeaders(res.headers.location));
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

// Параллельный пул загрузки файлов
async function fetchAllSourcesParallel(sources) {
  console.log(`📥 Параллельное скачивание ${sources.length} источников (лимит: ${SOURCE_PARALLEL_LIMIT} потоков)...`);
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

// ======================== TLS ТЕСТ С РОТАЦИЕЙ ========================
function checkTlsWithPing(host, port, sni) {
  return new Promise((resolve) => {
    let resolved = false;
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
      socket = tls.connect(options, () => cleanup(true));
    } catch (e) { return cleanup(false); }

    function cleanup(result) {
      if (!resolved) {
        resolved = true;
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
  console.time("⏱️ Общее время выполнения");
  console.log(`🚀 Старт ультра-быстрого чекера...`);
  
  const dynamicSources = await discoverSources();
  const rawTexts = await fetchAllSourcesParallel(dynamicSources);
  
  const rawConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 

  let totalExtracted = 0;
  let rejectedByFilters = 0;

  console.log("⚙️ Парсинг и мгновенная дедупликация...");

  // Быстрая параллельная сборка из скачанных ответов
  for (const text of rawTexts) {
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

  console.log(`\n📊 Извлечено уникальных ссылок: ${totalExtracted}`);
  console.log(`✂️ Отсеяно фильтрами (не БС SNI/CIDR): ${rejectedByFilters}`);
  console.log(`📥 Запуск высокоскоростного теста (${PARALLEL_LIMIT} потоков)...`);

  const liveConfigs = [];
  let index = 0;

  // Асинхронные воркеры чекера
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
  console.timeEnd("⏱️ Общее время выполнения");
}

main();
