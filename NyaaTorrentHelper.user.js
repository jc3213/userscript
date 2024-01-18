// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      0.9.5
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
var aria2c = 'Download With Aria2';

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
    var text = event.target.value;
    switch (text) {
        case '':
            result.forEach((tr) => {
                tr.style.display = 'table-row';
            });
            break;
        case keyword:
            result.forEach((tr) => {
                tr.style.display = tr.style.display === 'none' ? 'table-row' : 'none';
            });
            break;
        default:
            var regexp = new RegExp(text.replace(/[\|\/\\\+,:;\s]+/g, '|'), 'i');
            Object.keys(torrents).forEach(id => {
                var {name, tr} = torrents[id];
                if (regexp.test(name)) {
                    tr.style.display = 'table-row';
                    return
                }
                tr.style.display = 'none';
                result.push(tr);
            });
            keyword = text;
            break;
    }
});

var filter = document.createElement('th');
filter.className = 'text-center';
filter.innerHTML = '<a href style="opacity: 1; font-size: 12px; line-height: 42px;">🔎</a>';
filter.style.width = '40px';
filter.addEventListener('click', (event) => {
    event.preventDefault();
    var {altKey, target: {tagName}} = event;
    if (tagName === 'A') {
        altKey ? aria2Download([...document.querySelectorAll('td > input:checked')].map(i => torrents[i.value].magnet)) : batchCopy();
    }
});

document.querySelector('#navbar').appendChild(search);
document.querySelector('thead > tr').append(filter);

function filterResult(text) {

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
    td.innerHTML = `<input type="checkbox" value="${id}">`;
    tr.appendChild(td);
    //
    title.addEventListener('contextmenu', async event => {
        event.preventDefault();
        var {layerY, layerX, ctrlKey, altKey} = event;
        torrents[id].top = layerY;
        torrents[id].left = layerX;
        if (altKey) {
            aria2Download(magnet);
        }
        else if (ctrlKey) {
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
    var txtLT = `${i18n.name}\n${name} [${size}]`;
    var txtRM = `${i18n.magnet}\n${magnet}`;
    var txtRT = torrent ? `${i18n.torrent}\n${torrent}\n${txtRM}` : txtRM;
    if (image === undefined && site === undefined) {
        var data = await getPreview(id, url);
        site = data.site;
        image = data.image;
    }
    var txtCT = `${i18n.preview}\n${image ? image : site}`;
    return `${txtLT}\n${txtCT}\n${txtRT}`;
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
    var result = desc.slice(0, desc.indexOf('</div>'));
    var urls = result.match(/[\[\(*]https?:\/\/[^\]\)*]+[\]\*)]/g);
    var sites = [];
    var images = [];
    urls.forEach(url => {
        var result = url.slice(1, -1);
        result.match(/(jpg|png|gif|avif|bmp|webp)\)$/) ? !images.includes(result) && images.push(result) : !sites.includes(result) && sites.push(result);
    });
    torrents[id].image = images[0];
    torrents[id].site = sites[0];
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
    img.style.cssText = `position: absolute; z-index: 3213; max-height: 800px; width: auto; top: ${top}px; left: ${left}px`;
    img.addEventListener('click', event => img.remove());
    document.body.append(img);
}

function aria2Download(url) {
    var json = Array.isArray(url) ? url.map(url=> json = {url}) : [{url}];
    postMessage({ aria2c, download: { json } });
}
