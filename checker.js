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
  const sources = [  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/selected.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/wl.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/merged.txt",
  "https://raw.githubusercontent.com/arhivedxx7/Keyfreetee/refs/heads/main/RKPdee",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeOCh1eOFo0eb1FAfxPZ1iNjq2DaSyibM0BiX7aFVQPOCr5TB6YStAUugDUSZmeIq6gMGqXu8WlLO16GqFe7IQCw%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=cinZa8HatBaIVylElsc%2B0p2hqFgHs2NUsg9TXUIpDoVqMBmTu9cR8EJaKVX4oYKMMVESrt4jkAhDg/R7lNWc%2BQ%3D%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeArtpaVCD9oExsYZPNhmu0V5X02YvaoSzkj%2B0XFqb%2BehYP7alm1UAjMJFfmCuVVbBaqcHQKcft6YIsKkSxQU40w%3D",
  "https://gist.githubusercontent.com/SoloRepozSF/7810f115b912e7640a11809863045755/raw/SANTA",
  "https://vpn.zotus.ru/sub.php",
  "https://tri.su/nNo2N",
  "https://raw.githubusercontent.com/s0ulcoil/rkvpn/refs/heads/main/randomkeys",
  "https://p.kfwl.lol/os=ios/h=SCAM.SANTA.LUCHIY/https://link.flagman.click/sub/wWJsbBP7eAxpu2JZkaDVeFM-1",
  "https://tri.su/mjDpk",
  "https://bit.ly/4wQPqhD",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=doAHy/WJZeWcvNQ8P56Ye8epNH09xsBGW3IrmLVHX5eU3idtXuBJja8PKmot6GZBIuFPpshS5WhjLvzQwL%2B/L8xkwszrQwCnYnPMx1Dn2rDHQXTJL%2BP4BJPUP4NpuT0K",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=/dAOgZdLKsAWDwgXttns1xvug62mm5gBfGiXXA0jfMf/50mh1EKdKPn/oulAhbtPZHSy/dKHMy3dupLH9qgt0Q%3D%3D",
  "https://tinyurl.com/LTEapple",
  "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/c1804c102de504bbc4034d9752579b77398f371d/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
  "https://hub.mos.ru/kfwl/subsidia/raw/main/all",
  "https://cdn.statically.io/gh/kama55726/KomaryServers/main/KomaryServ",
  "https://cdn.jsdelivr.net/gh/kama55726/KomaryServers@main/KomaryServ",
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
  "https://raw.githubusercontent.com/amintengizbaev2013-a11y/https-t.me-Happkeo/b7fe6f4281edae621c4c16e0945bbf0e9e674bc9/keys_Made_by_ovi_god.txt",
  "https://raw.githubusercontent.com/SoloRepozSF/Key-for-vpn/refs/heads/main/MAIRAM%20VIP",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=rlHeaQoEBpzko1BDE8na0jsF5BftJauoGPblqn7gZQaXDFrbZIc8ricjyrjJri9Y6GYOnDO/fBFA7YiRUkY2kM/pyn7Wat2CYgCa66mKvss%3D",
  "https://my-vpn.click/subscriptions/cVMejXH4BaM99cd0Iz-ffA.txt",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=KpDaOrHG/RBjTsFgKHtxQ8bWPs%2BPvU98gu2NoGFrpFJPAtpXKv%2BYhO1aMOLQFAbr9CpU/xpwCVsH%2BAfspVlkUleMEAjPesythZMYN7lTex4%3D",
  "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
  "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
  "https://gitverse.ru/api/repos/cid-uskoritel/cid-catwhite-uskoritel/raw/branch/master/configs.txt",
  "https://gitverse.ru/api/repos/Catlerok_glasha/catwhiteMIRROR/raw/branch/master/configs.txt",
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
  "https://codeberg.org/kfwl/sub/raw/branch/main/sub.txt",
  "http://apkvision.org/games/action/hollow-knight-silksong-130787",
  "http://arkmv.ru/vod",
  "http://detectportal.firefox.com/success.txt",
  "http://etoneya.su/whitelist",
  "http://fsub.flux.2bd.net/githubmirror/bypass/bypass-all.txt",
  "http://one.one.one.one",
  "http://publication.pravo.gov.ru/document/0001202408080127",
  "http://tiktok.com/@iamtrotuar",
  "http://tiktok.com/@kvasachakovski",
  "http://virustotal.com/",
  "http://www.msftconnecttest.com/connecttest.txt",
  "https://3dnews.ru/1135699",
  "https://9to5mac.com/2026/04/09/researchers-detail-how-a-prompt-injection-attack-bypassed-apple-intelligence-protections/",
  "https://EtoNeYa.SU",
  "https://alley.serv00.net/1",
  "https://alley.serv00.net/2",
  "https://alley.serv00.net/whitelist",
  "https://alley.serv00.net/youtube",
  "https://alley.serv00.net/ytm",
  "https://app.zoogvpn.com/sign-up",
  "https://arxiv.org/abs/2602.05014",
  "https://autosub-config.vercel.app/sub.txt",
  "https://blog.google/company-news/inside-google/googlers/how-google-ai-visual-search-works/",
  "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/",
  "https://blog.google/innovation-and-ai/products/google-ai-updates-february-2026/",
  "https://blog.google/innovation-and-ai/technology/ai/ai-science-forum-2024/",
  "https://blog.google/products-and-platforms/products/workspace/gemini-google-sheets-state-of-the-art/",
  "https://cdn.jsdelivr.net/gh/AbikusSudo/RussiaVPN@main/docs/index.html",
  "https://cdn.jsdelivr.net/gh/firefoxmmx2/v2rayshare_subcription/subscription/vray_sub.txt",
  "https://cdn.jsdelivr.net/gh/freebaipiao/freebaipiao@main/freebaipiaov2.txt",
  "https://cdn.jsdelivr.net/gh/mahdibland/V2RayAggregator@master/update/provider/provider-meta-others.yml",
  "https://cdn.jsdelivr.net/gh/peasoft/NoMoreWalls@master/list.txt",
  "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt",
  "https://cdn.jsdelivr.net/gh/xiaoji235/airport-free/v2ray.txt",
  "https://cloud.google.com/gemini-enterprise",
  "https://config-generator-warp.vercel.app/",
  "https://dalink.to/rstnnl",
  "https://dalink.to/semqka",
  "https://dalink.to/zxcrystal",
  "https://dev-ir.github.io/v2rayNG-Auto-Downloader",
  "https://dev.vk.com/ru/libraries/tunnel",
  "https://developers.google.com/speed/public-dns",
  "https://diskanalyzer.com/",
  "https://drive.google.com/file/d/1lVt4vnwBVSBaakvoqbk_Mu9mXdvkTbjP/view?usp=sharing",
  "https://e.pcloud.link/publink/show?code=XZIRNMZiKwvqBp4k94qdkl5LjSKRzHPyYqk",
  "https://f-droid.org/",
  "https://f-droid.org/en/packages/com.github.shadowsocks/",
  "https://f-droid.org/packages/com.b44t.messenger/",
  "https://f0rc3run.github.io/F0rc3Run-panel/",
  "https://fastlanehosting.ru/sub/Tc63ioxijuNzNYBni",
  "https://funpay.com/lots/offer?id=57204895",
  "https://futurism.com/artificial-intelligence/experts-concerned-ai-progress-wall",
  "https://get.activated.win",
  "https://gist.githubusercontent.com/latypovtimyr2014-netizen/4967b01f0ab73108711b015b1a850836/raw/seovpn.txt",
  "https://gist.githubusercontent.com/pidarasuebisov-afk/529f9f13b4f051b9cf2c43ea4e61d840/raw/68d7ed6b49826e712d3b2bead3645bcd8f59509c/TG%2520CVEDC%2520VPN%2520LTE",
  "https://gist.githubusercontent.com/pythoneer-dev-q/dd66ec52d2a44084a957ba7f4dc33cd0/raw/wifi.txt",
  "https://gist.githubusercontent.com/sevushreal-sudo/382c943f62b704cea33ffbf5de0a8194/raw/76f1e39ac6a4b7f11ff91df05413bdb5c0a53df2/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushreal-sudo/c3c927844b04b1ec3409ca4c66a020f9/raw/9c760cc581d09c9447ed3d583218fdbad19d43c7/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushreal-sudo/e9bdf5deaabfe141b289baea9d1356c5/raw/fb1808c51a98a13e6935d7e558cf02f41c1ce828/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/04106957e78bff0d5cebbfb4b0a1a99d/raw/4610e43769b885f8692ee60299b66d82d4539693/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/643d68b572366ec6f56e8b8d9e53b283/raw/16d2fa281dac492eae34747f9c12b3e78b4ad996/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/6f80db548a7ca9543c09d7d89654dede/raw/c23fecfe6e1f6e62a7d4d35765f2e6c88be5d336/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/6f80db548a7ca9543c09d7d89654dede/raw/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/9341be7a058e132154d407d082a60fb1/raw/mysub.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/9341be7a058e132154d407d082a60fb1/raw/mysub.txt#@SevaVPB_bot",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/bbaafc75c4c98f41c05602ea886a3d13/raw/848ce92fd80619fd7300e7d3e909d9a2794760a9/gistfile1.txt",
  "https://gist.githubusercontent.com/sevushyamamoto-stack/d2f2a4e353f6877149198ce18195c31b/raw/b1fb8972756a9e707548c1e773802fe50000234e/gistfile1.txt",
  "https://github.com/2dust/clashN/releases",
  "https://github.com/2dust/v2rayN/releases/tag/7.14.12",
  "https://github.com/2dust/v2rayN/releases/tag/7.7.1",
  "https://github.com/2dust/v2rayNG/releases",
  "https://github.com/2dust/v2rayNG/releases/tag/1.10.25",
  "https://github.com/2dust/v2rayNG/releases/tag/1.10.32",
  "https://github.com/2dust/v2rayNG/releases/tag/1.10.4",
  "https://github.com/2dust/v2rayNG/releases/tag/1.9.34",
  "https://github.com/2dust/v2rayNG/releases/tag/2.0.13",
  "https://github.com/2dust/v2rayng",
  "https://github.com/4n0nymou3/multi-proxy-config-fetcher/raw/main/configs/proxy_configs.txt",
  "https://github.com/ALIILAPRO/v2rayNG-Config/blob/main/server.txt",
  "https://github.com/AdguardTeam/AdguardForWindows/releases/tag/v7.18.1",
  "https://github.com/BlendLog/MinerSearch/releases/tag/v1.4.8.2",
  "https://github.com/BlendLog/MinerSearch/releases/tag/v1.4.8.3",
  "https://github.com/BlendLog/MinerSearch/releases/tag/v1.4.8.4",
  "https://github.com/Daiwv/Anti-Miner",
  "https://github.com/DavidXanatos/TaskExplorer/releases/tag/v1.6.6",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/all_configs.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_001.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_002.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_003.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_005.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_007.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_008.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_009.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_011.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_012.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_013.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_014.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_015.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/batches/v2ray/batch_016.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/clash.yaml",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/ss_clash.yaml",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/trojan.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/trojan_clash.yaml",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/vless.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/vless_clash.yaml",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/vmess.txt",
  "https://github.com/Delta-Kronecker/V2ray-Config/raw/refs/heads/main/config/protocols/vmess_clash.yaml",
  "https://github.com/DigneZzZ/v2raytun",
  "https://github.com/DigneZzZ/v2raytun/releases/",
  "https://github.com/azavaxhuman/Quick_Warp_on_Warp",
  "https://github.com/bannedbook/v2ray.vpn",
  "https://github.com/barry-far/V2ray-Configs",
  "https://github.com/cacggghp/vk-turn-proxy",
  "https://github.com/jing5460/Clash-for-Windows-Android",
  "https://github.com/kort0881/proxy-auto-checker",
  "https://github.com/kort0881/russia-whitelist",
  "https://github.com/kort0881/russia-whitelist/discussions",
  "https://github.com/kort0881/telegram-proxy-collector",
  "https://github.com/kort0881/vpn-checker-backend",
  "https://github.com/kort0881/vpn-key-vless",
  "https://github.com/ksenkovsolo/HardVPN-bypass-WhiteLists-",
  "https://github.com/ksenkovsolo/HardVPN-bypass-WhiteLists-/raw/refs/heads/main/vpn-lte/WHITELIST-ALL.txt",
  "https://github.com/ksenkovsolo/HardVPN-bypass-WhiteLists-/tree/main",
  "https://github.com/kutovoys/xray-checker",
  "https://github.com/kutovoys/xray-checker/blob/main/README_RU.md",
  "https://github.com/lhear/SimpleXray",
  "https://github.com/libnyanpasu/clash-nyanpasu",
  "https://github.com/libnyanpasu/clash-nyanpasu/releases",
  "https://github.com/login?return_to=https%3A%2F%2Fgithub.com%2FShayanthn%2FV2ray-Tester-Pro",
  "https://github.com/lowercase78/V2RayN-PRO/releases",
  "https://github.com/mahdibland/V2RayAggregator",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/1.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/10.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/11.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/12.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/13.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/14.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/15.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/16.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/17.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/18.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/19.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/2.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/20.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/21.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/22.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/23.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/24.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/25.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/3.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/4.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/5.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/6.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/7.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/8.txt",
  "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/9.txt",
  "https://github.com/pluralplay/FlClashX",
  "https://github.com/pluralplay/FlClashX/releases",
  "https://github.com/ramensoftware/windhawk",
  "https://github.com/redmi9cnfc/Zapret_magisk_module_fix",
  "https://github.com/romanvht/ByeDPIAndroid/releases/latest",
  "https://github.com/rudnstudent/SkufUp",
  "https://github.com/sakha1370/OpenRay/raw/refs/heads/main/output/all_valid_proxies.txt",
  "https://github.com/shiahonb777/web-to-app",
  "https://github.com/soliSpirit/solvpn",
  "https://github.com/stamparm/maltrail",
  "https://github.com/termux/termux-app/releases/tag/v0.118.2",
  "https://github.com/tharunbirla/FetchIt/releases/latest",
  "https://github.com/throneproj/Throne",
  "https://github.com/throneproj/Throne/releases",
  "https://github.com/throneproj/Throne/releases/tag/1.0.13",
  "https://github.com/turkaysoftware/glow/releases/tag/v25.14.1",
  "https://github.com/tzmax/V2RayXS/",
  "https://github.com/tzmax/V2RayXS/releases/tag/v1.5.10",
  "https://github.com/v2fly/v2ray-core/releases/",
  "https://github.com/v2ray-links/v2ray-free",
  "https://github.com/v2rayA/v2rayA",
  "https://github.com/v2rayA/v2rayA/releases/tag/v2.2.7.5",
  "https://github.com/wgtunnel/wgtunnel/releases",
  "https://github.com/whoahaow",
  "https://github.com/whoahaow/rjsxrd",
  "https://github.com/zeromake/AnXray",
  "https://github.com/zoicware/RemoveWindowsAI",
  "https://gitlab.com/openconnect/openconnect-gui/-/releases",
  "https://gitverse.ru/api/repos/KfWL/main/raw/branch/main/KfWLcheck.txt",
  "https://gitverse.ru/api/repos/Vsevj/OBS/raw/branch/master/wwh",
  "https://gitverse.ru/api/repos/bezlista/bezlista_mirror/raw/branch/master/conf1g.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/merged.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/selected.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/wl.txt",
  "https://gitverse.ru/api/repos/cid-uskoritel/cid-white/raw/branch/master/whitelist.txt",
  "https://gitverse.ru/api/repos/kfwlru/base/raw/branch/main/KfWL.txt",
  "https://gitverse.ru/api/repos/kfwlru/sub/raw/branch/main/212.txt",
  "https://gitverse.ru/api/repos/lolfomka/tg-WLTGFF/raw/branch/master/TG-@WLTGFF",
  "https://gitverse.ru/api/repos/nloverx/EtoNeYa_Subs/raw/branch/master/whitelist",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/EtoNeYa/EtoNeYa_wl.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/Igareck/WL-CIDR-RU-Checked.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/Igareck/WL-RU-Mobile.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/KvRuVPN/KvRuVPN.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/OutlineVPN%2FOutlineVPN.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/RkpVPN/RKP_work.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/RosTun/utf-8_gen.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/Zieng2/Zieng2_NowMeow.txt",
  "https://gitverse.ru/api/repos/ru-wbl/wl/raw/branch/master/Zieng2/Zieng2_vless_lite.txt",
  "https://goldclubhosting.xyz/index.php?rp=/store/free-trial",
  "https://golnk.ru/78GBL",
  "https://habr.com/p/1000792/",
  "https://habr.com/ru/articles/1006666/",
  "https://habr.com/ru/articles/1008164/",
  "https://habr.com/ru/articles/764608/",
  "https://habr.com/ru/articles/983276/?utm_campaign=983276&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/984186/?utm_campaign=984186&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/985450/?utm_campaign=985450&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/985694/?utm_campaign=985694&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/985856/?utm_campaign=985856&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/985950/",
  "https://habr.com/ru/articles/985976/?utm_campaign=985976&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/986180/?utm_campaign=986180&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/986282/?utm_campaign=986282&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/986702/?utm_campaign=986702&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/986804/?utm_campaign=986804&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/986828/?utm_campaign=986828&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/987076/?utm_campaign=987076&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/987250/?utm_campaign=987250&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/articles/987440/?utm_campaign=987440&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/companies/cloud_ru/articles/985610/?utm_campaign=985610&utm_source=habrahabr&utm_medium=rss",
  "https://habr.com/ru/companies/femida_search/articles/963042/",
  "https://habr.com/ru/companies/infowatch/news/987886/?utm_source=habrahabr&utm_medium=rss&utm_campaign=987886",
  "https://hide.mn/files/software/hidemyname_vpn_2.1.915.exe",
  "https://hightech.fm/2026/01/22/telegram-rus-list",
  "https://hightech.fm/2026/01/24/gdz",
  "https://hightech.fm/2026/01/26/gd-site-relation",
  "https://hightech.fm/2026/01/26/kids-books",
  "https://hightech.fm/2026/01/26/nvidia-weeks",
  "https://hightech.fm/2026/01/26/rus-imei",
  "https://hightech.fm/2026/01/27/chatgpt-adv",
  "https://hydralauncher.gg/",
  "https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/",
  "https://internet-tenshi.kangel.tech/whitelist",
  "https://iplogger.com/23qqQ6",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=3dffpuJWim0BihJESUTFa9n4z3o6BmSW2yjGmQQjkQK0mmFuv1SYYpSKa8k8kXbaeToXX/hN%2BkrRMIU7CkqtEQ%3D%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=URfVCLW9N%2B4xIrzRJo0/k7K0803ePdPsso8PLor%2BQ/Y%2BbzxcZRES38W19XN7/i/KiNV6VdGkmrC2vLftXoZl1g%3D%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=aF1Y8tnUQNLysztJEKtA03BRX3pdUKtcbaxf0Ceb2id17apTOzS22cwIqXyhsIThabZn35kzzQm8VaJDiHxTJUs1tOdG69keNZanO9liAGc%3D",
  "https://itsyebekhe.github.io/PSG/",
  "https://jaxcore.app/",
  "https://key.vpnstarlink.ru/3LGH3RO",
  "https://kort0881.github.io/internet-access-site/",
  "https://kukeyun.cc/#/register",
  "https://labs.google/fx/ru/tools/flow",
  "https://lampa.nnslvp.io/plugins?ysclid=mmnnvoh8oz237326599",
  "https://link.squadbusters.com/voucher/2ed57a19-e253-4fb3-96e0-27e74061d5af",
  "https://llxickvpn.netlify.app/sub.txt",
  "https://llxickvpn.netlify.app/sub.txt#LLxickVPN",
  "https://lowik.codeberg.page/pages/",
  "https://lowik.gitverse.site/lowik",
  "https://lowik.great-site.net",
  "https://lowik.great-site.net/",
  "https://lowik.great-site.net/ObhodBsFreeSub.txt",
  "https://lowiklive.vercel.app/",
  "https://magicbrawl.gg/ru",
  "https://matrix.org/",
  "https://max.ru/",
  "https://max.ru/hack_less",
  "https://max.ru/rbc",
  "https://mega.io/vpn",
  "https://mega.nz/file/Me1TiDSJ#qLRZzZYGhlDeRibAXo3ucTMXVlUTDCqabFrXC5HSgrw",
  "https://moscow.megafon.ru/offline_services/",
  "***twmoon1-cdn-route.couldflare-cdn.com:1443/?sni=twmoon1-cdn-route.couldflare-cdn.com#%F0%9F%A5%BE53%40oneclickvpnkeys",
  "https://music.yandex.ru/album/14471075/track/79556191?utm_medium=copy_link&ref_id=c564a900-01ad-4f05-b345-a442bb26472d",
  "https://music.yandex.ru/album/38917938/track/144564115?utm_medium=copy_link&ref_id=71f61740-6f15-4bc6-b6f3-3080bcf6cfdf",
  "https://music.yandex.ru/album/40460502/track/147753998?utm_medium=copy_link&ref_id=a7c50ddf-4e68-4c0c-88a3-f13cbf5d9620",
  "https://music.yandex.ru/album/6554921/track/30767183?utm_medium=copy_link&ref_id=01b65727-ec6b-4f25-a6c0-2d391f76bdab",
  "https://my.vpnnederland.nl/user/setup-vpn",
  "https://myket.ir/app/com.v2ray.ang",
  "https://nb557.github.io/plugins/online_mod.js",
  "https://nb557.github.io/plugins/rating.js",
  "https://nowmeow.pw/8ybBd3fdCAQ6Ew5H0d66Y1hMbh63GpKUtEXQClIu/whitelist",
  "https://obwlsub.vercel.app/wwh",
  "https://one.one.one.one/",
  "https://open.marvelhub.art/join/b5j0izvktu0g63x",
  "https://openvpn.net/client/",
  "https://openvpn.net/client/client-connect-vpn-for-windows/",
  "https://paragontweaks.net/utilities",
  "https://pasteview.com/pqJNQKR",
  "https://pay.cloudtips.ru/p/5d86d9ab",
  "https://pay.cloudtips.ru/p/c18e54a2",
  "https://pay.cloudtips.ru/p/f3e0c6ad",
  "https://pcloud.com/",
  "https://perecsub.com/qLvjZY-kJmmH1hfS",
  "https://pikabu.ru/story/vashi_lichnyie_fotografii_v_obshchem_dostupe_13755309",
  "https://proxypool.link/clash/proxies",
  "https://proxytype.com/amneziawg/",
  "https://r123t.vercel.app",
  "https://r123t.vercel.app/",
  "https://r1s.ir/networktool/v2ray-converter/?utm_source=chatgpt.com",
  "https://raw.githubusercontent.com/00004281/-/5f0d8213eecd3759be587b9b68a49246f625fcc9/%E6%87%92%E4%BA%BA%E9%85%8D%E7%BD%AE%20.conf",
  "https://raw.githubusercontent.com/07751000/001github.io/410c03197241f93ce0d0a9c295c4dd587b4d3d54/0726.yml",
  "https://raw.githubusercontent.com/07751000/001github.io/410c03197241f93ce0d0a9c295c4dd587b4d3d54/0930.yaml",
  "https://raw.githubusercontent.com/07751000/001github.io/410c03197241f93ce0d0a9c295c4dd587b4d3d54/723.yml",
  "https://raw.githubusercontent.com/07751000/001github.io/refs/heads/main/0930.yaml",
  "https://raw.githubusercontent.com/0x-jerry/v2fly-schema/e6c803bfff642e66652320561055874ea7dec3b7/v2fly.schema.json",
  "https://raw.githubusercontent.com/0x64656164/cancer-treatment/35101a010ab93bdc0ed328292671ddcdddee074f/congig_hiddify.json",
  "https://raw.githubusercontent.com/0x64656164/cancer-treatment/7936408af0a11f971fb3ec81a719ab4f6661d28f/congig_hiddify.json",
  "https://raw.githubusercontent.com/0x64656164/cancer-treatment/refs/heads/main/servers_ratings.json",
  "https://raw.githubusercontent.com/0xAbolfazl/PyroConfig/d7db1225531b416806804e2a2e668aa281682146/Configs/vless.txt",
  "https://raw.githubusercontent.com/0xAbolfazl/PyroConfig/main/Configs/vless.txt",
  "https://raw.githubusercontent.com/0xPixelNinja/XReality/86e90c3ced626829162e97140f8ec5d2bdda5860/proxy/config.template.json",
  "https://raw.githubusercontent.com/0xlipon/BugBounty/main/Collections/Information%20Disclosure.txt",
  "https://raw.githubusercontent.com/10ium/HiN-VPN/main/subscription/base64/mix",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/4df3f1a4c2db13b82144131c458942b39346a3cd/Complex_URL_list.txt",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/4df3f1a4c2db13b82144131c458942b39346a3cd/Sublist/Leon406-vless.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/4df3f1a4c2db13b82144131c458942b39346a3cd/Sublist/shabane_vless.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Complex_URL_list.txt",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Simple_URL_List.txt",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/4n0nymou3/multi-proxy-config-fetcher.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/F0rc3Run_XX.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/MatinGhanbari_v2ray-configs-super-sub.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/NiREvil_SSTime.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/ainita.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/amin_o__o_bitplatform.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/amiralter_config_lite.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/arshiacomplus/v2rayExtractor_vless.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/gheychiamoozesh.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/hamedp-71/Sub_Checker_Creator_final.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/hamedp-71/Trojan_hp.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/namira.dev.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/shatakvpn.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/the3rf_com_sub_php.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSaz/main/Sublist/yebekhe/vpn-fail.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSazLite/1b4d15cdec513ded6465ba148d3333fdf6d9c9b4/Sublist/@FREE2CONFIG_Vless.txt.yaml",
  "https://raw.githubusercontent.com/10ium/MihomoSazLite/main/Simple_URL_List.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/530b22df55cd4fe509ee7f8af9ceab9a26cda1d6/urls.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/main/output_configs/ShadowSocks.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/main/output_configs/USA.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/main/output_configs/Vless.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/main/urls.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/Iran.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/ShadowSocks.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/Trojan.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/UK.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/Vless.txt",
  "https://raw.githubusercontent.com/10ium/ScrapeAndCategorize/refs/heads/main/output_configs/Vmess.txt",
  "https://raw.githubusercontent.com/10ium/V2Hub3/main/merged",
  "https://raw.githubusercontent.com/10ium/V2Hub3/main/merged_base64",
  "https://raw.githubusercontent.com/10ium/V2Hub3/refs/heads/main/Split/Normal/reality",
  "https://raw.githubusercontent.com/10ium/V2Hub3/refs/heads/main/Split/Normal/shadowsocks",
  "https://raw.githubusercontent.com/10ium/V2RayAggregator/refs/heads/master/Eternity.txt",
  "https://raw.githubusercontent.com/10ium/V2RayAggregator/refs/heads/master/Eternity.yml",
  "https://raw.githubusercontent.com/10ium/V2ray-Config/main/Splitted-By-Protocol/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/src/telegram/vasl_bashim/messages.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/sub/configraygan/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/sub/filembad/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/sub/proxy_kafee/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/sub/vasl_bashim/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/VpnClashFaCollector/refs/heads/main/sub/wiki_tajrobe/hysteria2.txt",
  "https://raw.githubusercontent.com/10ium/base64-encoder/ac8ce7697b3b55942b62e82e05edef540b587ed8/encoded/ermaozi_v2ray.txt",
  "https://raw.githubusercontent.com/10ium/base64-encoder/fec6c82ee264b08c25fccd8db38bde13d2300a4e/sublist.txt",
  "https://raw.githubusercontent.com/10ium/base64-encoder/main/encoded/10ium_mixed_iran.txt",
  "https://raw.githubusercontent.com/10ium/base64-encoder/main/encoded/ermaozi_v2ray.txt",
  "https://raw.githubusercontent.com/10ium/base64-encoder/main/sublist.txt",
  "https://raw.githubusercontent.com/10ium/dedup-configs/refs/heads/main/output_configs/Iran.txt",
  "https://raw.githubusercontent.com/10ium/dedup-configs/refs/heads/main/output_configs/UK.txt",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/HighSpeed.txt",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/free-mihomo-sub/HighSpeed.yaml",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/free-mihomo-sub/Maimengmeng.yaml",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/free-mihomo-sub/itsyebekhe_xhttp.yaml",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/free-mihomo-sub/rayan_proxy.yaml",
  "https://raw.githubusercontent.com/10ium/free-config/refs/heads/main/free-mihomo-sub/roosterkid.yaml",
  "https://raw.githubusercontent.com/10ium/multi-proxy-config-fetcher/refs/heads/main/configs/proxy_configs.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/224037582bd81408af822622a231acd9135b4109/links.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/main/link_staleness_report.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/main/links.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/main/suspicious_config_details/raw.githubusercontent.com_3ba5fbf8.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/main/suspicious_config_details/raw.githubusercontent.com_c09c9c20.txt",
  "https://raw.githubusercontent.com/10ium/suspicious-config-filter/main/suspicious_config_details/raw.githubusercontent.com_c6cd8599.txt",
  "https://raw.githubusercontent.com/1234sosuke/IPv6-VLESS-TCP-Reality/main/%E4%B8%8A%E4%BC%A0%E8%AF%B4%E6%98%8E.txt",
  "https://raw.githubusercontent.com/124cold/124cold.github.io/refs/heads/main/yaml/Ic.txt",
  "https://raw.githubusercontent.com/1774293824/Github_files/6164bdabf57501b5b87fe444000ecb2967a6d37f/config_copy.json",
  "https://raw.githubusercontent.com/1BlackLine/Payloads/main/1.txt",
  "https://raw.githubusercontent.com/1BlackLine/Payloads/main/zip.txt",
  "https://raw.githubusercontent.com/1man01/sub-aggregator/main/merged_subscription_germany.txt",
  "https://raw.githubusercontent.com/30yami/V2r/5563bbf273f9a61145da71eb7110208be86f2fd4/Sub32.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub13.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub21.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub3.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub32.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub7.txt",
  "https://raw.githubusercontent.com/30yami/V2r/main/Sub8.txt",
  "https://raw.githubusercontent.com/30yami/V2r/refs/heads/main/Sub23.txt",
  "https://raw.githubusercontent.com/30yami/V2r/refs/heads/main/Sub25.txt",
  "https://raw.githubusercontent.com/30yami/V2r/refs/heads/main/Sub31.txt",
  "https://raw.githubusercontent.com/30yami/V2r/refs/heads/main/Sub32.txt",
  "https://raw.githubusercontent.com/3878590578/vpn/refs/heads/main/Q1.yaml",
  "https://raw.githubusercontent.com/397552789/SR-Self-use-conf-module/7f5cbf6975bc84ba2d640e7bafb6450469addafa/vps.conf",
  "https://raw.githubusercontent.com/3yed82/TVC/d73ff3c764cdc6ad6a8e54d0226f6e00cd1bf15b/config.txt",
  "https://raw.githubusercontent.com/3yed82/TVC/main/config.txt",
  "https://raw.githubusercontent.com/3yed82/TVC/main/lite/config.txt",
  "https://raw.githubusercontent.com/47AgEnT-47/vpn-configs/refs/heads/main/configs.txt",
  "https://raw.githubusercontent.com/49fa2b7d-0edd-4a24-b0dd-11ef6c03b2d8/v2ray-api/96b38044c0da8dfcb116646cda4164dbf7a7383a/src/config.json",
  "https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/621628ad51234e9557fe982cab43d00568887ad3/serverless1.json",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/ed5924940680d7dad92cafe165de00a697393d5d/configs/proxy_configs.txt",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/fca6089d5fe71318bc3d3e91f73df004b66e3757/configs/channel_stats.json",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/main/configs%2Fproxy_configs.txt",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/main/configs/proxy_configs.txt",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/refs/heads/main/configs/channel_stats.json",
  "https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/refs/heads/main/configs/proxy_configs.txt",
  "https://raw.githubusercontent.com/4r0m1/list/279d86270b03824812c7cc6be786b4ff83300bb2/domain.txt",
  "https://raw.githubusercontent.com/4r0m1/list/main/domain.txt",
  "https://raw.githubusercontent.com/4r0m1/list/main/ubo-sub.txt",
  "https://raw.githubusercontent.com/4win-official/sub/main/config.txt",                 
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
