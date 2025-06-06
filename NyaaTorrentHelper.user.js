// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.0.1
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @require      https://jc3213.github.io/storage.js/storage.js#sha512-Ks2sRkoDPhK0oauvfj+5qyJ5rFqdW5/OUK5jMiRfGEkGCuOvBV+JIJoy0zrhz2FYq9AsG/6JN/a/jfnAQnBGMg==
// @grant        GM_openInTab
// ==/UserScript==

// variables
let storage = new Storage('nyaa.si', 'info');
let caches = new Map();
let torrents = new Set();
let selected = new Set();
let filtered = new Set();
let working = new Set();
let previews = {};
let nyaa_si = [...document.body.children[1].children[5].children[0].children[1].children];
let indexes = [...document.body.children[1].children[6].children[0].children[0].children];
let keyword;
let regexp;

// i18n
let messages = {};
messages['en-US'] = {
    name: 'Name:',
    preview: 'Preview:',
    torrent: 'Torrent:',
    magnet: 'Magnet:',
    prompt: 'Enter a filter keyword:',
    oncopy: 'Confirm copying selected torrent data to clipboard?',
    aria2c: 'Confirm sending JSON-RPC request to aria2c?',
    onsend: 'JSON-RPC request has been sent.',
    clear: 'Confirm clearing all cached torrent data?',
    onclear: 'All cached data has been cleared.'
};
messages['zh-CN'] = {
    name: '名字：',
    preview: '预览：',
    torrent: '种子：',
    magnet: '磁链：',
    prompt: '输入过滤关键词：',
    oncopy: '确认复制所选种子数据到剪贴板？',
    aria2c: '确认向 aria2c 发送 JSON-RPC 请求？',
    onsend: 'JSON-RPC 请求已发送。',
    clear: '确认清除所有已缓存的种子数据？',
    onclear: '所有缓存数据已清除。'
};
let i18n = messages[navigator.language] ?? messages['en-US'];

// css
let css = document.createElement('style');
css.textContent = `
.nyaa-hidden { display: none; }
.nyaa-cached > td { background-color: #cde7f0 !important; }
.nyaa-checked > td { background-color: #f0d8d8 !important; }
`;
document.body.appendChild(css);

// indexedDB to Memory
storage.forEach(({key, value}) => caches.set(key, value)).then(() => {
    nyaa_si.forEach(getTorrentInfo);
});

// shortcut
document.addEventListener('keydown', (event) => {
    let {key, ctrlKey, altKey, shiftKey} = event;
    switch (key) {
        case 'ArrowLeft':
            ctrlKey && indexes[0].children[0].click();
            break;
        case 'ArrowRight':
            ctrlKey && indexes[indexes.length - 1].children[0].click();
            break;
        case 'c':
            altKey && copyInfoToClipboard(event);
            break;
        case 's':
            altKey && downloadWithAria2(event);
            break;
        case 'f':
            altKey && filterNyaaTorrents(event);
            break;
        case 'D':
            altKey && shiftKey && clearNyaastorage(event);
            break;
    };
});

function filterNyaaTorrents(event) {
    event.preventDefault();
    let result = prompt(i18n.prompt, keyword);
    if (result === null) {
        return;
    }
    switch (result) {
        case '':
            nyaa_si.forEach((tr) => tr.classList.remove('nyaa-hidden'));
            break;
        case keyword:
            nyaa_si.forEach((tr) => tr.classList.toggle('nyaa-hidden'));
            break;
        default:
            regexp = new RegExp(keyword.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            nyaa_si.forEach((tr) => {
                if (!regexp.test(tr.info.name)) {
                    tr.classList.add('nyaa-hidden');
                } else {
                    tr.classList.remove('nyaa-hidden');
                }
            });
            break;
    };
    keyword = result;
}

async function copyInfoToClipboard(event) {
    event.preventDefault();
    if (confirm(i18n.oncopy)) {
        let info = await Promise.all([...selected].map(async (tr) => await getNyaaClipboardInfo(tr)));
        let copy = info.join('\n\n');
        navigator.clipboard.writeText(copy);
        alert(copy);
    }
}

function downloadWithAria2(event) {
    event.preventDefault();
    if (confirm(i18n.aria2c)) {
        let params = [...selected].map((tr) => ({ url: tr.info.magnet }));
        postMessage({ aria2c: 'aria2c_jsonrpc_call', params });
        alert(i18n.onsend);
    }
}

async function clearNyaastorage(event) {
    event.preventDefault();
    if (confirm(i18n.clear)) {
        await storage.clear();
        caches.clear();
        torrents.forEach((tr) => tr.classList.remove('nyaa-cached'));
        alert(i18n.onclear);
    }
}

// extract torrents' infos
function getTorrentInfo(tr) {
    let [, name, link, size] = tr.children;
    let a = name.children[name.children.length - 1];
    let url = a.href;
    let [magnet, torrent] = [...link.children].reverse().map((a) => a?.href);
    tr.info = {url, magnet, torrent, size: size.textContent, name: a.textContent};
    if (caches.has(url)) {
        tr.classList.add('nyaa-cached');
        torrents.add(tr);
    }
    a.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        if (event.altKey) {
            postMessage({ aria2c: 'aria2c_jsonrpc_call', params: [ {url: magnet } ] });
        } else {
            getNyaaTorrentPreview(tr, event.layerY, event.layerX);
        }
    });
    tr.addEventListener('mousedown', (event) => {
        if (event.shiftKey) {
            event.preventDefault();
        }
    });
    tr.addEventListener('click', async (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            let copy = await getNyaaClipboardInfo(tr);
            navigator.clipboard.writeText(copy)
        } else if (event.altKey) {
            event.preventDefault();
            await storage.delete(url);
            caches.delete(url);
            tr.classList.remove('nyaa-cached');
        } else if (event.shiftKey) {
            event.preventDefault();
            selected.has(tr) ? selected.delete(tr) : selected.add(tr);
            tr.classList.toggle('nyaa-checked');
        }
    });
}

async function getNyaaTorrentDetail(tr) {
    let {url, name, torrent, magnet, size} = tr.info;
    let info = caches.get(url);
    if (!info) {
        if (working.has(url)) {
            return {};
        }
        working.add(url);
        let site = new Set();
        let image = new Set();
        let container = document.createElement('div');
        container.innerHTML = await fetch(url).then((res) => res.text()).catch((err) => working.delete(url));
        let result = container.children[26].children[6].textContent;
        result.match(/https?:\/\/[^\]\[);!*"]*/g)?.forEach((url) => url.match(/.(jpe?g|png|gif|avif|bmp|webp)/) ? image.add(url) : site.add(url));
        info = { site: [...site], image: [...image] };
        await storage.set(url, info);
        caches.set(url, info);
        tr.classList.add('nyaa-cached');
        torrents.add(tr);
        working.delete(url);
    }
    Object.assign(info, tr.info);
    return info;
}

// copy info to clipboard
async function getNyaaClipboardInfo(tr) {
    let {url, name, torrent, magnet, size, image, site} = await getNyaaTorrentDetail(tr);
    return `${i18n.name}
    ${name} (${size})
${i18n.preview}
    ${image.length ? image.join('\n    ') : site.length ? site.join('\n    ') : 'Null'}
${torrent ? `${i18n.torrent}\n    ${torrent}\n` : ''}${i18n.magnet}\n    ${magnet}`;
}

// show/open preview
async function getNyaaTorrentPreview(tr, top, left) {
    let {image = [], site = []} = await getNyaaTorrentDetail(tr);
    if (image.length !== 0) {
        let src = image[0];
        let img = previews[src];
        if (!img) {
            img = document.createElement('img');
            img.src = src;
            img.className = 'nyaa-preview';
            img.addEventListener('click', event => img.remove());
            previews[src] = img;
        }
        img.style.cssText = 'top: ' + top + 'px; left: ' + left + 'px;';
        document.body.append(img);
    } else if (site.length !== 0) {
        GM_openInTab(site[0]);
    }
}
