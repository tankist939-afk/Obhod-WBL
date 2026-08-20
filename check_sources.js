const fs = require('fs');
const https = require('https');
const http = require('http');

const sources = [
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/selected.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/wl.txt",
  "https://gitverse.ru/api/repos/bywarm/rser/raw/branch/master/merged.txt",
  "https://raw.githubusercontent.com/arhivedxx7/Keyfreetee/refs/heads/main/RKPdee",
  "https://baronnnn.online/exec?url=http%3A%2F%2F77.110.104.181%3A5002%2Fsub%2FUnVUZywxNzg1MjExMzA41gFLhEIf7k",
  "https://gist.githubusercontent.com/Santa221/3477191e6307fc475ca0fdfefdf0abe5/raw/SANTA",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeOCh1eOFo0eb1FAfxPZ1iNjq2DaSyibM0BiX7aFVQPOCr5TB6YStAUugDUSZmeIq6gMGqXu8WlLO16GqFe7IQCw%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=cinZa8HatBaIVylElsc%2B0p2hqFgHs2NUsg9TXUIpDoVqMBmTu9cR8EJaKVX4oYKMMVESrt4jkAhDg/R7lNWc%2BQ%3D%3D",
  "https://is.wepogp.gay/bypass-hwid-lock-3z5O6BFAaJQzGlamvtSo?payload=teJa5U1EevPjDrwxP9eAeArtpaVCD9oExsYZPNhmu0V5X02YvaoSzkj%2B0XFqb%2BehYP7alm1UAjMJFfmCuVVbBaqcHQKcft6YIsKkSxQU40w%3D",
  "https://ru-macros.alexanderoff.ru/macros?url=https://176.123.165.127:2096/sub/e01nqhiuy0paipl1",
  "https://gist.githubusercontent.com/SoloRepozSF/7810f115b912e7640a11809863045755/raw/SANTA",
  "https://gist.githubusercontent.com/arhivedxx7/ca5d7b28ce9e22bc0b4a4bcae37ead54/raw/1032f3c2d7f0cf17bf128cc228a9df45cf34cc26/gistfile1.txt",
  "https://raw.githubusercontent.com/arhivedxx7/Keyfreetee/refs/heads/main/Maindee",
  "https://vpn.zotus.ru/sub.php",
  "http://vpn.happcluchi.dns.navy:2056/sub/h2t289i0fhq1908y",
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
  "https://p.kfwl.lol/os=android/h=CB522960-E2A9-7A19-12CB-FD12FEC71E19/https://happ.dska.su/https://vip-get.ru/subscriptions/NjBmOWJiMzMtNmM0OC00MWYzLThkMGQtNDIwZjgzYmMzMjYx?h=CB522960-E2A9-7A19-12CB-FD12FEC71E19",
  "https://gist.githubusercontent.com/HalyavusVPNUS/a93def732d3c624029c09c393dd0772e/raw/c1804c102de504bbc4034d9752579b77398f371d/%25D0%25BA%25D0%25BE%25D0%25BD%25D1%2584%25D0%25B8%25D0%25B3%25D0%25B8",
  "https://hub.mos.ru/kfwl/subsidia/raw/main/all",
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
];

function checkUrl(url) {
  return new Promise((resolve) => {
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (e) { return resolve({ url, alive: false }); }

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, (res) => {
      // Поддержка редиректов и успешных статусов
      if ((res.statusCode >= 200 && res.statusCode < 400)) {
        resolve({ url, alive: true, code: res.statusCode });
      } else {
        resolve({ url, alive: false, code: res.statusCode });
      }
    });

    req.on('error', () => resolve({ url, alive: false }));
    req.on('timeout', () => { req.destroy(); resolve({ url, alive: false }); });
  });
}

async function run() {
  console.log(`🔎 Проверяем ${sources.length} ссылок на доступность...`);
  const results = await Promise.all(sources.map(checkUrl));
  const alive = results.filter(r => r.alive).map(r => r.url);

  console.log(`\n✅ Живых источников: ${alive.length} из ${sources.length}`);
  
  // Вывод массива живых ссылок готовым кодом для замены
  console.log('\n Скопируй этот массив и замени им discoverSources/sources в основном скрипте:\n');
  console.log(JSON.stringify(alive, null, 2));
}

run();
