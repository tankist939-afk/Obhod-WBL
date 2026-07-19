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

// ======================== ИСТОЧНИКИ ========================
async function discoverSources() {
  console.log("📥 Загрузка проверенной базы репозиториев...");
  
  const sources = new Set([
    "https://obwl.vercel.app/configs/obchl.txt",
    "https://obwl.vercel.app/configs/premium.txt",
    "https://obwl.vercel.app/configs/selected.txt",
    "https://obwl.vercel.app/configs/configs.txt",
    "https://clck.ru/3UqEAw",
    "https://gist.githubusercontent.com/yoontae-bit/eeb4d9bd9fa3c46b695c0bf96ef0acba/raw/662f57795d03a00bca9cf81785144d1bb37565a1/gistfile1.txt",
    "https://happ.ring-team.ru/sub/vqvmsfgqoz",
    "https://tinyurl.com/Simvo",
    "https://happ.ring-team.ru/sub/b5lkwk1u9b",
    "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeArtpaVCD9oExsYZPNhmu0V5X02YvaoSzkj%2B0XFqb%2BehYP7alm1UAjMJFfmCuVVbBaqcHQKcft6YIsKkSxQU40w%3D",
    "https://gist.githubusercontent.com/sevushyamamoto-stack/17bd65436db9cccddc55ef376e70cd7a/raw/fe6f77c72aa75b7364e5d2bdc008ef22b4cb16e9/gistfile1.txt",
    "https://gist.githubusercontent.com/StandofferSuper191/751c6d0ff9dd97d3359912337610541a/raw/gistfile1.txt",
    "https://happ.ring-team.ru/sub/pm4rww14j",
    "https://bit.ly/bearvpnmedved",
    "https://happ.dska.su/https://s.kfwl.lol/FURRY-VPN-SUPER-PRO?h=CB522960-E2A9-7A19-12CB-FD12FEC71E19",
    "https://v2hub.link/sub/paa25KyvMcHy4REahmGIjB8BTfd4H5eHXoVI0PWOFh",
    "https://gitverse.ru/api/repos/qwerti2228/crypt_based/raw/branch/master/XtremeVPN_crypted_sub_mix_pro#VPN",
    "https://happ.ring-team.ru/sub/xhzej111ftem",
    "https://tinyurl.com/29xo5ybp",
    "https://tinyurl.com/5n6htucr",
    "https://happ.ring-team.ru/sub/sieq4r9ss1yx",
    "https://gist.githubusercontent.com/Bebta8881/c2703965b5d0e9352e1f2acdea00f7c1/raw/08fd812eaa691c87fb3ec622de3d97e586e7edf7/%25F0%259F%258C%25B6%25EF%25B8%258F%2520perec%2520vpn",
    "https://gist.githubusercontent.com/LIKE-FURRY/85b29308c2f37c04046fe65ebf8de870/raw/df9abf8e554301f0459f390f6002ba7f642420de/67",
    "https://raw.githubusercontent.com/ReallySubHuman/SubForgeBot/main/subs/%D1%85%D1%83%D0%B9%D0%BB%D0%B0%D0%B2%D0%B0-%D0%B2%D0%BF%D0%BD-20260716102054.txt",
    "https://bit.ly/4vwrRc",
    "https://vpn.akres.fun/protocols/vless/transports/grpc",
    "https://hub.mos.ru/panosenk/sukasubs/-/raw/main/purple.txt",
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
    "https://gist.githubusercontent.com/moksim76/19e5c747b19f9ab4610609bcde01fb3d/raw/5d9ac6883ceb0a9e2e94040defabb8b97c1f317d/XuexVpn%20Free",
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
    "https://gitverse.ru/api/repos/vansfenix/vansFenix/raw/branch/master/%D0%A5%D0%9Е%D0%A0%D0%97%D0%9D%D0%90%D0%95%D0%A2%D0%A7%D0%9E",
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
