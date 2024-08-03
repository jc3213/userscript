// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.11.0
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @grant        GM_openInTab
// ==/UserScript==

if (location.pathname.startsWith('/view/')) {
    return;
}

var torrents = {};
var previews = {};
var working = {};
var tblines = document.querySelectorAll('tbody > tr');
var filter = [];
var keyword;

// UI
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

var css = document.createElement('style');
css.textContent = '.nyaa-hidden { display: none; }\
.nyaa-fetch > button, .nyaa-checked > * { background-color: #f7468a !important; }\
.nyaa-preview { position: absolute; z-index: 3213; max-height: 800px; width: auto; }\
.navbar-form > div > input { width: 190px !important; }\
.navbar-form { min-width: 560px;}';
document.body.appendChild(css);

var search = document.createElement('input');
search.className = 'form-control search-bar nyaa-keyword';
search.placeholder = i18n.keyword;
search.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.altKey ? downloadWithAria2() : event.ctrlKey ? copyTorrentsToClipboard() : filterNyaaTorrents();
    }
});

var button = document.createElement('div');
button.className = 'input-group-btn search-btn';
button.innerHTML = '<button class="btn btn-primary">💾</button>';
button.addEventListener('click', (event) => {
    event.preventDefault();
    event.altKey ? downloadWithAria2() : event.ctrlKey ? copyTorrentsToClipboard() : filterNyaaTorrents();
});

function downloadWithAria2() {
    var urls = [];
    document.querySelectorAll('tr.nyaa-checked').forEach((tr) => {
        var magnet = tr.querySelector('td:nth-child(3) > a:last-child').href;
        urls.push({ url: magnet.slice(0, magnet.indexOf('&')) });
    });
    postMessage({ aria2c: 'aria2c_jsonrpc_call', params: { urls } });
}

async function copyTorrentsToClipboard() {
    button.classList.add('nyaa-fetch');
    var result = await Promise.all([...document.querySelectorAll('tr.nyaa-checked')].map(async (tr) => {
        var torrent = await getNyaaItemDetails(tr);
        return torrent.copy;
    }));
    navigator.clipboard.writeText(result.join('\r\n'));
    button.classList.remove('nyaa-fetch');
}

function filterNyaaTorrents() {
    switch (search.value) {
        case '':
            filter.forEach((tr) => tr.classList.remove('nyaa-hidden'));
            break;
        case keyword:
            filter.forEach((tr) => tr.classList.toggle('nyaa-hidden'));
            break;
        default:
            keyword = search.value;
            var regexp = new RegExp(keyword.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            tblines.forEach((tr) => {
                var name = tr.name ?? tr.querySelector('td:nth-child(2) > a:last-child').textContent;
                if (!regexp.test(name)) {
                    tr.classList.add('nyaa-hidden');
                    return filter.push(tr);
                }
                tr.classList.remove('nyaa-hidden');
            });
            break;
    }
}

document.querySelector('.navbar-form > div').append(search, button);

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            event.ctrlKey && event.altKey ? history.go(-1) : document.querySelector('ul.pagination > li:first-child > a').click();
            break;
        case 'ArrowRight':
            event.ctrlKey && event.altKey ? history.go(1) : document.querySelector('ul.pagination > li:last-child > a').click();
            break;
    }
});

document.querySelector('tbody').addEventListener('click', (event) => {
    if (!event.ctrlKey) {
        return;
    }
    var tr = event.target.closest('tr');
    if (!tr) {
        return;
    }
    event.preventDefault();
    tr.classList.toggle('nyaa-checked');
});

document.querySelector('tbody').addEventListener('contextmenu', async (event) => {
    if (!event.target.title) {
        return;
    }
    var tr = event.target.closest('tr');
    if (!tr) {
        return;
    }
    event.preventDefault();
    var torrent = await getNyaaItemDetails(tr);
    if (event.altKey) {
        return postMessage({ aria2c: 'aria2c_jsonrpc_call', params: { urls: [ {url: torrent.magnet } ] } });
    }
    if (event.ctrlKey) {
        return navigator.clipboard.writeText(torrent.copy);
    }
    printPreview(torrent, event.layerY, event.layerX);
});

async function getNyaaItemDetails(tr) {
    var id = [...tr.parentNode.children].indexOf(tr);
    if (!torrents[id] && !working[id]) {
        var [gendre, title, links, filesize] = tr.querySelectorAll('td');
        var a = title.querySelector('a:last-child');
        var url = a.href;
        var name = tr.name = a.textContent;
        var size = filesize.textContent;
        var [magnet, torrent] = [...links.querySelectorAll('a')].reverse();
        tr.dataset.nyaa = id;
        magnet = magnet.href.slice(0, magnet.href.indexOf('&'));
        torrent = torrent?.href;
        var sites = [];
        var images = [];
        working[id] = true;
        var detail = await fetch(url);
        var text = await detail.text();
        var result = text.slice(text.indexOf('"torrent-description"') + 22);
        result.match(/https?:\/\/[^\]\[);!*]*/g)?.forEach((url) => url.match(/.(jpe?g|png|gif|avif|bmp|webp)/) ? !images.includes(url) && images.push(url) : !sites.includes(url) && sites.push(url));
        var copy = i18n.name + '\n' + name + ' (' + size + ')\n' + i18n.preview + '\n' + (images.length !== 0 ? images.join('\n') : sites.length !== 0 ? sites.join('\n') : 'Null') + '\n' + (torrent ? i18n.torrent + '\n' + torrent + '\n' : '') + i18n.magnet + '\n' + magnet;
        working[id] = false;
        torrents[id] = {id, name, size, torrent, magnet, sites, images, copy};
    }
    return torrents[id];
}

async function printPreview({id, images, sites}, top, left) {
    if (images.length !== 0) {
        return popupPreview(id, images[0], top, left);
    }
    if (sites.length !== 0) {
        return GM_openInTab(sites[0]);
    }
}

function popupPreview(id, image, top, left) {
    var img = previews[id];
    if (!img) {
        img = document.createElement('img');
        img.id = 'preview' + id;
        img.src = image;
        img.clssName = 'nyaa-preview';
        img.addEventListener('click', event => img.remove());
        document.body.append(img);
    }
    img.style.cssText = 'top: ' + top + 'px; left: ' + left + 'px;';
}
