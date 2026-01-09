// ==UserScript==
// @name           Nyaa Torrent Helper
// @name:zh        Nyaa 助手
// @namespace      https://github.com/jc3213/userscript
// @version        1.2.6
// @description    Nyaa Torrent ease to access torrent info and preview, filter search result, and aria2c intergration
// @description:zh 能便捷操作 Nyaa 的种子信息，预览缩微图，过滤搜索结果，联动aria2c
// @author         jc3213
// @match          *://*.nyaa.si/*
// @exclude        *://*.nyaa.si/view/*
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_deleteValue
// @grant          GM_deleteValues
// @grant          GM_listValues
// @grant          GM_addValueChangeListener
// @grant          GM_openInTab
// ==/UserScript==

// variables
let torrents = [];
let preview = {};
let working = {};
let selected = new Set();
let keyword;
let active = document.querySelector('.pagination > .active');

// i18n
let messages = {
    'en-US': {
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
    },
    'zh-CN': {
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
    }
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
function ctrlButton(event, button) {
    if (!event.ctrlKey || button.className === 'disabled') return;
    event.preventDefault();
    button.children[0].click();
}

function altHandler(event, callback) {
    if (!event.altKey) return;
    event.preventDefault();
    callback();
}

function altShiftHandler(event, callback) {
    if (!event.altKey || !event.shiftKey) return;
    event.preventDefault();
    callback();
}

let hotkeyMap = {
    'ArrowLeft': (event) => ctrlButton(event, active.previousElementSibling),
    'ArrowRight': (event) => ctrlButton(event, active.nextElementSibling),
    'KeyC': (event) => altHandler(event, copyToClipboard),
    'KeyD': (event) => altHandler(event, downloadWithAria2),
    'KeyF': (event) => altHandler(event, filterTorrents),
    'KeyE': (event) => altShiftHandler(event, clearStorage),
};

let filterMap = {
    ''(result) {
        for (let tr of torrents) {
            tr.classList.remove('nyaa-hidden');
        }
        keyword = '';
        delete filterMap[result];
    },
    _default_(result) {
        let regexp = new RegExp(result.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        for (let tr of torrents) {
            regexp.test(tr.info.name)
                ? tr.classList.remove('nyaa-hidden')
                : tr.classList.add('nyaa-hidden');
        }
        filterMap[result] = filterMap[''];
        keyword = result;
    }
}

function filterTorrents() {
    let result = prompt(i18n.prompt, keyword);
    if (result === null) {
        return;
    }
    let filter = filterMap[result] ?? filterMap._default_;
    filter(result);
}

async function copyToClipboard() {
    if (!confirm(i18n.oncopy)) return;
    let data = [];
    for (let tr of selected) {
        data.push(getClipboardInfo(tr));
    }
    let info = await Promise.all(data);
    let copy = info.join('\n\n');
    navigator.clipboard.writeText(copy);
    alert(copy);
}

function downloadWithAria2() {
    if (!confirm(i18n.aria2c)) return;
    let params = [];
    for (let tr of selected) {
        params.push(tr.info.magnet);
    }
    postMessage({ aria2c: 'aria2c_download', params });
    alert(i18n.onsend);
}

async function clearStorage() {
    if (!confirm(i18n.clear)) return;
    GM_deleteValues(GM_listValues());
    for (let tr of torrents) {
        tr.classList.remove('nyaa-cached');
    }
    alert(i18n.onclear);
}

document.addEventListener('keydown', (event) => {
    let hotkey = hotkeyMap[event.code];
    hotkey?.(event);
});

// get torrent info
for (let tr of document.querySelectorAll('table > tbody > tr')) {
    let [, name, link, size] = tr.children;
    let a = [...name.children].at(-1);
    let url = a.href;
    let [{ href: magnet }, { href: torrent } = {}] = [...link.children].reverse();
    tr.info = { url, magnet, torrent, size: size.textContent, name: a.textContent };
    torrents.push(tr);
    if (GM_getValue(url)) {
        tr.classList.add('nyaa-cached');
    }
    a.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        let { ctrlKey, altKey, layerX, layerY } = event;
        if (ctrlKey) {
            let copy = await getClipboardInfo(tr);
            navigator.clipboard.writeText(copy)
        } else if (altKey) {
            postMessage({ aria2c: 'aria2c_download', params: [magnet] });
        } else {
            getTorrentPreview(tr, layerY, layerX);
        }
    });
    tr.addEventListener('mousedown', (event) => {
        if (!event.shiftKey) return;
        event.preventDefault();
    });
    tr.addEventListener('click', async (event) => {
        let { shiftKey, ctrlKey } = event;
        if (ctrlKey) {
            event.preventDefault();
            GM_deleteValue(url);
            tr.classList.remove('nyaa-cached');
        } else if (shiftKey) {
            event.preventDefault();
            selected.has(tr) ? selected.delete(tr) : selected.add(tr);
            tr.classList.toggle('nyaa-checked');
        }
    });
}

function fetchTorrent(url, tr, retries = 3) {
    if (working[url]) {
        throw new SyntaxError(`${GM_info.script.name} is processing "${url}"`);
    }
    working[url] = true;
    let site = new Set();
    let image = new Set();
    let info;
    return fetch(url).then((res) => res.text()).then((text) => {
        let result = text.match(/<div[^>]*id=["']torrent-description["'][^>]*>([\s\S]*?)<\/div>/i)[1];
        let urls = result.match(/https?:\/\/[^\]&)* ]+/g);
        if (urls) {
            for (let u of urls) {
                u.match(/\.(jpe?g|png|gif|avif|bmp|webp)/i) ? image.add(u) : site.add(u);
            }
        }
        info = { site: [...site], image: [...image] };
        GM_setValue(url, info);
        tr.classList.add('nyaa-cached');
        delete working[url];
        return info;
    }).catch((err) => {
        delete working[url];
        if (retries === 0) throw err;
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(fetchTorrent(url, tr, --retries));
            }, 5000);
        });
    });
}

async function getTorrentDetail(tr) {
    let { url, name, torrent, magnet, size } = tr.info;
    let info = GM_getValue(url) ?? fetchTorrent(url, tr);
    Object.assign(info, tr.info);
    return info;
}

// copy info to clipboard
async function getClipboardInfo(tr) {
    let { url, name, torrent, magnet, size, image, site } = await getTorrentDetail(tr);
    return `${i18n.name}
    ${name} (${size})
${i18n.preview}
    ${image.length ? image.join('\n    ') : site.length ? site.join('\n    ') : 'Null'}
${torrent ? `${i18n.torrent}\n    ${torrent}\n` : ''}${i18n.magnet}\n    ${magnet.slice(0, magnet.indexOf('&'))}`;
}

// show/open preview
async function getTorrentPreview(tr, top, left) {
    let { image, site } = await getTorrentDetail(tr);
    if (image?.length > 0) {
        let url = image[0];
        let img = preview[url];
        if (!img) {
            img = document.createElement('img');
            img.src = redirectURL(url);
            img.className = 'nyaa-preview';
            img.addEventListener('click', event => img.remove());
            preview[url] = img;
        }
        img.style.cssText = `top: ${top}px; left: ${left}px;`;
        document.body.append(img);
    } else if (site?.length > 0) {
        GM_openInTab(site[0]);
    }
}

const redirectRules = [
    { match: 'files.catbox.moe', replace: 'i0.wp.com/files.catbox.moe', suffix: '?ssl=1' }
];

function redirectURL(url) {
    for (let { match, replace, suffix } of redirectRules) {
        if (url.includes(match)) {
            return url.replace(match, replace) + suffix;
        }
    }
    return url;
}
