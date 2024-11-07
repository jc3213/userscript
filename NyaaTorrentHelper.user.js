// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.12.2
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_openInTab
// ==/UserScript==

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
        magnet: 'Magnet:',
        oncopy: 'Copy selected torrents to clipboard?',
        onrpc: 'Send selected torrents to JSON-RPC?'
    },
    'zh-CN': {
        keyword: '关键词……',
        name: '名字：',
        preview: '预览：',
        torrent: '种子：',
        magnet: '磁链：',
        oncopy: '将所选种子复制到粘贴板吗？',
        onrpc: '将所选种子发送至JSON-RPC？'
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
        filterNyaaTorrents();
    }
});

var button = document.createElement('div');
button.className = 'input-group-btn search-btn';
button.innerHTML = '<button class="btn btn-primary">🔎</button>';
button.addEventListener('click', (event) => {
    event.preventDefault();
    filterNyaaTorrents();
});

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
        case 'c':
            event.altKey && copyTorrentsToClipboard();
            break;
        case 's':
            event.altKey && downloadWithAria2();
    }
});

async function copyTorrentsToClipboard() {
    if (confirm(i18n.oncopy)) {
        var selected = await Promise.all([...document.querySelectorAll('tr.nyaa-checked')].map(async (tr) => {
            await getNyaaTorrentDetail(tr.info);
            return tr.info.copy;
        }));
        var result = selected.join('\r\n');
        alert(result);
        navigator.clipboard.writeText(result);
    }
}

function downloadWithAria2() {
    if (confirm(i18n.onrpc)) {
        var urls = [...document.querySelectorAll('tr.nyaa-checked')].map((tr) => tr.torrent.magnet);
        alert('Download request has been sent to aria2 JSON-RPC');
        postMessage({ aria2c: 'aria2c_jsonrpc_call', params: { urls } });
    }
}

document.querySelectorAll('tbody > tr').forEach((tr) => {
    var [name, link, size] = tr.querySelectorAll('td:nth-child(2) > a:last-child, td:nth-child(3), td:nth-child(4)');
    var url = name.href;
    var id = url.slice(url.lastIndexOf('/') + 1);
    var [magnet, torrent] = [...link.children].reverse().map((a) => a?.href);
    tr.info = {id, url, name: name.textContent, torrent, magnet: magnet.slice(0, magnet.indexOf('&')), size: size.textContent};
    name.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        if (event.altKey) {
            return postMessage({ aria2c: 'aria2c_jsonrpc_call', params: [ {url: magnet } ] });
        }
        await getNyaaTorrentDetail(tr.info);
        event.ctrlKey ? navigator.clipboard.writeText(tr.info.copy) : getNyaaTorrentPreview(tr.info, event.layerY, event.layerX);
    });
    tr.addEventListener('click', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            tr.classList.toggle('nyaa-checked');
        }
    });
});

async function getNyaaTorrentDetail(info) {
    if (info.copy) {
        return info;
    }
    var {id, url, name, torrent, magnet, size} = info;
    if (!working[id]) {
        var site = [];
        var image = [];
        working[id] = true;
        var container = document.createElement('div');
        container.innerHTML = await fetch(url).then((res) => res.text());
        var result = container.querySelector('#torrent-description').textContent;
        result.match(/https?:\/\/[^\]\[);!*"]*/g)?.forEach((url) => url.match(/.(jpe?g|png|gif|avif|bmp|webp)/) ? !image.includes(url) && image.push(url) : !site.includes(url) && site.push(url));
        info.site = site;
        info.image = image;
        info.copy = i18n.name + '\n' + name + ' (' + size + ')\n' + i18n.preview + '\n' + (image.length !== 0 ? image.join('\n') : site.length !== 0 ? site.join('\n') : 'Null') + '\n' + (torrent ? i18n.torrent + '\n' + torrent + '\n' : '') + i18n.magnet + '\n' + magnet;
        working[id] = false;
    }
    return info;
}

async function getNyaaTorrentPreview({id, image, site}, top, left) {
    if (image.length !== 0) {
        return popupPreview(id, image[0], top, left);
    }
    if (site.length !== 0) {
        return GM_openInTab(site[0]);
    }
}

function popupPreview(id, image, top, left) {
    var img = previews[id];
    if (!img) {
        img = document.createElement('img');
        img.id = 'preview' + id;
        img.src = image;
        img.className = 'nyaa-preview';
        img.addEventListener('click', event => img.remove());
        previews[id] = img;
    }
    img.style.cssText = 'top: ' + top + 'px; left: ' + left + 'px;';
    document.body.append(img);
}
