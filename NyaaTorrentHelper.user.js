// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.1.1
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_deleteValues
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// ==/UserScript==

// variables
let torrents = new Map();
let selected = new Set();
let filtered = new Set();
let working = new Set();
let preview = new Map();
let keyword;
let regexp;
let active = document.querySelector('.pagination > .active');

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
.nyaa-preview { position: absolute; }
`;
document.body.appendChild(css);

// shortcut
document.addEventListener('keydown', (event) => {
    let {key, ctrlKey, altKey, shiftKey} = event;
    switch (key) {
        case 'ArrowLeft':
            ctrlKey && shortcutToGo(active.previousElementSibling);
            break;
        case 'ArrowRight':
            ctrlKey && shortcutToGo(active.nextElementSibling);
            break;
        case 'c':
            altKey && copyToClipboard(event);
            break;
        case 'j':
            altKey && downloadWithAria2(event);
            break;
        case 'f':
            altKey && filterTorrents(event);
            break;
        case 'E':
            altKey && shiftKey && clearStorage(event);
            break;
    };
});

function shortcutToGo(el) {
    if (el.classList !== 'disabled') {
        el.children[0].click();
    }
}

function filterTorrents(event) {
    event.preventDefault();
    let result = prompt(i18n.prompt, keyword);
    if (result === null) {
        return;
    }
    switch (result) {
        case '':
        case keyword:
            torrents.forEach((tr) => tr.classList.remove('nyaa-hidden'));
            keyword = '';
            break;
        default:
            regexp = new RegExp(result.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            torrents.forEach((tr) => {
                if (!regexp.test(tr.info.name)) {
                    tr.classList.add('nyaa-hidden');
                } else {
                    tr.classList.remove('nyaa-hidden');
                }
            });
            keyword = result;
            break;
    };
}

async function copyToClipboard(event) {
    event.preventDefault();
    if (confirm(i18n.oncopy)) {
        let info = await Promise.all([...selected].map(async (tr) => await getClipboardInfo(tr)));
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

async function clearStorage(event) {
    event.preventDefault();
    if (confirm(i18n.clear)) {
        GM_deleteValues(GM_listValues());
        torrents.forEach((tr) => tr.classList.remove('nyaa-cached'));
        alert(i18n.onclear);
    }
}

// get torrent info
document.querySelectorAll('table > tbody > tr').forEach((tr) => {
    let [, name, link, size] = tr.children;
    let a = name.children[name.children.length - 1];
    let url = a.href;
    let [magnet, torrent] = [...link.children].reverse().map((a) => a?.href);
    tr.info = {url, magnet, torrent, size: size.textContent, name: a.textContent};
    torrents.set(url, tr);
    if (GM_getValue(url)) {
        tr.classList.add('nyaa-cached');
    }
    a.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        let {altKey, layerX, layerY} = event;
        if (altKey) {
            postMessage({ aria2c: 'aria2c_jsonrpc_call', params: [ {url: magnet } ] });
        } else {
            getTorrentPreview(tr, layerY, layerX);
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
            let copy = await getClipboardInfo(tr);
            navigator.clipboard.writeText(copy)
        } else if (event.altKey) {
            event.preventDefault();
            GM_deleteValue(url);
            tr.classList.remove('nyaa-cached');
        } else if (event.shiftKey) {
            event.preventDefault();
            selected.has(tr) ? selected.delete(tr) : selected.add(tr);
            tr.classList.toggle('nyaa-checked');
        }
    });
});

async function getTorrentDetail(tr) {
    let {url, name, torrent, magnet, size} = tr.info;
    let info = GM_getValue(url);
    if (!info) {
        if (working.has(url)) {
            throw new SyntaxError(`${GM_info.script.name} is processing "url"`);
        }
        working.add(url);
        let site = new Set();
        let image = new Set();
        let container = document.createElement('div');
        container.innerHTML = await fetch(url).then((res) => res.text()).catch((err) => working.delete(url));
        let result = container.querySelector('#torrent-description').textContent;
        result.match(/https?:\/\/[^\]\[);!*"]*/g)?.forEach((url) => url.match(/.(jpe?g|png|gif|avif|bmp|webp)/) ? image.add(url) : site.add(url));
        info = { site: [...site], image: [...image] };
        GM_setValue(url, info);
        tr.classList.add('nyaa-cached');
        working.delete(url);
    }
    Object.assign(info, tr.info);
    return info;
}

// copy info to clipboard
async function getClipboardInfo(tr) {
    let {url, name, torrent, magnet, size, image, site} = await getTorrentDetail(tr);
    return `${i18n.name}
    ${name} (${size})
${i18n.preview}
    ${image.length ? image.join('\n    ') : site.length ? site.join('\n    ') : 'Null'}
${torrent ? `${i18n.torrent}\n    ${torrent}\n` : ''}${i18n.magnet}\n    ${magnet}`;
}

// show/open preview
async function getTorrentPreview(tr, top, left) {
    let {image = [], site = []} = await getTorrentDetail(tr);
    if (image.length !== 0) {
        let src = image[0];
        let img = preview.get(src);
        if (!img) {
            img = document.createElement('img');
            img.src = src;
            img.className = 'nyaa-preview';
            img.addEventListener('click', event => img.remove());
            preview.set(src, img);
        }
        img.style.cssText = `top: ${top}px; left: ${left}px;`;
        document.body.append(img);
    } else if (site.length !== 0) {
        GM_openInTab(site[0]);
    }
}
