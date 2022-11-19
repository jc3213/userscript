// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.8.0
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        https://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_openInTab
// @grant        GM_webRequest
// @webRequest   {"selector": "*://*.realsrv.com/*", "action": "cancel"}
// ==/UserScript==

var torrents = {};
var working = {};
var messages = {
    'en-US': {
        keyword: 'Keyword...',
        name: 'Name',
        preview: 'Preview',
        torrent: 'Torrent',
        magnet: 'Magnet'
    },
    'zh-CN': {
        keyword: '关键词...',
        name: '名字',
        preview: '预览',
        torrent: '种子',
        magnet: '磁链'
    }
};
var i18n = messages[navigator.language] ?? messages['en-US'];

if (['502 Bad Gateway', '429 Too Many Requests'].includes(document.title)) {
    setTimeout(() => location.reload(), 5000);
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        document.querySelector('ul.pagination > li:first-child > a').click();
    }
    if (event.key === 'ArrowRight') {
        document.querySelector('ul.pagination > li:last-child > a').click();
    }
});

var css= document.createElement('style');
css.innerHTML = `.jsui-input {display: inline-block; width: 150px !important; margin-top: 8px; margin-left: 20px;}
.jsui-button {margin-top: -3px;}
.jsui-image {position: absolute; z-index: 3213; max-height: 800px; width: auto;}`;
document.head.appendChild(css);

var input = document.createElement('input');
input.className = 'form-control search-bar jsui-input';
input.placeholder = i18n.keyword;
input.value = document.querySelector('#navbar form > input').value;
input.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
        button.click()
    }
});

var button = document.createElement('button');
button.className = 'btn btn-primary jsui-button';
button.innerText = '🕸️';
button.addEventListener('click', event => {
    if (event.ctrlKey) {
        batchCopy();
    }
    else {
        filterResult();
    }
});

var menu = document.createElement('div');
menu.append(input, button);

document.querySelector('#navbar').appendChild(menu);

function filterResult() {
    console.log('Ctrl key is not pressed');
}

function batchCopy() {
    console.log('Ctrl key is pressed');
}
//

document.querySelectorAll('tbody > tr').forEach(tr => {
    var child = tr.querySelectorAll('td');
    var title = child[1].querySelectorAll('a');
    title = title[title.length - 1];
    var name = title.innerText;
    var url = title.href;
    var id = url.slice(url.lastIndexOf('/') + 1);
    var dl = child[2].querySelectorAll('a');
    var size = child[3].innerText;
    if (dl.length === 2) {
        var torrent = dl[0].href;
        var magnet = dl[1].href;
    }
    else {
        magnet = dl[0].href;
    }
    magnet = magnet.slice(0, magnet.indexOf('&'));
    torrents[id] = {url, torrent, magnet, name, size, tr};
    // UI
    var td = document.createElement('td');
    td.className = 'text-center';
    td.innerHTML = '<input type="checkbox" value="' + id + '">';
    tr.appendChild(td);
    //
    title.addEventListener('contextmenu', event => {
        var {layerY, layerX, ctrlKey} = event;
        event.preventDefault();
        torrents[id].top = layerY;
        torrents[id].left = layerX;
        if (ctrlKey) {
            copyTorrent(id);
        }
        else {
            printPreview(id);
        }
    });
});

function copyTorrent(id) {
    var {site, image, name, torrent, magnet, url} = torrents[id];
    var txtl = i18n.name + ':\n' + name;
    var txtr = torrent ? '\n' + i18n.torrent + ':\n' + torrent + '\n' + i18n.magnet + ':\n' + magnet : '\n' + i18n.magnet + ':\n' + magnet;
    if (image === undefined && site === undefined) {
        getPreview(id, url).then(t => copyTorrent(id));
    }
    else {
        var txtd = image ? '\n' + i18n.preview + ':\n' + image : '\n' + i18n.preview + ':\n' + site;
        navigator.clipboard.writeText(txtl + txtd + txtr);
    }
}

function printPreview(id) {
    if (working[id]) {
        return;
    }
    var {url, image, site} = torrents[id];
    if (image) {
        popupPreview(id, image);
        working[id] = false;
    }
    else if (site) {
        open(site, '_blank');
        working[id] = false;
    }
    else {
        getPreview(id, url).then(t => printPreview(id));
    }
}

async function getPreview(id, url) {
    working[id] = true;
    var res = await fetch(url);
    var text = await res.text();
    var idx = text.indexOf('"torrent-description"');
    var desc = text.slice(idx + 22);
    var ldx = desc.indexOf('</div>');
    desc = desc.slice(0, ldx);
    var images = desc.match(/\(https?:\/\/[^\)]+\)/g);
    if (images) {
        var image = images.find(url => url.match(/(jpg|png|gif|avif|bmp)\)$/));
        image = image.slice(1, image.length - 1);
    }
    else {
        var urls = desc.match(/\*\*(https?:\/\/[^\*]+)\*\*/g);
        var site = urls[0];
        site = site.slice(2, site.length - 2);
    }
    torrents[id].image = image;
    torrents[id].site = site;
    working[id] = false;
}

function popupPreview(id, image) {
    var img = document.querySelector('#preview' + id);
    if (img) {
        return;
    }
    var {top, left} = torrents[id];
    img = document.createElement('img');
    img.id = 'preview' + id;
    img.className = 'jsui-image';
    img.src = image;
    img.style.top = top + 'px';
    img.style.left = left + 'px';
    img.addEventListener('click', event => img.remove());
    document.body.append(img);
}
