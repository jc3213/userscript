// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.10.4
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @grant        GM_openInTab
// ==/UserScript==

if (location.pathname.startsWith('/view/')) {
    return;
}

var torrents = {};
var working = {};
var archive = {};

// UI
var keyword;
var result = [];
var messages = {
    'en-US': {
        keyword: 'Keyword...',
        name: 'Name:',
        preview: 'Preview:',
        torrent: 'Torrent:',
        magnet: 'Magnet:'
    },
    'zh-CN': {
        keyword: '关键词……',
        name: '名字：',
        preview: '预览：',
        torrent: '种子：',
        magnet: '磁链：'
    }
};
var i18n = messages[navigator.language] ?? messages['en-US'];

var search = document.createElement('input');
search.className = 'form-control search-bar';
search.style.cssText = 'display: inline-block; width: 150px !important; margin-top: 8px; margin-left: 20px;';
search.placeholder = i18n.keyword;
search.addEventListener('change', (event) => {
    var entry = event.target.value;
    switch (entry) {
        case '':
            result.forEach((tr) => {
                tr.style.display = 'table-row';
            });
            break;
        case keyword:
            result.forEach((tr) => {
                tr.style.display = tr.style.display === 'none' ? '' : 'none';
            });
            break;
        default:
            var regexp = new RegExp(entry.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            Object.keys(torrents).forEach(id => {
                var {name, tr} = torrents[id];
                if (regexp.test(name)) {
                    tr.style.display = 'table-row';
                    return
                }
                tr.style.display = 'none';
                result.push(tr);
            });
            keyword = entry;
            break;
    }
});

var filter = document.createElement('th');
filter.className = 'text-center';
filter.innerHTML = '<a href style="opacity: 1; font-size: 12px; line-height: 42px;">🔎</a>';
filter.style.width = '40px';
filter.addEventListener('click', (event) => {
    event.preventDefault();
    if (event.target.tagName === 'A') {
        event.altKey ? batchDownloadTorrent() : batchCopyTorrent();
    }
});

document.querySelector('#navbar').appendChild(search);
document.querySelector('thead > tr').append(filter);

function batchDownloadTorrent() {
    let urls = [...document.querySelectorAll('td > input:checked')].map(i => torrents[i.value].magnet);
    aria2Download(urls);
}

async function batchCopyTorrent() {
    var array = [...document.querySelectorAll('td > input:checked')].map(i => getTorrentInfo(i.value));
    var result = await Promise.all(array);
    var text = result.join('\n\n');
    navigator.clipboard.writeText(text);
}

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowLeft':
            event.ctrlKey && event.altKey ? history.go(-1) : document.querySelector('ul.pagination > li:first-child > a').click();
            break;
        case 'ArrowRight':
            event.ctrlKey && event.altKey ? history.go(1) : document.querySelector('ul.pagination > li:last-child > a').click();
            break;
    }
});

document.querySelectorAll('tbody > tr').forEach((tr) => {
    var [gendre, title, links, filesize] = tr.querySelectorAll('td');
    var notcoment = title.querySelector('a:last-child');
    var name = notcoment.textContent;
    var url = notcoment.href;
    var id = url.slice(url.lastIndexOf('/') + 1);
    var size = filesize.textContent;
    var [magnet, torrent] = [...links.querySelectorAll('a')].reverse();
    magnet = magnet.hreft.slice(0, magnet.href.indexOf('&'));
    torrent = torrent.href;
    torrents[id] = {url, torrent, magnet, name, size, tr};
    // UI
    var td = document.createElement('td');
    td.className = 'text-center';
    td.style.width = '39px';
    td.innerHTML = `<input type="checkbox" value="${id}">`;
    tr.appendChild(td);
    //
    title.addEventListener('contextmenu', async event => {
        event.preventDefault();
        var {layerY, layerX, ctrlKey, altKey} = event;
        torrents[id].top = layerY;
        torrents[id].left = layerX;
        if (altKey) {
            return aria2Download(magnet);
        }
        if (ctrlKey) {
            var text = await getTorrentInfo(id);
            return navigator.clipboard.writeText(text);
        }
        printPreview(id);
    });
});

async function getTorrentInfo(id) {
    var {sites, images, name, size, torrent, magnet, url} = id in archive ? torrents[id] : await getTorrentDetails(id);
    var output = i18n.name + '\n' + name + ' (' + size + ')\n' + i18n.preview + '\n';
    output += (images.length !== 0 ? images.join('\n') : sites.length !== 0 ? sites.join('\n') : 'Null') + '\n' + (torrent ? i18n.torrent + '\n' + torrent + '\n' : '') + i18n.magnet + '\n' + magnet;
    return output;
}

async function getTorrentDetails(id) {
    working[id] = true;
    var res = await fetch(torrents[id].url);
    var text = await res.text();
    var idx = text.indexOf('"torrent-description"');
    var desc = text.slice(idx + 22);
    var result = desc.slice(0, desc.indexOf('</div>'));
    var urls = result.match(/https?:\/\/[^\]\[);!*]*/g);
    var sites = torrents[id].sites = [];
    var images = torrents[id].images = [];
    urls?.forEach((url) => url.match(/.(jpe?g|png|gif|avif|bmp|webp)/) ? !images.includes(url) && images.push(url) : !sites.includes(url) && sites.push(url));
    archive[id] = true;
    working[id] = false;
    return torrents[id];
}

async function printPreview(id) {
    if (working[id]) {
        return;
    }
    var {images, sites} = id in archive ? torrents[id] : await getTorrentDetails(id);
    if (images.length !== 0) {
        return popupPreview(id, images[0]);
    }
    if (sites.length !== 0) {
        return GM_openInTab(sites[0]);
    }
}

function popupPreview(id, image) {
    var img = document.querySelector('#preview' + id);
    if (img) {
        return;
    }
    var {top, left} = torrents[id];
    img = document.createElement('img');
    img.id = 'preview' + id;
    img.src = image;
    img.style.cssText = 'position: absolute; z-index: 3213; max-height: 800px; width: auto; top: ' + top + 'px; left: ' + left + 'px;';
    img.addEventListener('click', event => img.remove());
    document.body.append(img);
}

function aria2Download(url) {
    var urls = Array.isArray(url) ? url.map(url => ({url})) : [{url}];
    postMessage({ aria2c: 'aria2c_jsonrpc_call', params: { urls } });
}
