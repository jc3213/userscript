// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.8.5
// @description  Nyaa Torrent easy preview, batch export, better filter
// @author       jc3213
// @match        https://*.nyaa.si/*
// @grant        GM_openInTab
// @grant        GM_webRequest
// @webRequest   {"selector": "*://*.realsrv.com/*", "action": "cancel"}
// ==/UserScript==

if (location.pathname.startsWith('/view/')) {
    return;
}

var torrents = {};
var working = {};

// UI
var keyword;
var filter = [];
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

var input = document.createElement('input');
input.className = 'form-control search-bar';
input.style.cssText = 'display: inline-block; width: 150px !important; margin-top: 8px; margin-left: 20px;';
input.placeholder = i18n.keyword;
input.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
        button.click()
    }
});

var button = document.createElement('button');
button.className = 'btn btn-primary';
button.style.cssText = 'margin-top: -3px;';
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
    var text = input.value;
    if (keyword === text) {
        if (keyword === '') {
            return;
        }
        filter.forEach(tr => {
            tr.style.display = tr.style.display === 'none' ? 'table-row' : 'none';
        });
    }
    else if (text === '') {
        if (filter.length === 0) {
            return;
        }
        filter.forEach(tr => {
            tr.style.display = 'table-row';
        });
    }
    else if (keyword !== text) {
        var keys = text.split(/[\|\/\\\+,:;\s]+/);
        filter = [];
        Object.keys(torrents).forEach(id => {
            var {name, tr} = torrents[id];
            if (keys.filter(key => name.includes(key)).length !== keys.length) {
                tr.style.display = 'none';
                filter.push(tr);
            }
            else {
                tr.style.display = 'table-row';
            }
        });
        keyword = text;
    }
}

async function batchCopy() {
    var array = [...document.querySelectorAll('td > input:checked')].map(i => getInformation(i.value));
    var result = await Promise.all(array);
    var text = result.join('\n\n');
    navigator.clipboard.writeText(text);
}
//

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        document.querySelector('ul.pagination > li:first-child > a').click();
    }
    if (event.key === 'ArrowRight') {
        document.querySelector('ul.pagination > li:last-child > a').click();
    }
});

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
    td.style.width = '39px';
    td.innerHTML = '<input type="checkbox" value="' + id + '">';
    tr.appendChild(td);
    //
    title.addEventListener('contextmenu', async event => {
        var {layerY, layerX, ctrlKey} = event;
        event.preventDefault();
        torrents[id].top = layerY;
        torrents[id].left = layerX;
        if (ctrlKey) {
            var text = await getInformation(id);
            navigator.clipboard.writeText(text);
        }
        else {
            printPreview(id);
        }
    });
});

async function getInformation(id) {
    var {site, image, name, size, torrent, magnet, url} = torrents[id];
    var txtl = i18n.name + ':\n' + name + ' (' + size + ')';
    var txtr = torrent ? '\n' + i18n.torrent + ':\n' + torrent + '\n' + i18n.magnet + ':\n' + magnet : '\n' + i18n.magnet + ':\n' + magnet;
    if (image === undefined && site === undefined) {
        var data = await getPreview(id, url);
        site = data.site;
        image = data.image;
    }
    var txtd = image ? '\n' + i18n.preview + ':\n' + image : '\n' + i18n.preview + ':\n' + site;
    return txtl + txtd + txtr;
}

async function printPreview(id) {
    if (working[id]) {
        return;
    }
    var {url, image, site} = torrents[id];
    if (image) {
        popupPreview(id, image);
        working[id] = false;
    }
    else if (site) {
        GM_openInTab(site);
        working[id] = false;
    }
    else {
        await getPreview(id, url)
        printPreview(id);
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
    return torrents[id];
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
    img.style.cssText = 'position: absolute; z-index: 3213; max-height: 800px; width: auto; top: ' + top + 'px; left: ' + left + 'px';
    img.addEventListener('click', event => img.remove());
    document.body.append(img);
}
