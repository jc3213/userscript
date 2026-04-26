// ==UserScript==
// @name           Nyaa Torrent Helper
// @name:zh        Nyaa 助手
// @namespace      https://github.com/jc3213/userscript
// @version        2.1
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
// @grant          GM_openInTab
// ==/UserScript==

// variables
let torrents = [];
let preview = {};
let working = {};
let selected = new Set();
let keyword;
let filterResult = {};
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
.nyaa-select { position: absolute; border: 1px dashed #007bff; background: rgba(0, 123, 255, 0.2); pointer-events: none; display: none; }
.nyaa-noselect { user-select: none; }
`;
document.body.appendChild(css);

// shortcut
function filterTorrents() {
    let result = prompt(i18n.prompt, keyword);
    if (result === null) {
        return;
    }
    if (result === '' || result === keyword) {
        for (let tr of torrents) {
            tr.classList.remove('nyaa-hidden');
        }
        keyword = '';
        delete filterResult[result];
    } else {
        let match = result.toLowerCase();
        for (let tr of torrents) {
            tr.info.name.toLowerCase().includes(match)
                ? tr.classList.remove('nyaa-hidden')
                : tr.classList.add('nyaa-hidden');
        }
        keyword = result;
    }
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

const hotkeys = {
    'ctrl+arrowleft': () => active.previousElementSibling.click(),
    'ctrl+arrowright': () => active.nextElementSibling.click(),
    'alt+shift+e': clearStorage,
    'alt+c': copyToClipboard,
    'alt+d': downloadWithAria2,
    'alt+f': filterTorrents
}

document.addEventListener('keydown', (event) => {
    let { ctrlKey, altKey, shiftKey, key } = event;
    let keys = [];
    if (ctrlKey) {
        keys.push('ctrl');
    }
    if (altKey) {
        keys.push('alt');
    }
    if (shiftKey) {
        keys.push('shift');
    }
    keys.push(key.toLowerCase());
    let combo = keys.join('+');
    let hotkey = hotkeys[combo];
    if (hotkey) {
        event.preventDefault();
        hotkey();
    }
});

// get torrent info
for (let tr of document.querySelectorAll('table > tbody > tr')) {
    let [genre, name, link, size] = tr.children;
    let id = name.children[0].href.match(/\/([^/#]+)(?:#comments)?$/)[1];
    let url = '/view/' + id;
    let [{ href: magnet }, { href: torrent } = {}] = [...link.children].reverse();
    tr.info = { id, url, magnet, torrent, size: size.textContent, name: name.textContent };
    torrents.push(tr);
    if (GM_getValue(id)) {
        tr.classList.add('nyaa-cached');
    }
    name.addEventListener('contextmenu', async (event) => {
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
    tr.addEventListener('click', async (event) => {
        let { shiftKey, ctrlKey } = event;
        if (ctrlKey) {
            event.preventDefault();
            GM_deleteValue(id);
            tr.classList.remove('nyaa-cached');
        } else if (shiftKey) {
            event.preventDefault();
            if (selected.has(tr)) {
                tr.classList.remove('nyaa-checked');
                selected.delete(tr);
            } else {
                tr.classList.add('nyaa-checked');
                selected.add(tr);
            }
        }
    });
}

function fetchTorrent(id, url, tr, retries = 3) {
    if (working[url]) {
        throw new SyntaxError(`${GM_info.script.name} is processing "${url}"`);
    }
    working[url] = true;
    let site = new Set();
    let image = new Set();
    let info = {};
    return fetch(url).then((res) => res.text()).then((text) => {
        let result = text.match(/<div[^>]*id=["']torrent-description["'][^>]*>([\s\S]*?)<\/div>/i)[1];
        let urls = result.match(/https?:\/\/[^\]&)* ]+/g);
        if (urls) {
            for (let u of urls) {
                /\.(jpe?g|png|gif|avif|bmp|webp)/i.test(u) ? image.add(u) : site.add(u);
            }
        }
        if (image.size > 0) {
            info.image = [...image][0];
        }
        else if (site.size > 0) {
            info.site = [...site][0];
        }
        GM_setValue(id, info);
        tr.classList.add('nyaa-cached');
        delete working[url];
        return info;
    }).catch((err) => {
        delete working[url];
        if (retries === 0) throw {};
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(fetchTorrent(id, url, tr, --retries));
            }, 5000);
        });
    });
}

async function getTorrentDetail(tr) {
    let { id, url, name, torrent, magnet, size } = tr.info;
    let info = GM_getValue(id) ?? fetchTorrent(id, url, tr);
    Object.assign(info, tr.info);
    return info;
}

// copy info to clipboard
async function getClipboardInfo(tr) {
    let { url, name, torrent, magnet, size, image, site } = await getTorrentDetail(tr);
    return `${i18n.name}
    ${name} (${size})
${i18n.preview}
    ${image ?? site ?? 'Null'}
${torrent ? `${i18n.torrent}\n    ${torrent}\n` : ''}${i18n.magnet}\n    ${magnet.slice(0, magnet.indexOf('&'))}`;
}

// show/open preview
async function getTorrentPreview(tr, top, left) {
    let { image, site } = await getTorrentDetail(tr);
    if (image) {
        let img = preview[image];
        if (!img) {
            img = document.createElement('img');
            img.src = redirectURL(image);
            img.className = 'nyaa-preview';
            img.addEventListener('click', event => img.remove());
            preview[image] = img;
        }
        img.style.cssText = `top: ${top}px; left: ${left}px;`;
        document.body.append(img);
    } else if (site) {
        GM_openInTab(site);
    }
}

function redirectURL(url) {
    let start = url.indexOf('//') + 2;
    let end = url.indexOf('/', start);
    let host = url.substring(start, end);
    if (host === 'files.catbox.moe') {
        return url.replace('files.catbox.moe', 'i0.wp.com/files.catbox.moe') + '?ssl=1';
    }
    return url;
}

// torrent multiple selection with drag'n'drop
let startX;
let startY;
let startClick = false;
let startSelect = false;
let selectBox = document.createElement('div');
selectBox.className = 'nyaa-select';
document.body.appendChild(selectBox);

document.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.altKey) return;
    startX = event.pageX;
    startY = event.pageY;
    startSelect = true;
    document.body.classList.add('nyaa-noselect');
});

document.addEventListener('mousemove', (event) => {
    if (!startSelect) return;
    let dx = event.pageX - startX;
    let dy = event.pageY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        let x = dx < 0 ? event.pageX : startX;
        let y = dy < 0 ? event.pageY : startY;
        let w = Math.abs(dx);
        let h = Math.abs(dy);
        selectBox.style.cssText = `left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; display: block;`;
    }
});

document.addEventListener('mouseup', (event) => {
    if (!startSelect) return;

    startSelect = false;
    let boxRect = selectBox.getBoundingClientRect();
    let { shiftKey } = event;

    for (let tr of torrents) {
        let { left, right, top, bottom } = tr.getBoundingClientRect();
        let overlap = right < boxRect.left || left > boxRect.right || bottom < boxRect.top || top > boxRect.bottom;

        for (let tr of torrents) {
            let { left, right, top, bottom } = tr.getBoundingClientRect();
            let overlap = right < boxRect.left || left > boxRect.right || bottom < boxRect.top || top > boxRect.bottom;

            if (!overlap) {
                tr.classList.add('nyaa-checked');
                selected.add(tr);
            } else if (!shiftKey) {
                tr.classList.remove('nyaa-checked');
                selected.delete(tr);
            }
        }

    }

    document.body.classList.remove('nyaa-noselect');
    selectBox.style.cssText = 'display: none; width: 0; height: 0;';
});
