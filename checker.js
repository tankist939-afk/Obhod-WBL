const fs = require('fs');
const https = require('https');
const http = require('http');
const net = require('net');

// ======================== НАСТРОЙКИ ========================
const MAX_CONFIGS = 100000;        
const SOURCE_PARALLEL_LIMIT = 25; 
const SOURCE_TIMEOUT = 8000;       
const PING_TIMEOUT = 3000;         // Таймаут проверки порта (как пинг в NekoBox+)
const PING_PARALLEL_LIMIT = 50;    // Параллельность проверки серверов

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
  "https://raw.githubusercontent.com/JetBrains/intellij-community/f1e8b3d3b88e4caf8a0bac1b2b734564a2e839e9/python/testData/psi/EmptySubscription.txt",
  "https://raw.githubusercontent.com/Jia-Pingwa/free-v2ray-merge/main/webside.txt",
  "https://raw.githubusercontent.com/JiaheXu/pt7_tips/main/20.04_note.txt",
  "https://raw.githubusercontent.com/JimmyART/Tools/0a29a52c7e954d27ca6db5aca136af9067fcb63c/Shadowrocket-Jart.conf",
  "https://raw.githubusercontent.com/Jiusi-pys/proxy/4bc4e78f0384f4306697417ec62819664ca68af2/clash/template.yaml",
  "https://raw.githubusercontent.com/John-Robertt/Rules/e1b51781a5bef84602e5df9edeb34e55b5f50fd6/Kevin.conf",
  "https://raw.githubusercontent.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever/5b2b4c50154624ee2d733ef8ed1894a6ff423ff8/lazy.conf",
  "https://raw.githubusercontent.com/JokinYang/qx_scripts/8f6ae5c2dde25bdc0e54888013fb1f43368cec9a/qx_example.conf",
  "https://raw.githubusercontent.com/JoniRousu/einmalzahlungzweihundert/main/bl-zip.txt",
  "https://raw.githubusercontent.com/JoseRFJuniorLLMs/Books-KDP-Amazon/f68cff54130c9360909fce43de085115e93ce7fb/books/txt/other/Russian/%D0%A5%D0%B0%D0%BA%D0%B5%D1%80_%D0%A5%D0%B0%D0%BA%D0%B5%D1%80%202007-01_arc_magazine-xakep_2007-01.txt",
  "https://raw.githubusercontent.com/JoseRFJuniorLLMs/Books-KDP-Amazon/main/books/txt/other/Russian/%D0%94%D0%B0%D0%B2%D1%8B%D0%B4%D0%BE%D0%B2%20%D0%94%D0%B5%D0%BD%D0%B8%D1%81%20%D0%92%D0%B0%D1%81%D0%B8%D0%BB%D1%8C%D0%B5%D0%B2%D0%B8%D1%87_%D0%97%D0%B0%D0%BC%D0%B5%D1%87%D0%B0%D0%BD%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D0%BD%D0%B5%D0%BA%D1%80%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8E%20%D0%9D.%20%D0%9D.%20%D0%A0%D0%B0%D0%B5%D0%B2%D1%81%D0%BA%D0%BE%D0%B3%D0%BE,%20%D0%B8%D0%B7%D0%B4%D0%B0%D0%BD%D0%BD%D1%83%D1%8E%20%D0%BF%D1%80%D0%B8%20%D0%98%D0%BD%D0%B2%D0%B0%D0%BB%D0%B8%D0%B4%D0%B5%201829%20%D0%B3%D0%BE%D0%B4%D0%B0,%20%D1%81%20%D0%BF%D1%80%D0%B8%D0%B1_arc_zamechanijananekrologijunnraevskogoiz15.txt",
  "https://raw.githubusercontent.com/JoseRFJuniorLLMs/Books-KDP-Amazon/main/books/txt/other/Russian/%D0%A5%D0%B0%D0%BA%D0%B5%D1%80_%D0%A5%D0%B0%D0%BA%D0%B5%D1%80%202007-01_arc_magazine-xakep_2007-01.txt",
  "https://raw.githubusercontent.com/JotaFilip/cn-g/main/h.txt",
  "https://raw.githubusercontent.com/JuckyLee668/xi-han/9badc74d0a58d12d4678d4f0bb1b5a74df13c2e1/twss.txt",
  "https://raw.githubusercontent.com/JyanJohn/PisoWifi-BruteForce/main/user.txt",
  "https://raw.githubusercontent.com/KRYYYYYYYYYYYYYYYYYYY/local/refs/heads/main/test1/status.json",
  "https://raw.githubusercontent.com/KRYYYYYYYYYYYYYYYYYYY/mob/refs/heads/main/test1/diagnostics.json",
  "https://raw.githubusercontent.com/KRYYYYYYYYYYYYYYYYYYY/mob/refs/heads/main/test1/diagnostics_v2.json",
  "https://raw.githubusercontent.com/KRYYYYYYYYYYYYYYYYYYY/mob/refs/heads/main/test1/ranking.json",
  "https://raw.githubusercontent.com/KaikiDeishuuu/ClashmetaRules_Kaiki/1964459fdf8d58b7d69bc49226ebcaaf9f0dbc81/custom_proxy.yaml",
  "https://raw.githubusercontent.com/Karanxa/Bug-Bounty-Wordlists/main/fuzz.txt",
  "https://raw.githubusercontent.com/Karatla/Notes/main/Linux/commands.txt",
  "https://raw.githubusercontent.com/KarinaZakirova/diploma_work_2024/92114ae6f5a266d7b2af18a69237731181166b12/src/getting_texts_with_origs/fanfics/1625_9472297_25009480.txt",
  "https://raw.githubusercontent.com/KarinaZakirova/diploma_work_2024/main/src/getting_texts_with_origs/fanfics/1625_9472297_25009480.txt",
  "https://raw.githubusercontent.com/KaringX/karing/689146493c1fd5ab3fe2c2e25c9194c5b06f9518/README_examples/clash/config.yaml",
  "https://raw.githubusercontent.com/KaringX/karing/689146493c1fd5ab3fe2c2e25c9194c5b06f9518/lib/i18n/da.i18n.json",
  "https://raw.githubusercontent.com/KaringX/karing/689146493c1fd5ab3fe2c2e25c9194c5b06f9518/lib/i18n/en.i18n.json",
  "https://raw.githubusercontent.com/KaringX/karing/689146493c1fd5ab3fe2c2e25c9194c5b06f9518/lib/i18n/fr.i18n.json",
  "https://raw.githubusercontent.com/KaringX/karing/689146493c1fd5ab3fe2c2e25c9194c5b06f9518/lib/i18n/ko.i18n.json",
  "https://raw.githubusercontent.com/Karnei4/Karnei4.github.io/refs/heads/master/s/Mediacentr/Zabava-FREE-Karnei4.m3u",
  "https://raw.githubusercontent.com/Kdwkakcs/pwcd/1391d9419b8b41394cfb09d7b34c0310d3cf4cd0/config.yml",
  "https://raw.githubusercontent.com/Kdwkakcs/pwcd/1391d9419b8b41394cfb09d7b34c0310d3cf4cd0/saved_urls.txt",
  "https://raw.githubusercontent.com/Kdwkakcs/pwcd/main/saved_urls.txt",
  "https://raw.githubusercontent.com/Kdwkakcs/spider/aeca76042ad613b503501f8f8b06267e66aa676a/singbox.json",
  "https://raw.githubusercontent.com/Kennix88/vpnsibcom_api/1c17e1a397d7870fb2396d3bd7063db33126c3bf/src/modules/xray/marzban-openapi.json",
  "https://raw.githubusercontent.com/KepLer100500/Manuals/4f14e5743cd1ab080a1bcb69cfc8d7aeef62f3f5/Server%20administration/network/nginx.txt",
  "https://raw.githubusercontent.com/Kerlios/bucket/0649b8b340386fa4faece061c30572d0400f64c3/conf/sr_ru_extended.conf",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/fd1009adcefdd1c4bdcef026db1ad80b61cb9e94/Farzad.txt",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/main/Farzad.txt",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/refs/heads/main/0992--1659634_28-05-2023%2013_12_45.yaml",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/refs/heads/main/user-09038765630--01-06-2023%2023_01_06.yaml",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/refs/heads/main/user-09388689153--01-06-2023%2023_01_06.txt",
  "https://raw.githubusercontent.com/Khajavi8056/Piplinux/refs/heads/main/user09908295201-10-06-2023%2023_01_06.yaml",
  "https://raw.githubusercontent.com/KhoirulAmsori/geoasset/main/proxy-build/Asset/sources.txt",
  "https://raw.githubusercontent.com/KimTaeyeon309/text/main/2024_12_24/rH2x5bGc.txt",
  "https://raw.githubusercontent.com/KimTaeyeon309/text/refs/heads/main/TXT/default.txt",
  "https://raw.githubusercontent.com/KingFalse/onekey-docker-xray/d6e4d264dd8b03489b818361edf072b89a193b1b/url.txt",
  "https://raw.githubusercontent.com/KingFalse/onekey-docker-xray/main/url.txt",
  "https://raw.githubusercontent.com/KingFalse/onekey-docker-xray/refs/heads/main/url.txt",
  "https://raw.githubusercontent.com/Kneesnap/FrogLord/03be539d7230b0872657f1e9619b61cdaf428588/making-version-configs.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/0205b32adeef5fdb3363a7ebcc3a1b19e9e76836/channels.json",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/0205b32adeef5fdb3363a7ebcc3a1b19e9e76836/vmess.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/10c1afb2d8705ccfc4ecf3166de7c3d2ebf99a43/channels.json",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/10c1afb2d8705ccfc4ecf3166de7c3d2ebf99a43/vmess.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/18df4bb81f8363fbc4639f6728ccaad923f836ec/Sources.json",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/18df4bb81f8363fbc4639f6728ccaad923f836ec/vmess.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/7f4e2f379936cee00fe41cba2b8e4db226452b0e/config_lite.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/7f4e2f379936cee00fe41cba2b8e4db226452b0e/vmess.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/config.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/config_lite.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/ss.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/ssr.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/vless.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/main/vmess.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/refs/heads/main/config_lite.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/refs/heads/main/ss.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/refs/heads/main/vless.txt",
  "https://raw.githubusercontent.com/Kolandone/v2raycollector/refs/heads/main/vmess.txt",
  "https://raw.githubusercontent.com/Koswara1985/OpenWrt/e143638f18081b36920c79d1fc580982ec460a22/AKUN_BACKUP.yaml",
  "https://raw.githubusercontent.com/Koswara1985/OpenWrt/e143638f18081b36920c79d1fc580982ec460a22/vless.txt",
  "https://raw.githubusercontent.com/Koswara1985/OpenWrt/e143638f18081b36920c79d1fc580982ec460a22/vless_ilped.txt",
  "https://raw.githubusercontent.com/Koswara1985/OpenWrt/main/vless.txt",
  "https://raw.githubusercontent.com/Koswara1985/OpenWrt/main/vless_ilped.txt",
  "https://raw.githubusercontent.com/MahanKenway/Freedom-V2Ray/cd8fa4af8a96865b09e50b9507324dd2d6a2c865/configs/vless.txt",
  "https://raw.githubusercontent.com/MahanKenway/Freedom-V2Ray/main/configs/mix.txt",
  "https://raw.githubusercontent.com/MahanKenway/Freedom-V2Ray/main/configs/vless.txt",
  "https://raw.githubusercontent.com/Mahdi0024/ProxyCollector/2e9a70fc5732d284e50a691a18ee8ea78c4c2b6a/.github/workflows/RunCollector.yml",
  "https://raw.githubusercontent.com/Mahdi0024/ProxyCollector/master/sub/proxies.txt",
  "https://raw.githubusercontent.com/Mahdi7ab/CDN/refs/heads/main/v2ray/r-yab.txt",
  "https://raw.githubusercontent.com/Mahdi7ab/v2ray/0dd376df0f190fa3c47a31754ea64db3b5208880/free-configs/vless.txt",
  "https://raw.githubusercontent.com/Mahdi7ab/v2ray/refs/heads/main/free-configs/all_configs.txt",
  "https://raw.githubusercontent.com/Maneshwar-Kumar/mospi-watcher/main/pdf_links.txt",
  "https://raw.githubusercontent.com/Manssizz/scriptvps/6d8a9216c2c12c216983a4e8b7fadcb41bf3dcd7/config/cendrawasih.conf",
  "https://raw.githubusercontent.com/ManyakRus/crud_generator/fee8bd19d41baba98fd745d93e7f80d1596d16b7/docs/lines_count.txt",
  "https://raw.githubusercontent.com/Marowalker/retrain_w2v/53bfc557ec72762aff57cdeb64cb654b5d126adb/data/pmc_data/non_comm_use.0-9A-B_txt/ACS_Omega/PMC6643451.txt",
  "https://raw.githubusercontent.com/Marowalker/retrain_w2v/53bfc557ec72762aff57cdeb64cb654b5d126adb/data/pmc_data/non_comm_use.0-9A-B_txt/Anal_Chem/PMC6282107.txt",
  "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta6.txt",
  "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta6BL.txt",
  "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyaktestru.txt",
  "https://raw.githubusercontent.com/Mastr868/V2ray/refs/heads/main/V2ray.json",
  "https://raw.githubusercontent.com/Matin662/v2/9feaf1a042f9b6d98cae6903fce3231252cd99bf/vless_hysteria2_configs.txt",
  "https://raw.githubusercontent.com/Matin662/v2/main/vless_hysteria2_configs.txt",
  "https://raw.githubusercontent.com/Matin662/v2/refs/heads/main/vless_hysteria2_configs.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/25bb2a9ec2721b62dd3ce3e5b0e12fbacf041f67/subscriptions/v2ray/subs/sub10.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/b28e7e118629b9d5b1ab20c6d751122e6799b4cc/subscriptions/v2ray/subs/sub14.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/c88277c4d612553848b9d6daab44ebdfdc47937a/appsettings.json",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/c88277c4d612553848b9d6daab44ebdfdc47937a/subscriptions/v2ray/subs/sub14.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/c88277c4d612553848b9d6daab44ebdfdc47937a/subscriptions/v2ray/subs/sub24.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/c88277c4d612553848b9d6daab44ebdfdc47937a/subscriptions/v2ray/subs/sub25.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/ddb254ca0d23e1698cdc1f230e80c623797546c5/subscriptions/v2ray/subs/sub39.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/ddb254ca0d23e1698cdc1f230e80c623797546c5/subscriptions/v2ray/subs/sub7.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Fbase64%2Fall_sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Ffiltered%2Fsubs%2Fhysteria2.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Ffiltered%2Fsubs%2Fss.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Ffiltered%2Fsubs%2Ftrojan.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Ffiltered%2Fsubs%2Fvless.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Ffiltered%2Fsubs%2Fvmess.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Fv2ray%2Fall_sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Fv2ray%2Fsuper-sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions%2Fwarp%2Fall_sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/filtered/subs/hysteria2.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/filtered/subs/ss.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/filtered/subs/vless.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/filtered/subs/vmess.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub1.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub10.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub11.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub12.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub13.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub14.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub17.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub19.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub2.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub21.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub22.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub23.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub25.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub26.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub30.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub31.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub33.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub35.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub36.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub38.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub39.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub5.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub6.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub7.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub8.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub9.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/refs/heads/main/subscriptions/v2ray/all_sub.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/refs/heads/main/subscriptions/v2ray/subs/sub38.txt",
  "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/refs/heads/main/subscriptions/v2ray/super-sub.txt",
  "https://raw.githubusercontent.com/MatsuTaku/b3-workshoop-alg-ds-19/d0bea7caf94ce55687354ec905791defa87285ed/s4.txt",
  "https://raw.githubusercontent.com/MatsuTaku/b3-workshoop-alg-ds-19/d0bea7caf94ce55687354ec905791defa87285ed/t4.txt",
  "https://raw.githubusercontent.com/Matt6548/my-first-codex-project/main/log.txt",
  "https://raw.githubusercontent.com/MeEinstein/use-shadowsocks-all-platforms/f9d613550ffcc31faeacb22bf7e3e8089bfe701d/install_v2ray.txt",
  "https://raw.githubusercontent.com/MehD1Shk/Subscription-Links/248bfdb53ed02d384dd1d58d01cd6e8cd7f73d5b/temporary_sublist.txt",
  "https://raw.githubusercontent.com/MehD1Shk/Subscription-Links/main/sublist7.txt",
  "https://raw.githubusercontent.com/MehD1Shk/Subscription-Links/main/temporary_sublist.txt",
  "https://raw.githubusercontent.com/MekaSeka/skills-github-pages/main/vless.txt",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/hysteria",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/mix",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/ss",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/trojan",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/vless",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector/main/sub/vmess",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector_Py/main/sub/Mix/mix.txt",
  "https://raw.githubusercontent.com/MhdiTaheri/V2rayCollector_Py/refs/heads/main/sub/Mix/mix.txt",
  "https://raw.githubusercontent.com/MicahElliott/Rocannon/b0cb9bed1dddbb1b619b482ed04d41e0957e816e/doc/mod.txt/redhat_subscription.txt",
  "https://raw.githubusercontent.com/Mieing/conf/9fe4c3dd50e3b6eab30981190b675a320152c5bd/QuantumultX/quantumult_20260111161553.conf",
  "https://raw.githubusercontent.com/Mihaham/Whisper_FPMI/2ec6f4b31384834ee1229d8cdaf213d526ef98f0/download/%D0%A0%D0%B0%D1%81%D0%BF%D1%80%D0%B5%D0%B4%D0%B5%D0%BB%D1%91%D0%BD%D0%BD%D1%8B%D0%B5-%D0%B8-%D0%BF%D0%B0%D1%80%D0%B0%D0%BB%D0%BB%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%B2%D1%8B%D1%87%D0%B8%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F-12-ZooKeeper.mp4.txt",
  "https://raw.githubusercontent.com/Mihaham/Whisper_FPMI/2ec6f4b31384834ee1229d8cdaf213d526ef98f0/result/%D0%A0%D0%B0%D1%81%D0%BF%D1%80%D0%B5%D0%B4%D0%B5%D0%BB%D1%91%D0%BD%D0%BD%D1%8B%D0%B5-%D0%B8-%D0%BF%D0%B0%D1%80%D0%B0%D0%BB%D0%BB%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%B2%D1%8B%D1%87%D0%B8%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F-12-ZooKeeper.txt",
  "https://raw.githubusercontent.com/OpenHub-Store/GitHub-Store/c20b97627669c9b1dc25d6adad7b899db09e4970/cached-data/trending/macos.json",
  "https://raw.githubusercontent.com/OshekharO/Adhock-Special-List/main/block.txt",
  "https://raw.githubusercontent.com/Otisist/Sample/491e0e962fff6688e645509f087646413b49b998/Server/config.conf",
  "https://raw.githubusercontent.com/OurDigitalWorld/data_samples/5651ca21a5a3b5186a2cbabdaed844dae1486818/echo/1918-10-04.txt",
  "https://raw.githubusercontent.com/OurDigitalWorld/data_samples/main/echo/1918-10-04.txt",
  "https://raw.githubusercontent.com/PDXostc/weather/d604660f7dfa6dd015df5b78103430873e3e7f7c/package_delta.txt",
  "https://raw.githubusercontent.com/PRoX2011/x16-PRos/main/src/txt/README.TXT",
  "https://raw.githubusercontent.com/PacketCipher/TVC/9bb2be1749d121742174909d25955ea452b0c874/channels.json",
  "https://raw.githubusercontent.com/PacketCipher/TVC/9bb2be1749d121742174909d25955ea452b0c874/subscriptions/singbox/vless.json",
  "https://raw.githubusercontent.com/PacketCipher/TVC/main/config.txt",
  "https://raw.githubusercontent.com/PacktPublishing/Azure-for-Architect-Second-Edition/38f42351b2505db5731c94f7129af9b30e32e024/Chapter07/eventgridSubscription.txt",
  "https://raw.githubusercontent.com/PacktPublishing/Implementing-and-Administering-Cisco-Solutions/1e6f52d417956cbaf750ec809bc9124571683314/Chapter%2002/R1%20configs.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/Erph-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/HmT-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/Hsadeghi-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/Kavehtazim-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/NafisehMolagholi-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/Sara-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/Une3-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/molaagholi-pandaconnection.txt",
  "https://raw.githubusercontent.com/Pandaconnection/Pandaconnection/refs/heads/main/scientists/nt400-pandaconnection.txt",
  "https://raw.githubusercontent.com/PasarGuard/panel/3d749e00f338ad07d529f8b62754175abd32349c/dashboard/public/statics/locales/en.json",
  "https://raw.githubusercontent.com/PasarGuard/panel/3d749e00f338ad07d529f8b62754175abd32349c/dashboard/public/statics/locales/fa.json",
  "https://raw.githubusercontent.com/PasarGuard/panel/3d749e00f338ad07d529f8b62754175abd32349c/dashboard/public/statics/locales/ru.json",
  "https://raw.githubusercontent.com/PasarGuard/panel/3d749e00f338ad07d529f8b62754175abd32349c/dashboard/public/statics/locales/zh.json",
  "https://raw.githubusercontent.com/PasserJang/clash-config/eb6457d33f4acf73ec860ecda3827a2d3a26a74e/other/%E5%AE%98%E6%96%B9%E7%A4%BA%E4%BE%8B%E5%AD%97%E6%AE%B5%E8%AF%B4%E6%98%8E.yaml",
  "https://raw.githubusercontent.com/PaulSorensen/linux-tools/main/linux-tools.txt",
  "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/static/sub_en",
  "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub",
  "https://raw.githubusercontent.com/Pawdroid/Free-servers/refs/heads/main/sub",
  "https://raw.githubusercontent.com/Paxton0222/proxy_server/refs/heads/main/proxy_example.txt",
  "https://raw.githubusercontent.com/Pd0rk1n/bspwm/main/.config/BraveSoftware/Brave-Browser/Default/Extensions/bgnkhhnnamicmpeenaelnjfhikgbkllg/5.0.178_0/filters/filter_255.txt",
  "https://raw.githubusercontent.com/Phantomiman/Enum4DNS/4bfe488940e5da2d99474b82b3f0276c1bc50075/list4.txt",
  "https://raw.githubusercontent.com/Phantomiman/Enum4DNS/main/list4.txt",
  "https://raw.githubusercontent.com/Pintosalazar/Sapinto/refs/heads/main/v2rayMCI.txt",
  "https://raw.githubusercontent.com/Praboth-Sandaruwan/v2ray/1debd437e3e7e7bee3abbc06e7da2b8c6ba527d9/client-config.updated.json",
  "https://raw.githubusercontent.com/PrachiModi/content_validator/main/todo.txt",
  "https://raw.githubusercontent.com/Proxydaemitelegram/Proxydaemi44/refs/heads/main/Proxydaemi44",
  "https://raw.githubusercontent.com/Ptechgithub/configs/db65f9bf071cd577139a2ed78bb35d36bef240f4/Gifts/peyman-sing-box-1.8.json",
  "https://raw.githubusercontent.com/Ptechgithub/configs/db65f9bf071cd577139a2ed78bb35d36bef240f4/ServerLess_TLSFrag_Xray_Config.json",
  "https://raw.githubusercontent.com/Ptechgithub/configs/db65f9bf071cd577139a2ed78bb35d36bef240f4/clash12.yaml",
  "https://raw.githubusercontent.com/Ptechgithub/warp/main/endip/install.sh",
  "https://raw.githubusercontent.com/Pun-Pun-03/warpsub/refs/heads/main/test.json",
  "https://raw.githubusercontent.com/PunamTupe77/security/main/VPN.txt",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/main/APIs/sc0.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/main/APIs/sc1.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/main/APIs/sc2.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/main/APIs/sc3.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/refs/heads/main/APIs/sc0.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/refs/heads/main/APIs/sc1.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/refs/heads/main/APIs/sc2.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/refs/heads/main/APIs/sc3.yaml",
  "https://raw.githubusercontent.com/Q3dlaXpoaQ/V2rayN_Clash_Node_Getter/refs/heads/main/APIs/sc4.yaml",
  "https://raw.githubusercontent.com/Qendolin/better-clouds/2f823fb246d4ac9b5bea66ca2aa07fcf23fc4113/renderdoc/CONFIGS.txt",
  "https://raw.githubusercontent.com/Qv2ray/Qv2ray/d5c5aeb366e2fbe9c9243648af36b0d11da14920/assets/ProtocolSchemes.txt",
  "https://raw.githubusercontent.com/Qvdfmkslz/WSITCGC/e56ae2c46c0fe907e848f7a04b62c09ff995c6a9/Raws.txt",
  "https://raw.githubusercontent.com/Qvdfmkslz/WSITCGC/main/Liberation.txt",
  "https://raw.githubusercontent.com/Qvdfmkslz/WSITCGC/main/Raws.txt",
  "https://raw.githubusercontent.com/R3ZARAHIMI/tg-v2ray-configs-every2h/1642241b0194e9682e1887508490a0a4222a7452/Config_jo.json",
  "https://raw.githubusercontent.com/R3ZARAHIMI/tg-v2ray-configs-every2h/main/Config_jo.txt",
  "https://raw.githubusercontent.com/R3ZARAHIMI/tg-v2ray-configs-every2h/main/Original-Configs.txt",
  "https://raw.githubusercontent.com/R3ZARAHIMI/tg-v2ray-configs-every2h/refs/heads/main/Original-Configs.txt",
  "https://raw.githubusercontent.com/R3ZARAHIMI/tg-v2ray-configs-every2h/refs/heads/main/no_cf_history.json",
  "https://raw.githubusercontent.com/RAY1234555555/AK-galL/refs/heads/main/GAll.txt",
  "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/665becedc30155b327ffa0fc2d760711c06c7283/sources.txt",
  "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/b5855d2d570e17421c5ba691796a0254641e6179/sources.txt",
  "https://raw.githubusercontent.com/RKPchannel/RKP_bypass_configs/dbb048720c7a91365bc23034173b0aeeb78cec8c/sources.txt",
  "https://raw.githubusercontent.com/ROHITH-M10/SpellingChecker/main/tcw.txt",
  "https://raw.githubusercontent.com/RPG-Dev420/V2Ray-Checker/main/requirements.txt",
  "https://raw.githubusercontent.com/RPG-Dev420/V2Ray-Checker/main/subscriptions/by_country/IR.txt",
  "https://raw.githubusercontent.com/RPG-Dev420/V2Ray-Checker/main/subscriptions/by_protocol/ss.txt",
  "https://raw.githubusercontent.com/RPG-Dev420/V2Ray-Checker/refs/heads/main/subscriptions/trojan_subscription.txt",
  "https://raw.githubusercontent.com/RYZgames31/UWB/refs/heads/main/wcfg",
  "https://raw.githubusercontent.com/RahelMousavi/rachel/58fa19f7e47c691bf29655ff1763b5a3ede486b1/vless.txt",
  "https://raw.githubusercontent.com/RameshAkkiraju/NeoGenomics/cb00a3258b7ed4636d0c780c13c71e2395744a98/task.txt",
  "https://raw.githubusercontent.com/RameshAkkiraju/NeoGenomics/main/task.txt",
  "https://raw.githubusercontent.com/RanTempest/V2ray/a3a23ca9cc050960d5bbd77f796be40241521e19/VLESS-TCP-XTLS-Vision/config_server_fallbacks.json",
  "https://raw.githubusercontent.com/Ranger802004/asusmerlin/main/domain_vpn_routing/readme.txt",
  "https://raw.githubusercontent.com/Rayan-Config/C-Sub/main/configs/proxy.txt",
  "https://raw.githubusercontent.com/Rayan-Config/C-Sub/refs/heads/main/configs/proxy.txt",
  "https://raw.githubusercontent.com/RaymondHarris971/ssrsub/master/9a075bdee5.txt",
  "https://raw.githubusercontent.com/Re1own/IoT_Sec/main/DaHua/CVE-2021-33044&&33045/extracted_firmware/squashfs-root/Russian.txt",
  "https://raw.githubusercontent.com/ReaJason/Clash-Butler/e3847c2b2eb9fbfa739b3a62ef332d31ba9e3a41/clash.yaml",
  "https://raw.githubusercontent.com/Reallyza/ReallyzaVpn/refs/heads/main/ALL%20CONF-WH%2BWIFI",
  "https://raw.githubusercontent.com/Reeeza2005/reza/refs/heads/main/sub500.json",
  "https://raw.githubusercontent.com/Remiuc0ff/ya-nikogo-ne-ubival/refs/heads/Remiuc0ff-patch-1/okak",
  "https://raw.githubusercontent.com/Remiuc0ff/ya-nikogo-ne-ubival/refs/heads/main/okak",
  "https://raw.githubusercontent.com/Rerechan02/Funny/a0d4ba71f1aec6d590bcbfc07395c91b274da918/funny.conf",
  "https://raw.githubusercontent.com/RexLee0929/VPS/6b03ffac7063193367a8514e9496a45ee97cf4ec/config/xrayr.yml",
  "https://raw.githubusercontent.com/Reza-sal/-/d76b25fc5d812fa1e4c24af29ef22d5ef434c2ec/frag.sub",
  "https://raw.githubusercontent.com/Reza-sal/shervin/5171f8c4531223b85bc8f0928e8ea1611a917a91/.Sub",
  "https://raw.githubusercontent.com/RezaFKH/V2RaySubscription/main/SubFile.txt",
  "https://raw.githubusercontent.com/Rezasaai/reza5/refs/heads/main/rsae63-sub.txt",
  "https://raw.githubusercontent.com/Rihan444/Files_Box/main/CP.txt",
  "https://raw.githubusercontent.com/RohanKhedekar2803/BE_Project_Backend/ae46e3b6855fcd757afe03b3a5ef57da45caa5e7/repository_logs.txt",
  "https://raw.githubusercontent.com/Rolka111111/gif/80ce9ddd980f3d455d6522f2db289f509921411d/images/Haproxy.conf",
  "https://raw.githubusercontent.com/Rolka111111/gif/80ce9ddd980f3d455d6522f2db289f509921411d/images/xray.conf",
  "https://raw.githubusercontent.com/Ruk1ng001/freeSub/main/clash.yaml",
  "https://raw.githubusercontent.com/Ruk1ng001/freeSub/refs/heads/main/clash.yaml",
  "https://raw.githubusercontent.com/Rukkhadevata123/nixos-config/df82224ced39fb14863f44560bd05bd88d5eede4/gnome_legacy/config.example.yaml",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/refs/heads/main/configs/tr/all.txt",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/refs/heads/main/configs/ua/all.txt",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/refs/heads/main/configs/us/all.txt",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/refs/heads/main/configs/us/hysteria2.txt",
  "https://raw.githubusercontent.com/ShatakVPN/ConfigForge-V2Ray/refs/heads/main/configs/vn/all.txt",
  "https://raw.githubusercontent.com/Shayanthn/V2ray-Tester-Pro/f76adabefbc115192904b9e30e4fd3fdbebd0ba4/config/sources.json",
  "https://raw.githubusercontent.com/Shayanthn/V2ray-Tester-Pro/f76adabefbc115192904b9e30e4fd3fdbebd0ba4/results.json",
  "https://raw.githubusercontent.com/Shayanthn/V2ray-Tester-Pro/f76adabefbc115192904b9e30e4fd3fdbebd0ba4/subscriptions/clash.yaml",
  "https://raw.githubusercontent.com/Shayanthn/V2ray-Tester-Pro/refs/heads/main/results.json",
  "https://raw.githubusercontent.com/Shayanthn/V2ray-Tester-Pro/refs/heads/main/subscriptions/stats.json",
  "https://raw.githubusercontent.com/Sheldonshen1982/youxuan/534ffadc9d1416227d39182b936f533691f17cf3/singbox.json",
  "https://raw.githubusercontent.com/Shelest05/Shelest-VPN/main/githubmirror/1.txt",
  "https://raw.githubusercontent.com/SherlyKinan/proxy-check/8d6945ac31f0106400687299358b7753dde33005/Subscription-9.txt",
  "https://raw.githubusercontent.com/SherlyKinan/proxy-check/b0a1b3375c0e21dfeb12229093b16239926e2029/Subscription-9.txt",
  "https://raw.githubusercontent.com/SherlyKinan/proxy-check/refs/heads/main/Subscription-1.txt",
  "https://raw.githubusercontent.com/SherlyKinan/proxy-check/refs/heads/main/Subscription-37.txt",
  "https://raw.githubusercontent.com/SherlyKinan/proxy-check/refs/heads/main/Subscription-42.txt",
  "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2025/06/json/2025-06-13.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2025/06/json/2025-06-17.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2025/06/json/2025-06-20.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2025/06/json/2025-06-25.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2025/08/json/2025-08-10.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/00c238f81c236ade34b70d65ebf34aa8499474b8/archived/github/2026/01/json/2026-01-21.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/3b6518caefa8ebbabc2cdccee10c3cf15ab98c3a/archived/github/2026/02/json/2026-02-03.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/3b6518caefa8ebbabc2cdccee10c3cf15ab98c3a/archived/github/json/2025-03-22.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/06/json/2025-06-13.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/06/json/2025-06-17.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/06/json/2025-06-20.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/06/json/2025-06-25.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/08/json/2025-08-10.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-06.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-09.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-27.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-28.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-29.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2025/12/json/2025-12-30.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/2026/01/json/2026-01-21.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/910853d1fd9390247fed42c605aa0538f7218d13/archived/github/json/2025-04-21.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/2025/12/json/2025-12-09.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/2026/02/json/2026-02-02.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/json/2025-03-20.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/json/2025-03-21.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/json/2025-03-25.json",
  "https://raw.githubusercontent.com/Shonee/awesome-hot-list/eab47fd009f71c059e445f6988e9a6031e9e8b78/archived/github/json/2025-04-21.json",
  "https://raw.githubusercontent.com/Shturmill/Traffic-Relay/9a7248f09e939ff16a0397ae5c9c95bd9f7b89da/config_all.txt",
  "https://raw.githubusercontent.com/Shturmill/Traffic-Relay/main/config_all.txt",
  "https://raw.githubusercontent.com/Shturmill/Traffic-Relay/main/new_conf.txt",
  "https://raw.githubusercontent.com/Shturmill/Traffic-Relay/refs/heads/main/config_all.txt",
  "https://raw.githubusercontent.com/ShvedovaVS/fraud-detector-project/main/base_text.txt",
  "https://raw.githubusercontent.com/SilentGhostCodes/WhiteListVpn/refs/heads/main/BlackList.txt",
  "https://raw.githubusercontent.com/SilentGhostCodes/WhiteListVpn/refs/heads/main/Whitelist%20%E2%84%962.txt",
  "https://raw.githubusercontent.com/SilentGhostCodes/WhiteListVpn/refs/heads/main/Whitelist.txt",
  "https://raw.githubusercontent.com/SimHacker/moollm/main/designs/raw-chats/no-ai-chat.txt",
  "https://raw.githubusercontent.com/SimpleHomelab/Docker-Traefik/main/commits/2022/2022_09_20.txt",
  "https://raw.githubusercontent.com/SinaM0099/Khone/b3adfe3264c7d5118668c216f54444fdceea0e92/txt.txt",
  "https://raw.githubusercontent.com/Sinaksh0/Warp-config/main/AZ.txt",
  "https://raw.githubusercontent.com/Sinaksh0/Warp-config/main/Shahamat.txt",
  "https://raw.githubusercontent.com/SirKubiac/Block-Lists/main/doh_adguard.txt",
  "https://raw.githubusercontent.com/Siva918641/Cisco-networking-projects/main/RIP/README.txt",
  "https://raw.githubusercontent.com/Siva918641/Cisco-networking-projects/main/VLAN/README.txt",
  "https://raw.githubusercontent.com/SnapdragonLee/SystemProxy/refs/heads/master/dist/clash_config_extra_US.yaml",
  "https://raw.githubusercontent.com/SolaceSamples/solace-samples-java/96e78b1adb7d069d5a86e023f5959a2c2777dc79/semp-rest-api/curl-create-queue-with-subscription.txt",
  "https://raw.githubusercontent.com/SolaceSamples/solace-samples-java/main/semp-rest-api/curl-create-queue-with-subscription.txt",
  "https://raw.githubusercontent.com/SoliSpirit/SolVPN/refs/heads/main/Countrys/Saudi_Arabia.txt",
  "https://raw.githubusercontent.com/SoliSpirit/SolVPN/refs/heads/main/Countrys/Serbia.txt",
  "https://raw.githubusercontent.com/SoliSpirit/SolVPN/refs/heads/main/Countrys/Uzbekistan.txt",
  "https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt",
  "https://raw.githubusercontent.com/SoliSpirit/mtproto/refs/heads/master/all_proxies.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Countries/Liechtenstein.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Countries/North_Macedonia.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Countries/Us.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Protocols/ss.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Protocols/vless.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Protocols/vmess.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub10.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub12.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub13.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub14.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub19.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub2.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub3.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub4.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub5.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub8.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/Subscriptions/Sub9.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/all_configs.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Countries/Germany.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Countries/Switzerland.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Protocols/ss.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Protocols/vless.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Protocols/vmess.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/Subscriptions/Sub1.txt",
  "https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/refs/heads/main/all_configs.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/89401e61925c173f283cc283c847fb0943efdb37/knowledge_collection/postgres/knowledge_sources/gpt/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/89401e61925c173f283cc283c847fb0943efdb37/knowledge_collection/postgres/knowledge_sources/manual/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/89401e61925c173f283cc283c847fb0943efdb37/knowledge_collection/postgres/tuning_lake/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/main/knowledge_collection/postgres/knowledge_sources/gpt/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/main/knowledge_collection/postgres/knowledge_sources/manual/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SolidLao/GPTuner/main/knowledge_collection/postgres/tuning_lake/max_sync_workers_per_subscription.txt",
  "https://raw.githubusercontent.com/SonzaiEkkusu/V2RayDumper/main/config.txt",
  "https://raw.githubusercontent.com/Spiritsfuse/Adv_ML_Project/main/QUICK_LINKS.txt",
  "https://raw.githubusercontent.com/SssTao/0000/b93282d502afbf34cfdfe93ba51639e31109239f/9.24.yaml",
  "https://raw.githubusercontent.com/SssTao/0000/b93282d502afbf34cfdfe93ba51639e31109239f/9.25.yaml",
  "https://raw.githubusercontent.com/SssTao/0000/b93282d502afbf34cfdfe93ba51639e31109239f/923.yaml",
  "https://raw.githubusercontent.com/Stabbath/ProMod/ca6245456fc08dae334a7fd256cb6a66659ce45d/README.txt",
  "https://raw.githubusercontent.com/StageGuard/mihomo2loon/1c7e5f5942b523e78a8faf75a8af93d675926822/docs/example_loon.conf",
  "https://raw.githubusercontent.com/StageGuard/mihomo2loon/main/conversion_output.txt",
  "https://raw.githubusercontent.com/Starlight-0208/GitHubUtils/ec96141a25fda7627153de56383362160f3a8278/data/json/shell.json",
  "https://raw.githubusercontent.com/StealthNetVPN/StealthNet/refs/heads/main/StealthNetVPN",
  "https://raw.githubusercontent.com/Stinsonysm/GO_V2rayCollector/refs/heads/main/mixed_iran.txt",
  "https://raw.githubusercontent.com/Stinsonysm/GO_V2rayCollector/refs/heads/main/trojan_iran.txt",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0419clash.yml",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0612clash.yml",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0614clash.yml",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0616clash.yml",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0622clash.yml",
  "https://raw.githubusercontent.com/Strongmiao168/Clash/0b3b962b26434ad04c59f63dec358c6f4d6c232f/0626clash.yml",
  "https://raw.githubusercontent.com/SuQin12138/Subcription_Generator/main/%E6%98%8E%E6%96%87%E6%BA%90%E5%90%97.txt",
  "https://raw.githubusercontent.com/SummerSec/BlogPapers/908fc79b45953c7b22e3fee5af57df482e8e0115/resources/vless.yaml",
  "https://raw.githubusercontent.com/Sunbird-Knowlg/knowledge-platform/0426ed6d8c91ca8494afeba9c987854ff943e496/content-api/content-service/conf/application.conf",
  "https://raw.githubusercontent.com/Sunbird-Knowlg/knowledge-platform/0426ed6d8c91ca8494afeba9c987854ff943e496/knowlg-automation/helm_charts/content/templates/content-configmap.yaml",
  "https://raw.githubusercontent.com/Sunkist228/k8s-gitops/1cd91d9012f848b43e152d3b6d2d5e8cc4036b5e/apps/openclaw/configmap-scripts.yaml",
  "https://raw.githubusercontent.com/Sunnytanbaby/clashmeta/main/123.txt",
  "https://raw.githubusercontent.com/Supprise0901/Fetch/548d77e158fc10ffce99d2d2803488e400049685/Superspeed.yaml",
  "https://raw.githubusercontent.com/Supprise0901/FreeProxies/dbd8856e0f96917bfdc681e7a78e305979dd2279/sub/sub_list.json",
  "https://raw.githubusercontent.com/Supprise0901/fetchNodes/7fd842633cb04bbdf4ca280e1e09b94b537798e7/Subs/Sub107.txt",
  "https://raw.githubusercontent.com/Supprise0901/fetchNodes/7fd842633cb04bbdf4ca280e1e09b94b537798e7/Subs/Sub118.txt",
  "https://raw.githubusercontent.com/Supprise0901/fetchNodes/7fd842633cb04bbdf4ca280e1e09b94b537798e7/Subs/Sub122.txt",
  "https://raw.githubusercontent.com/Supprise0901/fetchNodes/7fd842633cb04bbdf4ca280e1e09b94b537798e7/Subs/Sub128.txt",
  "https://raw.githubusercontent.com/TheParmak/conti-leaks-englished/45d49307f347aff10e0f088af25142f8929b4c4f/TrickBot/original/chats/vero_Chats/Chats/moby_Verto.txt",
  "https://raw.githubusercontent.com/TheParmak/conti-leaks-englished/45d49307f347aff10e0f088af25142f8929b4c4f/TrickBot/original/chats/weldon_Chats/Chats/weldon/hammer_weldon.txt",
  "https://raw.githubusercontent.com/TheParmak/conti-leaks-englished/45d49307f347aff10e0f088af25142f8929b4c4f/TrickBot/original/chats/weldon_Chats/Chats/weldon/silver_weldon.txt",
  "https://raw.githubusercontent.com/TheParmak/conti-leaks-englished/45d49307f347aff10e0f088af25142f8929b4c4f/anonfile_dumps/40.txt",
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt",
  "https://raw.githubusercontent.com/TheyCallMeSecond/config-examples/bcf3fd82850fd9c1c7fdfb392dc1c996c7df1f82/Sing-Box/Client/vless-tls-ech.json",
  "https://raw.githubusercontent.com/TheyCallMeSecond/config-examples/bcf3fd82850fd9c1c7fdfb392dc1c996c7df1f82/Sing-Box/Server/vless-gRPC.json",
  "https://raw.githubusercontent.com/ThierryCheng/diy/dc7a6aa08f650ed1355f2e367373c553fb109ca5/greatwall/qx_latest.conf",
  "https://raw.githubusercontent.com/ThomasJasperthecat/sub/main/sub4.txt.txt",
  "https://raw.githubusercontent.com/ThomasJasperthecat/sub/refs/heads/main/new_sub.txt",
  "https://raw.githubusercontent.com/ThomasJasperthecat/sub/refs/heads/main/results_rubifen_test2.txt",
  "https://raw.githubusercontent.com/ThomasJasperthecat/sub/refs/heads/main/sublist3.txt",
  "https://raw.githubusercontent.com/Threat-Insight/GUI/main/backend/trained.txt",
  "https://raw.githubusercontent.com/ThuThuat2K/ThuThuat2K/2f96d82eaaa61c941a18acf7e549d65b2dfb2818/shadowrocket_TwoK.conf",
  "https://raw.githubusercontent.com/Tikusmerdeka/MT_TUNEL/main/configuration/vless.txt",
  "https://raw.githubusercontent.com/Timur3169/Hiddify/main/Sub.txt",
  "https://raw.githubusercontent.com/Tink-Bell/StenoBee/main/stenobee/assets/user_list_common.txt",
  "https://raw.githubusercontent.com/TiraelSedai/ClubDoorman/cb258c02f12ec1dc6a9881d1e7f30fd6d5629a27/ClubDoorman/data/spam-ham.txt",
  "https://raw.githubusercontent.com/TiraelSedai/ClubDoorman/main/ClubDoorman/data/spam-ham.txt",
  "https://raw.githubusercontent.com/Tolga1452/ai-prompts/main/Lovable/prompt.txt",
  "https://raw.githubusercontent.com/TooonyChen/sbsm/f40a19d8e27ed6f97fe6a421bb684a1a4814037a/worker/openapi.yaml",
  "https://raw.githubusercontent.com/Toperlock/Clash/aec2fcd3649179334a3f071b7884ec6bcb3126c5/mihomo.yaml",
  "https://raw.githubusercontent.com/Torotin/3x-ui_pro_Docker/b1daa20fcd8806945ae07894c41cc2661db32206/docker-proxy/compose.d/12-3x-ui.yml",
  "https://raw.githubusercontent.com/Torotin/3x-ui_pro_Docker/b1daa20fcd8806945ae07894c41cc2661db32206/docker-proxy/traefik/dynamic_old/l4-tcp-vless.yml",
  "https://raw.githubusercontent.com/TrevorLeeXOR/config/be0fc6bca0926fecf02e335d676db19d8bbcce6f/singbox/mobile/config-suyou.json",
  "https://raw.githubusercontent.com/TripleA26/Proxy-Scrapper/main/links.txt",
  "https://raw.githubusercontent.com/Trix1337/vpnsub/refs/heads/main/sub.txt",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub1.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub10.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub11.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub12.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub13.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub14.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub15.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub16.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub2.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub3.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub5.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub6.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub7.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub8.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/Sub9.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub10_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub11_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub12_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub13_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub14_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub15_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub16_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub17_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub1_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub2_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub3_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub4_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub6_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub7_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub8_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/6be645cb23ad979ea188152d12cdb7715329ffe7/shuffle/Sub9_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub1.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub10.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub11.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub12.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub13.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub14.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub16.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub2.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub3.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub4.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub5.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub6.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub7.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub8.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/Sub9.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub10_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub11_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub12_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub13_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub14_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub15_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub16_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub17_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub18_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub1_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub3_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub4_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub5_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub6_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub8_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/94dc5fb9ef647c64bc50b3812587d1b753dd8b00/shuffle/Sub9_shuffled.conf",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/main/Config_by_country/server_IR.txt",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/main/Config_by_country/server_PS.txt",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/refs/heads/main/Config_by_country/server_DE.txt",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/refs/heads/main/Config_by_country/server_FR.txt",
  "https://raw.githubusercontent.com/Twitr/Free-V2ray-Collector/refs/heads/main/Config_by_country/server_HK.txt",
  "https://raw.githubusercontent.com/TwoOnefour/xray_configuration/1591704d5b78a80a3cbe73ddaeab06ab55191d25/vless-vision-reality/server.json",
  "https://raw.githubusercontent.com/UFOTVM/TV/refs/heads/main/ufo.m3u",
  "https://raw.githubusercontent.com/UIforFreedom/Free_Proxy_Nodes/ee735879ad0017f9a47b528d45952ba5c5f02091/subs/4.json",
  "https://raw.githubusercontent.com/UIforFreedom/Free_Proxy_Nodes/ee735879ad0017f9a47b528d45952ba5c5f02091/subs/5.json",
  "https://raw.githubusercontent.com/UKPLab/semeval2017-scienceie/6b4daa890d24f4bdc8a48aadee7cab20664a353f/scripts_submission/blstm_configs.txt",
  "https://raw.githubusercontent.com/USPRPC/V2APCFGS/main/CFGS.txt",
  "https://raw.githubusercontent.com/UZziell/v2ray-haproxy-docker/f56042a416005afff4888cfd09a943b603f6c5ee/v2ray-docker-client/config/config-template-with-tls.json",
  "https://raw.githubusercontent.com/UmVyZWNoYW4wMgo/QXV0b3NjcmlwdAo-/ab91bc6c82c4da5ca8fab5b6d767b9d5fa200fae/config/dual.conf",
  "https://raw.githubusercontent.com/UncensorX1/v2/main/V2/from64/sites.txt",
  "https://raw.githubusercontent.com/UncensorX1/v2/main/V2/fromsite/sites.txt",
  "https://raw.githubusercontent.com/UncensorX1/v2/refs/heads/main/V2/hy2tel/tel.txt",
  "https://raw.githubusercontent.com/UofT-HPRC/tpdp/main/licensing/modelsim_license.txt",
  "https://raw.githubusercontent.com/Utodev/DAAD-Ready/fefb0f0b153c93f2cd3ed0e3fe1b1170c83a4968/TOOLS/openmsx/doc/release-history.txt",
  "https://raw.githubusercontent.com/V2023H/xxx_box/6aece808a78f9495049a510e2097cacf8fefa467/xxx_box/box_list.json",
  "https://raw.githubusercontent.com/V2MA-VPN-CONFIGS/V2MA-vpn-v2ray-configs/refs/heads/main/free%20sub/10@v2ma_apk%20-SPECIAL-(IRANCELL)-1azar.txt",
  "https://raw.githubusercontent.com/V2MA-VPN-CONFIGS/V2MA-vpn-v2ray-configs/refs/heads/main/free%20sub/14@v2ma_apk%20-%20Multi90%20-%2012dey.txt",
  "https://raw.githubusercontent.com/V2MA-VPN-CONFIGS/V2MA-vpn-v2ray-configs/refs/heads/main/free%20sub/23@v2ma_apk(3-12-404)%D9%87%D9%85%D8%B1%D8%A7%D9%87.txt",
  "https://raw.githubusercontent.com/V2MA-VPN-CONFIGS/V2MA-vpn-v2ray-configs/refs/heads/main/free%20sub/25@v2ma_apk(6-12-404)%D9%87%D9%85%D8%B1%D8%A7%D9%87.txt",
  "https://raw.githubusercontent.com/V2MA-VPN-CONFIGS/V2MA-vpn-v2ray-configs/refs/heads/main/free%20sub/27@v2ma_apk(6-12-404)wifi%D9%85%D8%AE%D8%A7%D8%A8%D8%B1%D8%A7%D8%AA.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/main/Config/shadowsocks.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/main/Config/vless.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/main/Config/vmess.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/refs/heads/main/Config/shadowsocks.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/refs/heads/main/Config/vless.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2RayConfig/refs/heads/main/Config/vmess.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2Root-ConfigPilot/main/output/BestConfigs.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2Root-ConfigPilot/refs/heads/main/output/BestConfigs.txt",
  "https://raw.githubusercontent.com/V2RayRoot/V2Root-ConfigPilot/refs/heads/main/output/BestConfigs_scored.json",
  "https://raw.githubusercontent.com/V3SAKURAAIRIV3/BotDejavuV3/main/multipath/vless.txt",
  "https://raw.githubusercontent.com/VP01596/vless-top15/refs/heads/main/All.txt",
  "https://raw.githubusercontent.com/VPN-Subcription-Links/ClashX-V2Ray-TopFreeProxy/main/combine/v2raysub.txt",
  "https://raw.githubusercontent.com/VXWK-solo/shadowtunnel/35a21b9f7606840899badee3b5c394b740caa7ed/config.cfg",
  "https://raw.githubusercontent.com/VXWK-solo/shadowtunnel/35a21b9f7606840899badee3b5c394b740caa7ed/roles/client/tasks/main.yml",
  "https://raw.githubusercontent.com/VXWK-solo/shadowtunnel/35a21b9f7606840899badee3b5c394b740caa7ed/roles/xray/defaults/main.yml",
  "https://raw.githubusercontent.com/VXWK-solo/shadowtunnel/35a21b9f7606840899badee3b5c394b740caa7ed/roles/xray/tasks/main.yml",
  "https://raw.githubusercontent.com/VZiChoushaDui/Libertea/8eda816ae8f39ea0fc9be7f683108a9bd7ae7674/haproxy/haproxy.cfg",
  "https://raw.githubusercontent.com/Varsett/Quas/96da262c0ca879121fe5e6249adf87eb713ce5ba/menueng.txt",
  "https://raw.githubusercontent.com/Varsett/Quas/main/menueng.txt",
  "https://raw.githubusercontent.com/Vauth/hueco/7389387f0d986ec8777a54e59c4e728c82cb55d5/v.txt",
  "https://raw.githubusercontent.com/Vauth/hueco/main/v.txt",
  "https://raw.githubusercontent.com/Vauth/hueco/refs/heads/main/v.txt",
  "https://raw.githubusercontent.com/Veridax/privapi/fd528906df6bae10312f040bd4e8b8469ad3ef3f/APIs/hsbc.com/1.0.0/swagger.yaml",
  "https://raw.githubusercontent.com/Victor725/PySASTBench/main/cve_collect/python_cve_collect/repositories.txt",
  "https://raw.githubusercontent.com/Viktor45/mh-templates/28b15436e4cbada2644ecfc54becdddbe806386e/stargate-lite.yaml",
  "https://raw.githubusercontent.com/Viktor45/sub-filter/3412d4ebdc43d5b0b20a6c2fbaf2efd9d1525a3c/config/rules.yaml",
  "https://raw.githubusercontent.com/Viktor45/sub-filter/main/config/sub.txt",
  "https://raw.githubusercontent.com/VoltzEngine-Project/Engine/ce7b310b41b7930598acc75cf4b56e36efbff143/runConfigs.txt",
  "https://raw.githubusercontent.com/Voring/tools/refs/heads/main/jiedian.yaml",
  "https://raw.githubusercontent.com/Vosanat/Crypta_lab_3/main/input.txt",
  "https://raw.githubusercontent.com/VpnNetwork01/vpn-net/main/README.md",
  "https://raw.githubusercontent.com/Vsjiasu/Vsjiasu/main/v2ray.txt",
  "https://raw.githubusercontent.com/VulnerabilityHistoryProject/mega-foss/4829eeb7b0101570abbc87d2a697f2c0c2f4e5c3/src/cve/FOSS_composite_score/composite_score_scripts/github_data_from_api/stars_12000_to_12999_data.json",
  "https://raw.githubusercontent.com/WSJuJuB01/WS_Parser/refs/heads/main/subscription.txt",
  "https://raw.githubusercontent.com/WTP2453/pac/main/clash.txt",
  "https://raw.githubusercontent.com/Wahhab-Zendehdel/SM-Telegram-Config-Collector-iossingbox/main/collected_configs/countries/se/mixed.txt",
  "https://raw.githubusercontent.com/Wboyx/v2ray-sub/refs/heads/main/sub.txt",
  "https://raw.githubusercontent.com/Weaxs/V2Ray-Trojan__Docker/6fb2202eb5d9544d163a3e6d9281838f4c28a5b1/docker-compose.v2fly4.vless-vmess-trojan.yaml",
  "https://raw.githubusercontent.com/Weaxs/V2Ray-Trojan__Docker/6fb2202eb5d9544d163a3e6d9281838f4c28a5b1/v2fly4.vless-vmess-trojan-shadowsocks/nginx/conf.d/ssl.conf",
  "https://raw.githubusercontent.com/Weaxs/V2Ray-Trojan__Docker/6fb2202eb5d9544d163a3e6d9281838f4c28a5b1/v2fly4.vless-vmess-trojan/nginx/conf.d/ssl.conf",
  "https://raw.githubusercontent.com/Weaxs/V2Ray-Trojan__Docker/6fb2202eb5d9544d163a3e6d9281838f4c28a5b1/v2fly5.vmess-trojan-shadowsocks/nginx/conf.d/ssl.conf",
  "https://raw.githubusercontent.com/Weaxs/V2Ray-Trojan__Docker/6fb2202eb5d9544d163a3e6d9281838f4c28a5b1/v2fly5.vmess-trojan-shadowsocks/nginx/nginx.conf",
  "https://raw.githubusercontent.com/WhiteBite/Isolate/14afe8b74def25877a03955a0df753af67d77ad4/src/lib/i18n/locales/en.json",
  "https://raw.githubusercontent.com/Whomrx666/X-wpbf/main/pw1.txt",
  "https://raw.githubusercontent.com/WhymustIhaveaname/libtglang-phase2/cad6f402f344565be31d3970698678effd72fcda/ml2023-r1-dataset/33/33977f8312a208053710-OTHER.txt",
  "https://raw.githubusercontent.com/WhymustIhaveaname/libtglang-phase2/main/ml2023-r1-dataset/33/33977f8312a208053710-OTHER.txt",
  "https://raw.githubusercontent.com/WhymustIhaveaname/libtglang-phase2/refs/heads/main/ml2023-r1-dataset/00/001793dc22394579d1a0-OTHER.txt",
  "https://raw.githubusercontent.com/WhymustIhaveaname/libtglang-phase2/refs/heads/main/ml2023-r1-dataset/86/86b01c6807e6be84e836-OTHER.txt",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-01-30/freeList-2023-01-30.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-01-31/freeList-2023-01-31.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-01/freeList-2023-02-01.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-11/freeList-2023-02-11.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-12/freeList-2023-02-12.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-13/freeList-2023-02-13.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-14/freeList-2023-02-14.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-15/freeList-2023-02-15.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-16/freeList-2023-02-16.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-17/freeList-2023-02-17.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-19/freeList-2023-02-19.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-20/freeList-2023-02-20.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-02-21/freeList-2023-02-21.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-19/freeList-2023-03-19.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-20/freeList-2023-03-20.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-21/freeList-2023-03-21.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-22/freeList-2023-03-22.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-23/freeList-2023-03-23.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-24/freeList-2023-03-24.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-25/freeList-2023-03-25.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-26/freeList-2023-03-26.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-27/freeList-2023-03-27.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-28/freeList-2023-03-28.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-29/freeList-2023-03-29.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-30/freeList-2023-03-30.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-03-31/freeList-2023-03-31.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-01/freeList-2023-04-01.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-02/freeList-2023-04-02.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-03/freeList-2023-04-03.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-04/freeList-2023-04-04.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-05/freeList-2023-04-05.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-06/freeList-2023-04-06.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-07/freeList-2023-04-07.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-08/freeList-2023-04-08.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-09/freeList-2023-04-09.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-10/freeList-2023-04-10.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-11/freeList-2023-04-11.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-12/freeList-2023-04-12.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-13/freeList-2023-04-13.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-14/freeList-2023-04-14.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-15/freeList-2023-04-15.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-16/freeList-2023-04-16.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-17/freeList-2023-04-17.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-18/freeList-2023-04-18.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-19/freeList-2023-04-19.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-20/freeList-2023-04-20.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-23/freeList-2023-04-23.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-24/freeList-2023-04-24.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-25/freeList-2023-04-25.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-26/freeList-2023-04-26.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-28/freeList-2023-04-28.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-29/freeList-2023-04-29.json",
  "https://raw.githubusercontent.com/Wiederhoeft/okjiasu_action/refs/heads/main/package/okjiasu/free/2023-04-30/freeList-2023-04-30.json",
  "https://raw.githubusercontent.com/Wildcat2k21/KrakenApiServer/7e6965846d353ea333550460bea4f7677927b5bf/x-ray-config.json",
  "https://raw.githubusercontent.com/Wordcab/wordcab-transcribe/main/faster-whisper/faster_whisper.egg-info/SOURCES.txt",
  "https://raw.githubusercontent.com/Wpenga/QvPersonal/8a284c9e1f23f3655cf855543cf7c283719d52ad/assets/ProtocolSchemes.txt",
  "https://raw.githubusercontent.com/Wzsad/online/e235f9e8b1c7d24b3e70691078b85d8230833458/data/333.txt",
  "https://raw.githubusercontent.com/XGudron/UA3REO-DDC-Transceiver/main/CHANGELOG.txt",
  "https://raw.githubusercontent.com/XIIIFOX/flutter_vless/eb59da4fda2592938b640c7a88da5f626569d836/example/pubspec.yaml",
  "https://raw.githubusercontent.com/XMPlusDev/XMPlus/562f36463e31b2472f15df908d69545a482c9c41/files/config.yml",
  "https://raw.githubusercontent.com/XTLS/XTLS.github.io/cac600e506ee66f2b1a464f017d426af43653819/llms.txt",
  "https://raw.githubusercontent.com/XTLS/Xray-examples/6c2b874fa231e62711672ae78044fb3f78b1a47f/All-in-One-fallbacks-Nginx/nginx.conf",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/65b4707e47c61a7614034a84381fea74de0fbac7/mci.txt",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/65b4707e47c61a7614034a84381fea74de0fbac7/mtn.txt",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/main/mci.txt",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/main/mtn.txt",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/refs/heads/main/adsl.txt",
  "https://raw.githubusercontent.com/XYZMojtaba/sub/refs/heads/main/mtn.txt",
  "https://raw.githubusercontent.com/Xanir360/Androidiatak/main/Androidiatak.txt",
  "https://raw.githubusercontent.com/XigmaDev/xigmaDev/a25843c39c9a0a2509a48ef487206f6210de6f49/conf/sing-box-example.json",
  "https://raw.githubusercontent.com/XrayR-project/XrayR-release/3611f177d77dc86410bdea4bec436889b4d18420/config/config.yml",
  "https://raw.githubusercontent.com/Xtended-Devices/DevicesChangelog/1fa6c845f35801a2006a7227787e0d66bb07d7ff/daisy.txt",
  "https://raw.githubusercontent.com/YFTree/ClashNodes/refs/heads/main/V2Ray/1.txt",
  "https://raw.githubusercontent.com/YaChengMu/my_clash_url/ee2cde56d43c860b70d946efec24dbfba61d10d9/nodeShare.yaml",
  "https://raw.githubusercontent.com/YasserDivaR/pr0xy/cae63e8c8839ca4687adaa78b5c36f634a63cb2f/mycustom1.txt",
  "https://raw.githubusercontent.com/YasserDivaR/pr0xy/main/ShadowSocks2021.txt",
  "https://raw.githubusercontent.com/YawStar/Proxy-Hunter/refs/heads/main/configs/channel_stats.json",
  "https://raw.githubusercontent.com/YawStar/Proxy-Hunter/refs/heads/main/configs/proxy_configs.txt",
  "https://raw.githubusercontent.com/YidingPi/Repository-Insights/main/raw_data/GITHUB_OUTPUT/952_HariSekhon_DevOps-Python-tools.txt",
  "https://raw.githubusercontent.com/YidingPi/Repository-Insights/main/refined_data/GITHUB_OUTPUT_REFINED_SIMILARITY/648_952_HariSekhon_DevOps-Python-tools.txt_SIMILARITY.txt",
  "https://raw.githubusercontent.com/YooLc/subcon/fbf3daae12318b709539fa067d9c6ff7aee08e89/schema/vless.yaml",
  "https://raw.githubusercontent.com/Ysurac/openmptcprouter-vps/cbe8aeca3962cb865558cde1b18e722ad8c5d1af/xray-vless-reality.json",
  "https://raw.githubusercontent.com/Yumipk/Rules/5239a4124024e560359d1fbf0e14b5e343645ecf/%E9%85%8D%E7%BD%AE/0519whg122%E9%9B%B6%E2%AD%90%EF%B8%8Fconfig.yaml",
  "https://raw.githubusercontent.com/Yumipk/Rules/5239a4124024e560359d1fbf0e14b5e343645ecf/%E9%85%8D%E7%BD%AE/8.23wwqgtxx_config.yaml",
  "https://raw.githubusercontent.com/Zawh-cpu/CSShroud_Bot/cdd576dc58569280b7348d5ecccf8567af846442/src/infrastructure/localization/ru-RU.json",
  "https://raw.githubusercontent.com/ZeLiYT/iced/refs/heads/main/mixed.txt",
  "https://raw.githubusercontent.com/Zeeeepa/analyzer/20902c204d7a91ea58dd320d7af156a4ab564112/GIT.json",
  "https://raw.githubusercontent.com/Zefan-Cai/KVCache-Factory/main/csrc/log.txt",
  "https://raw.githubusercontent.com/ZeiZel/self-hosted/49bbee9d2f8b03cf25900e66b64b6ae02b3f7318/kubernetes/charts/remnawave/Chart.yaml",
  "https://raw.githubusercontent.com/ZoeWithTheE/zipline/6cf3c5e11224dfefdcf0ab7a7bc9fcfe8fce37a8/pnpm-lock.yaml",
  "https://raw.githubusercontent.com/Zulfatok/Rule_provider/refs/heads/main/proxy_provider/ACC_Config_ID.yaml",
  "https://raw.githubusercontent.com/Zusyaku/Hacking-Software/main/1))%20link.txt",
  "https://raw.githubusercontent.com/Zzj0018/OpenClash/d4c4680969fdd865f822a229b9be22ba1150bdc7/%E6%96%B0.yaml",
  "https://raw.githubusercontent.com/Zzj0018/OpenClash/d4c4680969fdd865f822a229b9be22ba1150bdc7/%E9%85%8D.yaml",
  "https://raw.githubusercontent.com/a736240087/XrayR-release/9a5313de4a9189076f2c8cac4018109fd432747b/config/config.yml",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/a0cf17eb782656c3499f557a0565a9f023148f02/sub/2406/240612.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240103.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240106.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240111.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240122.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240123.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240127.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2401/240129.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240201.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240203.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240210.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240214.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240215.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240216.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240221.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240227.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2402/240229.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240301.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240303.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240305.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240306.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240307.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240310.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240311.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240312.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240314.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240315.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240317.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240320.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240326.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2403/240327.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240401.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240404.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240406.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240407.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240410.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240413.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240417.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240418.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240419.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240420.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240422.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2404/240424.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240510.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240511.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240513.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240514.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240521.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240525.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240527.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240529.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240530.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2405/240531.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240601.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240602.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240603.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240605.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240607.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240611.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240616.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240620.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240624.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240625.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240626.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240627.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240628.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2406/240630.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240702.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240704.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240708.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240710.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240711.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240713.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240714.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240715.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240716.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240718.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240719.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240720.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240724.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240725.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240726.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240727.txt",
  "https://raw.githubusercontent.com/a97083435/Autoproxy/refs/heads/main/sub/2407/240728.txt",
  "https://raw.githubusercontent.com/a97083435/tang/refs/heads/main/wang/202309/01/06/%F0%9F%87%B8%F0%9F%87%ACSG_5.44.249(144tj).txt",
  "https://raw.githubusercontent.com/aQa-MoHaMad-DaRk/BNAOQ9WK/refs/heads/main/MeVIP.txt",
  "https://raw.githubusercontent.com/aSailorWithoutTheSea/SailorConf-public/39b0e976f81e6fb6cfdf08b7ee063dbb6027624a/@HedWigV2ray.txt",
  "https://raw.githubusercontent.com/aSailorWithoutTheSea/SailorConf-public/main/output/sub4.txt",
  "https://raw.githubusercontent.com/aSailorWithoutTheSea/SailorConf-public/main/output/sub6.txt",
  "https://raw.githubusercontent.com/aSailorWithoutTheSea/SailorConf-public/refs/heads/main/cnf.txt",
  "https://raw.githubusercontent.com/aa1555/Repository/0f9b7dee946a85470a5e23066508fd28dbed0fac/Nodes/V2Ray.txt",
  "https://raw.githubusercontent.com/aa1555/Repository/main/Nodes/V2Ray.txt",
  "https://raw.githubusercontent.com/abadan6262/V2/main/1.txt",
  "https://raw.githubusercontent.com/abadan6262/V2/refs/heads/main/1.txt",
  "https://raw.githubusercontent.com/abbasdvd3/abbasdvd10/69ba3abd11740a0f6fc99b6b7ee72521cc89e7ff/Untitled111.yml",
  "https://raw.githubusercontent.com/abbasdvd3/abbasdvd10/69ba3abd11740a0f6fc99b6b7ee72521cc89e7ff/irancell4.yaml",
  "https://raw.githubusercontent.com/abbasdvd3/clash/df76870cf328e8ece7a7fdcb213126246cde8cc3/rule_provider/SUB%20LINKS.txt",
  "https://raw.githubusercontent.com/abbasdvd3/clash/df76870cf328e8ece7a7fdcb213126246cde8cc3/rule_provider/Untitled111.yml",
  "https://raw.githubusercontent.com/abbasdvd3/clash/main/rule_provider/SUB%20LINKS.txt",
  "https://raw.githubusercontent.com/abc123-hash-boop/vpn-config/55f323fec5659a67fb6dbc736031834363f2b2ae/config.yml",
  "https://raw.githubusercontent.com/abc15018045126/node-cf-worker-deno-vless-xu/285e795889cbda95ee98a14a9d6e4efdf0357cfd/1.txt",
  "https://raw.githubusercontent.com/abdennour186/Spam-classification/main/vocab.txt",
  "https://raw.githubusercontent.com/abolfazll-hjs/confing/refs/heads/main/sub.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/NetworkManager2-netpal-systemd-networkd.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/kubernetes-cluster.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/local-address.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/nedodelano/%D0%BD%D0%B5%D0%B4%D0%BE%D0%B4%D0%B5%D0%BB%D0%B0%D0%BD%D0%BE6.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/nginx.txt",
  "https://raw.githubusercontent.com/aceqbaceq/docs/24a7296aa0ee4af53765b48b8b9565e7da9f4afe/nmcli-NetworkManager-Networkd-netplan.txt",
  "https://raw.githubusercontent.com/actionsfz/v2ray/refs/heads/master/all.yaml",
  "https://raw.githubusercontent.com/acymz/AutoVPN/refs/heads/main/data/V2.txt",
  "https://raw.githubusercontent.com/ad1822/cloudOps/main/Terraform/script/policies.txt",
  "https://raw.githubusercontent.com/adamsulemanji/CourseMonitoring/main/help.txt",
  "https://raw.githubusercontent.com/adel00a/VP/main/VN%20D.txt",
  "https://raw.githubusercontent.com/adiwzx/freenode/main/adinetmuisc.yml",
  "https://raw.githubusercontent.com/adiwzx/freenode/main/adispeed.txt",
  "https://raw.githubusercontent.com/adiwzx/freenode/main/adispeed.yml",
  "https://raw.githubusercontent.com/adj4820x2000/high_res_stereo/main/ReadMe.txt",
  "https://raw.githubusercontent.com/ads1986/software-engineer-roadmap/main/Study_Guide.txt",
  "https://raw.githubusercontent.com/afighter188/mixed-protocol-configs/main/configs.txt",
  "https://raw.githubusercontent.com/afighter188/mixed-protocol-configs/refs/heads/main/configs.txt",
  "https://raw.githubusercontent.com/agentic-community/mcp-gateway-registry/main/docs/llms.txt",
  "https://raw.githubusercontent.com/aghapesar1374/My-V2ray-Subs/8c28a1da7b452f9fb5410e5c0dab9f3330ee7b5b/Mcibackup.txt",
  "https://raw.githubusercontent.com/aghapesar1374/My-V2ray-Subs/main/Lte_main.txt",
  "https://raw.githubusercontent.com/aghapesar1374/My-V2ray-Subs/main/Mcibackup.txt",
  "https://raw.githubusercontent.com/aghapesar1374/My-V2ray-Subs/refs/heads/main/Lte_main.txt",
  "https://raw.githubusercontent.com/aghapesar1374/v2ray-subs/bc998d7ecd9142048955dae813d8f1789d0153cd/.github/workflows/main.yml",
  "https://raw.githubusercontent.com/aghilechresh83/c-o-n-f/main/Aghil.txt",
  "https://raw.githubusercontent.com/aghilechresh83/c-o-n-f/main/mix.txt",
  "https://raw.githubusercontent.com/aghilechresh83/c-o-n-f/refs/heads/main/mix.txt",
  "https://raw.githubusercontent.com/aheig/bak/main/guowai.txt",
  "https://raw.githubusercontent.com/ahwazi12/kn-panel/main/Con/Ahwaz.txt",
  "https://raw.githubusercontent.com/aiboboxx/v2rayfree/refs/heads/main/README.md",
  "https://raw.githubusercontent.com/aidouKing123/kxsw123-/b858d594ebc926838a18d90b88228b297a1ca532/vless_replaced_20251026_085117.txt",
  "https://raw.githubusercontent.com/aidouKing123/kxsw123-/main/vless_replaced_20251026_085117.txt",
  "https://raw.githubusercontent.com/aiforsec/LADDER/main/notebooks/150_all.txt",
  "https://raw.githubusercontent.com/aikongmeng/daily-node-scraper/main/nodes_list.txt",
  "https://raw.githubusercontent.com/aiman-munawar/Ruby_practice/main/LEGAL.txt",
  "https://raw.githubusercontent.com/aiman6abed/CAIPO/main/code.txt",
  "https://raw.githubusercontent.com/ajunw/zwc/8636e4d333b83f67cef5d6d2f3165f87d70f3ce6/C.yaml",
  "https://raw.githubusercontent.com/ajunw/zwc/main/clash.txt",
  "https://raw.githubusercontent.com/akashasmaul/ProxVPN/085c519b59951f28db7e7ed857a05ab7c1b43be3/prox.txt",
  "https://raw.githubusercontent.com/akashasmaul/ProxVPN/main/prox.txt",
  "https://raw.githubusercontent.com/akhon/xray-configs/31b1966264b71d7d49548a9604c55c9828e3afaf/xray-core-vless-reality.json",
  "https://raw.githubusercontent.com/al9irez/MrMarvani/refs/heads/main/Mr.json",
  "https://raw.githubusercontent.com/alaym3/musician-network-analysis/main/Wikipages/Jim%20Carrey.txt",
  "https://raw.githubusercontent.com/albertvisser/scripts/7bf04fcff07efdee739bcfae509a0067f33404ec/bin-scripts.conf",
  "https://raw.githubusercontent.com/alcastelo/github-tail/1e15b43fdc864c3e500db29dd59660a017fa9458/data/projects.json",
  "https://raw.githubusercontent.com/alex-pancho/worm_ru/9f3a98327ff976b77b42772f084653dba92e6c32/docs/_sources/224Glava21.04.rst.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/e72d5dc6f769521ce7c370f15c3dc57dd03c9c36/Config%20list14.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/e72d5dc6f769521ce7c370f15c3dc57dd03c9c36/Config%20list7.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/main/Config%20list14.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/main/Config%20list16.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/main/Config%20list20.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/main/Config%20list4.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/main/Config%20list5.txt",
  "https://raw.githubusercontent.com/alexanderofficial09/testtt/refs/heads/main/Config%20list29.txt",
  "https://raw.githubusercontent.com/alexch33/super-video-downloader/d98764ef4c5ee8f567a8aa58978d0c399f3679ef/app/libs/libv2ray.txt",
  "https://raw.githubusercontent.com/alexxoid/domaislists/572ae62a97e5ad632ef55710be560e576a21ae28/singbox-config-example.json",
  "https://raw.githubusercontent.com/alexyao2015/xtls-vpn/ba1932de644051d9c52e47ebb193bbe7ffe89ede/rootfs/etc/xray/clients/2_xhttp_reality.yaml",
  "https://raw.githubusercontent.com/alicivil/test1/refs/heads/main/mci.txt",
  "https://raw.githubusercontent.com/alihusainsorathiya/v2gram/6297a1c5ac321fe573c783dc48c2063acd25a1ef/json/configs.json",
  "https://raw.githubusercontent.com/alihusainsorathiya/v2gram/6297a1c5ac321fe573c783dc48c2063acd25a1ef/meta/vless.yml",
  "https://raw.githubusercontent.com/alihusainsorathiya/v2gram/88002edcd5c922a8841945d57ccbe532f03e7035/meta/vless.yml",
  "https://raw.githubusercontent.com/alihusainsorathiya/v2gram/b6882fa308126a19b191238b998e2251a559162e/meta/vless.yml",
  "https://raw.githubusercontent.com/alimirabi2023-rgb/Vless-sub/main/sub.txt",
  "https://raw.githubusercontent.com/alimirabi2023-rgb/Vless-sub/refs/heads/main/sub.txt",
  "https://raw.githubusercontent.com/alimohamdiwj/OGABNET_bot/be60b0ff5adfd2dd6b57dfba499841691f06e715/configs/config_1day.txt",
  "https://raw.githubusercontent.com/alimohamdiwj/OGABNET_bot/main/configs/config_1day.txt",
  "https://raw.githubusercontent.com/alingse/go-linter-runner/main/source/top.8k.txt",
  "https://raw.githubusercontent.com/alirashidnahal/V2ray-Config-Collector/main/Sub1.txt",
  "https://raw.githubusercontent.com/alireza-rasouli/VPN/90dcf7a09c443b18cedd0c04b26d8f154e3f3aee/testing.yaml",
  "https://raw.githubusercontent.com/alireza0c0/alireza-vps/main/A-config.txt",
  "https://raw.githubusercontent.com/allanger/allangers-charts/a96b0542a9a1fe307285651e835098f8e64e008c/charts/server-xray/values.yaml",
  "https://raw.githubusercontent.com/allonmymind/HangUp/main/Nodes/Free.txt",
  "https://raw.githubusercontent.com/alsyundawy/TrustPositif/main/doh-vpn-proxy-bypass-onlydomains.txt",
  "https://raw.githubusercontent.com/alternoegraha/releases/main/changelogs/lineage.txt",
  "https://raw.githubusercontent.com/alternoegraha/releases/main/changelogs/pixelage.txt",
  "https://raw.githubusercontent.com/alternoegraha/releases/main/changelogs/pixelos.txt",
  "https://raw.githubusercontent.com/amalmurali47/linux-default-file-locations/main/centos_8/text_files.txt",
  "https://raw.githubusercontent.com/amalmurali47/linux-default-file-locations/main/fedora_34/text_files.txt",
  "https://raw.githubusercontent.com/amatol/xkeen-configuration/b2cbaf304f18f82bd6c0b01f25fadc7ee80ef635/05_routing.json",
  "https://raw.githubusercontent.com/amin206550/mehdi/main/messages.txt",
  "https://raw.githubusercontent.com/amin206550/mehdi/refs/heads/main/FAMILY.txt",
  "https://raw.githubusercontent.com/amin206550/mehdi/refs/heads/main/MOHSEN.txt",
  "https://raw.githubusercontent.com/amin206550/mehdi/refs/heads/main/mehdi.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/8f98741d8583e88ea0fdff452952230ac57b9234/provider-list.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/8f98741d8583e88ea0fdff452952230ac57b9234/vless_config.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/8f98741d8583e88ea0fdff452952230ac57b9234/vless_config_with_fragment.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/main/provider-list.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/main/vless_config.txt",
  "https://raw.githubusercontent.com/amin4139/share_file/refs/heads/main/Fastly_ConfigTestV2rayNG",
  "https://raw.githubusercontent.com/aminahmadian/Site-panel/refs/heads/main/config.json",
  "https://raw.githubusercontent.com/amindzlvess-boop/SlashVPN/refs/heads/main/vpn.txt",
  "https://raw.githubusercontent.com/aminjz/MySub/refs/heads/main/AminSub.txt",
  "https://raw.githubusercontent.com/amir0zar/TBot/main/src/Notes.txt",
  "https://raw.githubusercontent.com/amiralira/Maktabkhooneh_Advanced_Python_Jadi/main/S05_final_project/ReadMe.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/0324b242167174dbe6dfd53eed59d1b433c2cdc9/repository/Sub3.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub1.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub10.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub11.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub12.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub13.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub14.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub2.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub3.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub4.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub5.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub6.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub7.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub8.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/main/repository/Sub9.txt",
  "https://raw.githubusercontent.com/amirarsalan3602/zoonv_checker/refs/heads/main/repository/Sub14.txt",
  "https://raw.githubusercontent.com/amirkma/proxykma/main/mix.txt",
  "https://raw.githubusercontent.com/amirsolo2005/qaz/refs/heads/main/sub.txt",
  "https://raw.githubusercontent.com/amnezia-vpn/xray-serialization/a1714809cc470ff61cd9d4a98a9a3320d3efbb53/CMakeLists.txt",
  "https://raw.githubusercontent.com/anaer/Sub/main/clash.yaml",
  "https://raw.githubusercontent.com/anaer/Sub/refs/heads/main/clash.yaml",
  "https://raw.githubusercontent.com/anderson84PROGETOS/anderson84PROGETOS/90a0bbaee1c15cf4b7efdf6698529abd81e9106c/lista.txt",
  "https://raw.githubusercontent.com/andrey4d/xray-chart/5292b139527025aa1ed4c16a7cf3945b6f8ebd91/xray-core/values.yaml",
  "https://raw.githubusercontent.com/anjue39/openit/a3acc64842f58fe159eedc7c03dc75ec3ca3d5d5/utils/pool/config.yaml",
  "https://raw.githubusercontent.com/antirez/hnstyle/cc704c1d993f1704c6cae7fc40cd0d69a408ef9f/top.txt",
  "https://raw.githubusercontent.com/antirez/hnstyle/main/top.txt",
  "https://raw.githubusercontent.com/antonisa/embeddings/eea604898efd44156a938dcea17e87753f2340c4/rejected_entries/spa-rus.5000-6500.txt",
  "https://raw.githubusercontent.com/antonkomarev/github-trending-archive/70c35a1010d7c33497ababb5685b53861aa6c6cd/archive/repository/2022/2022-05-15/shell.json",
  "https://raw.githubusercontent.com/antonkomarev/github-trending-archive/70c35a1010d7c33497ababb5685b53861aa6c6cd/archive/repository/2025/2025-09-24/html.json",
  "https://raw.githubusercontent.com/antonkomarev/github-trending-archive/70c35a1010d7c33497ababb5685b53861aa6c6cd/archive/repository/2025/2025-10-13/html.json",
  "https://raw.githubusercontent.com/antonmarin/platform/bd5157b168f5554a0b15d9999a29c309bde4716d/portainer/3x/compose.yml"
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

// Проверка доступности хоста и порта (TCP Handshake / TCP Ping в стиле NekoBox+)
function checkTcpPing(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(PING_TIMEOUT);

    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(status);
    });

    socket.connect(parseInt(port, 10), host);
  });
}

// ======================== ГЛАВНЫЙ ПРОЦЕСС ========================
async function main() {
  console.time("⏱️ Общее время выполнения");
  console.log(`🚀 Запуск фильтратора источников...`);
  
  const sources = discoverSources();
  const rawTexts = await fetchAllSourcesParallel(sources);
  
  const candidateConfigs = [];
  const seenUrls = new Set();
  const seenServers = new Set(); 
  let totalExtracted = 0;
  let rejectedByFilters = 0;

  console.log("⚙️ Парсинг, фильтрация по SNI/CIDR и дедупликация...");

  for (const text of rawTexts) {
    if (candidateConfigs.length >= MAX_CONFIGS) break;
    const matches = extractConfigsFromText(text);
    
    for (let line of matches) {
      if (candidateConfigs.length >= MAX_CONFIGS) break;
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
      const label = `${flag} OBWL | ${currentSni}`;
      
      candidateConfigs.push({
        configString: `${urlPart}#${label}`,
        host: hostOrIp,
        port: port
      });
    }
  }

  console.log(`\n📊 Найдено сырых конфигураций: ${totalExtracted}`);
  console.log(`✂️ Отсеяно фильтрами: ${rejectedByFilters}`);
  console.log(`🔍 Проверка доступности (TCP Ping) для ${candidateConfigs.length} отфильтрованных серверов...`);

  // Проверяем пингом только прошедшие фильтрацию сервера паралелльными пачками
  const finalConfigs = [];
  let index = 0;

  async function pingWorker() {
    while (index < candidateConfigs.length) {
      const item = candidateConfigs[index++];
      const isAlive = await checkTcpPing(item.host, item.port);
      if (isAlive) {
        finalConfigs.push(item.configString);
      }
    }
  }

  const pingWorkers = Array.from({ length: Math.min(PING_PARALLEL_LIMIT, candidateConfigs.length) }, pingWorker);
  await Promise.all(pingWorkers);

  console.log(`✅ Итого добавлено живых: ${finalConfigs.length}`);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const header = `#profile-title: OBWL\n#profile-update-interval: 1\n#announce: 👑 База прокси OBWL | Всего: ${finalConfigs.length} | ${timestamp} UTC\n\n`;
  
  fs.writeFileSync('configs.txt', header + finalConfigs.join('\n'));
  console.log('💾 Результат успешно сохранен в configs.txt!');
  console.timeEnd("⏱️ Общее время выполнения");
}

main();
