// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.0.0
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @require      https://jc3213.github.io/storage.js/storage.js#sha512-Ks2sRkoDPhK0oauvfj+5qyJ5rFqdW5/OUK5jMiRfGEkGCuOvBV+JIJoy0zrhz2FYq9AsG/6JN/a/jfnAQnBGMg==
// @grant        GM_openInTab
// ==/UserScript==

let caches = new Storage('nyaa.si', 'info');
let torrents = new Set();
let selected = new Set();
let filtered = new Set();
let working = new Set();
let previews = {};
let nyaa_si = [...document.body.children[1].children[5].children[0].children[1].children];
let indexes = [...document.body.children[1].children[6].children[0].children[0].children];
let keyword;

// UI
let messages = {
    'en-US': {
        keyword: 'Keyword...',
        name: 'Name:',
        preview: 'Preview:',
        torrent: 'Torrent:',
        magnet: 'Magnet:',
        oncopy: 'Are you sure to copy selected torrents to clipboard?',
        aria2c: 'Are you sure to send JSON-RPC request to aria2c?',
        onsend: 'JSON-RPC request has already been sent',
        clear: 'Are you sure to clear all torrents\' data caches?',
        onclear: 'All caches has been cleared!'
    },
    'zh-CN': {
        keyword: '关键词……',
        name: '名字：',
        preview: '预览：',
        torrent: '种子：',
        magnet: '磁链：',
        oncopy: '确定复制所选种子信息到粘贴板吗？',
        aria2c: '确定向aria2c发送JSON-RPC请求吗？',
        onsend: '已经发送JSON-RPC请求',
        clear: '确定清除所有已缓存的种子信息吗？',
        onclear: '已清除所有缓存信息！'
    }
};
let i18n = messages[navigator.language] ?? messages['en-US'];

let css = document.createElement('style');
css.textContent = `
.nyaa-hidden { display: none; }
.nyaa-cached > * { background-color: #cde7f0 !important; }
.nyaa-fetch > button, .nyaa-checked > * { background-color: #f0d8d8 !important; }
.nyaa-preview { position: absolute; z-index: 3213; max-height: 800px; width: auto; }
.navbar-form > div > input { width: 190px !important; }
.navbar-form { min-width: 560px;}
`;
document.body.appendChild(css);

let search = document.createElement('input');
search.className = 'form-control search-bar nyaa-keyword';
search.placeholder = i18n.keyword;
search.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        filterNyaaTorrents();
    }
});

let button = document.createElement('div');
button.className = 'input-group-btn search-btn';
button.innerHTML = '<button class="btn btn-primary">🔎</button>';
button.addEventListener('click', (event) => {
    event.preventDefault();
    filterNyaaTorrents();
});

function filterNyaaTorrents() {
    let regexp;
    switch (search.value) {
        case '':
            nyaa_si.forEach((tr) => tr.classList.remove('nyaa-hidden'));
            break;
        case keyword:
            nyaa_si.forEach((tr) => tr.classList.toggle('nyaa-hidden'));
            break;
        default:
            keyword = search.value;
            regexp = new RegExp(keyword.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            nyaa_si.forEach((tr) => {
                if (!regexp.test(tr.info.name)) {
                    tr.classList.add('nyaa-hidden');
                } else {
                    tr.classList.remove('nyaa-hidden');
                }
            });
            break;
    }
}

document.body.children[0].children[0].children[1].children[3].children[0].append(search, button);

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
            altKey && copyTorrentsToClipboard();
            break;
        case 's':
            altKey && downloadWithAria2();
            break;
        case 'D':
            altKey && shiftKey && clearNyaaCaches();
            break;
    };
});

async function copyTorrentsToClipboard() {
    if (confirm(i18n.oncopy)) {
        let info = await Promise.all([...selected].map(async (tr) => await getNyaaClipboardInfo(tr)));
        let copy = info.join('\n\n');
        navigator.clipboard.writeText(copy);
        alert(copy);
    }
}

function downloadWithAria2() {
    if (confirm(i18n.aria2c)) {
        let params = [...selected].map((tr) => ({ url: tr.info.magnet }));
        postMessage({ aria2c: 'aria2c_jsonrpc_call', params });
        alert(i18n.onsend);
    }
}

async function clearNyaaCaches() {
    if (confirm(i18n.clear)) {
        await caches.clear();
        torrents.forEach((tr) => tr.classList.remove('nyaa-cached'));
        alert(i18n.onclear);
    }
}

nyaa_si.forEach(async (tr) => {
    let [, name, link, size] = tr.children;
    let a = name.children[name.children.length - 1];
    let url = a.href;
    let [magnet, torrent] = [...link.children].reverse().map((a) => a?.href);
    tr.info = {url, magnet, torrent, size: size.textContent, name: a.textContent};
    if (await caches.has(url)) {
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
            await caches.delete(url);
            tr.classList.remove('nyaa-cached');
        } else if (event.shiftKey) {
            event.preventDefault();
            selected.has(tr) ? selected.delete(tr) : selected.add(tr);
            tr.classList.toggle('nyaa-checked');
        }
    });
});

async function getNyaaTorrentDetail(tr) {
    let {url, name, torrent, magnet, size} = tr.info;
    let info = await caches.get(url);
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
        await caches.set(url, info);
        tr.classList.add('nyaa-cached');
        torrents.add(tr);
        working.delete(url);
    }
    Object.assign(info, tr.info);
    return info;
}

async function getNyaaClipboardInfo(tr) {
    let {url, name, torrent, magnet, size, image, site} = await getNyaaTorrentDetail(tr);
    return `${i18n.name}
    ${name} (${size})
${i18n.preview}
    ${image.length ? image.join('\n    ') : site.length ? site.join('\n    ') : 'Null'}
${torrent ? `${i18n.torrent}\n    ${torrent}\n` : ''}${i18n.magnet}\n    ${magnet}`;
}

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
