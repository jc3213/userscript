// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      7.0
// @description  Nyaa Torrent right click to open available open preview in new tab
// @author       jc3213
// @connect      *
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_openInTab
// ==/UserScript==

'use strict';
// Variables
var queue = [];
var keyword = '';
var filter = [];
var action = {};

// i18n Strings
var messages = {
    'en-US': {
        keyword: 'Keyword...',
        name: 'Name',
        preview: 'Preview',
        torrent: 'Torrent',
        magnet: 'Magnet',
        copy: 'Copy'
    },
    'zh-CN': {
        keyword: '关键词...',
        name: '名字',
        preview: '预览',
        torrent: '种子',
        magnet: '磁链',
        copy: '复制'
    }
};
var i18n = messages[navigator.language] ?? messages['en-US'];

if (['502 Bad Gateway', '429 Too Many Requests'].includes(document.title)) {
    setTimeout(() => location.reload(), 5000);
}

// Extract data
document.querySelectorAll('table > tbody > tr').forEach((tr, index) => {
    var a = tr.querySelectorAll('td:nth-child(2) > a');
    a = a.length === 2 ? a[1] : a[0];
    var id = a.href.slice(a.href.lastIndexOf('/') + 1);
    var name = a.innerText;
    var src = a.href;
    var size = tr.querySelector('td:nth-child(4)').innerText;
    var link = tr.querySelectorAll('td:nth-child(3) > a');
    var torrent = link.length === 2 ? link[0].href : null;
    var magnet = link.length === 2 ? link[1].href : link[0].href;
    magnet = magnet.slice(0, magnet.indexOf('&'));
    var data = {id, name, src, size, torrent, magnet, tr};
    queue.push(data);
    a.addEventListener('contextmenu', async event => {
        event.preventDefault();
        td.querySelector('#load').style.display = 'inline';
        await getPreviewHandler(data, {top: event.clientY, left: event.clientX});
        a.style.cssText = 'color: #C33;';
        td.querySelector('#load').style.display = 'none';
    });
    var td = document.createElement('td');
    td.className = 'filter-extra';
    td.innerHTML = '<input type="checkbox" id="batch"> <input type="button" id="remove"> <span id="load">⏳</span>';
    td.querySelector('#remove').addEventListener('click', event => tr.remove());
    tr.appendChild(td);
});

// Helper Button
var new_th = document.createElement('th');
new_th.innerText = 'Helper';
new_th.className = 'text-center';
document.querySelector('table > thead > tr').appendChild(new_th);

// Create UI
var css= document.createElement('style');
css.innerHTML = '.filter-text {display: inline-block; width: 170px !important; margin-top: 8px;}\
.filter-button {background-color: #056b00; margin-top: -3px;}\
.filter-extra {position: relative;}\
.filter-extra * {margin: 0px 3px; width: 16px; height: 16px;}\
.filter-extra #remove {background-color: #000;}\
.filter-extra #load {position: absolute; right: 0px; top: 10px; display: none;}\
.filter-preview {position: fixed; z-index: 3213; max-height: 800px; width: auto;}';
document.head.appendChild(css);

var menu = document.createElement('div');
menu.innerHTML = '<input class="form-control search-bar filter-text" placeholder="' + i18n.keyword + '" value="' + document.querySelector('#navbar form > input').value + '"><button class="btn btn-primary filter-button">🌐</button>';
document.querySelector('#navbar').appendChild(menu);
menu.querySelector('input').addEventListener('keypress', event => event.key === 'Enter' && menu.querySelector('button').click());
menu.querySelector('button').addEventListener('click', event => {
    if (event.ctrlKey) {
        var result = '';
        document.querySelectorAll('table > tbody > tr > td > #batch').forEach(async (batch, index) => {
            if (batch.checked) {
                result += parseTorrentInfo(queue[index]) + '\n\n=======================================================\n\n';
            }
        });
        return navigator.clipboard.writeText(result);
    }
    var value = menu.querySelector('input').value;
    if (filter.length !== 0) {
        filter.forEach(tr => { tr.style.display = tr.style.display === 'none' ? 'table-row' : 'none'; });
    }
    else if (keyword !== value) {
        var keys = value.split(/[\|\/\\\+,:;\s]+/);
        filter = [];
        queue.forEach(data => {
            if (keys.filter(key => data.name.includes(key)).length === keys.length) {
                data.tr.style.display = 'none';
                filter.push(data.tr);
            }
        });
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
        document.querySelector('li.next > a').click();
    }
    else if (event.key === 'ArrowLeft') {
        document.querySelector('li.previous > a').click();
    }
});

function parseTorrentInfo(data) {
    return i18n.name + ':\n' + data.name + ' (' + data.size + ')\n\n' + i18n.preview + ':\n' + (data.url ?? '') + '\n\n' + (data.torrent ? i18n.torrent + ':\n' + data.torrent + '\n\n' : '') + i18n.magnet + ':\n' + data.magnet;
}

// Preview handler
async function getPreviewHandler(data, mouse) {
    if (action[data.id] || document.getElementById(data.id)) {
        return;
    }
    action[data.id] = true;
    data.type === 'none' ? alert(data.name + '\nNo Preview!') :
    data.type === 'image' ? createPreview(data, mouse) :
    data.type === 'host' ? GM_openInTab(data.url, true) :
    await xmlNodeHandler(data.src).then(({type, url}) => {
        data.type = type;
        data.url = url;
        action[data.id] = false;
        getPreviewHandler(data, mouse);
    }).catch(error => { action[data.id] = getPreviewHandler(data, mouse); });
    action[data.id] = false;
}

function xmlNodeHandler(url) {
    return fetch(url).then(response => response.text()).then(text => {
        if (text.includes('502 Bad Gateway')) {
            throw new Error('502 Bad Gateway');
        }
        else {
            var node = document.createElement('div');
            node.innerHTML = text;
            var desc = node.querySelector('#torrent-description').innerText;
            var img = /https?:\/\/[^\)\]]+\.(jpg|png)/g.exec(desc);
            if (img) {
                return {type: 'image', url: img[0]};
            }
            var url = /https?:\/\/[^\*\r\n\)\]]+/g.exec(desc);
            if (url) {
                return {type: 'host', url: url[0]};
            }
            return {type: 'none'};
        }
    });
}

// Create preview
function createPreview({id, url}, mouse) {
    var image = document.createElement('img');
    image.className = 'filter-preview';
    image.id = id;
    image.src = url;
    image.style.cssText = 'top: ' + (mouse.top + 800 > innerHeight ? innerHeight - 800 : mouse.top) + 'px; left: ' + (mouse.left + 600 > innerWidth ? innerWidth - 600 : mouse.left) + 'px;';
    image.addEventListener('click', event => image.remove());
    document.body.appendChild(image);
}
