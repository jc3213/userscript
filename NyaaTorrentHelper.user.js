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
    var torrent = link.length === 2 ? link[0].href : '';
    var magnet = link.length === 2 ? link[1].href : link[0].href;
    magnet = magnet.slice(0, magnet.indexOf('&'));
    var td = document.createElement('td');
    td.className = 'filter-extra';
    td.innerHTML = '<input type="checkbox" value="' + index + '"> <input type="button"> <span>⏳</span>';
    td.querySelector('[type="button"]').addEventListener('click', event => tr.remove());
    tr.appendChild(td);
    var data = {id, name, src, size, torrent, magnet, tr, td};
    queue[index] = data;
    a.addEventListener('contextmenu', async event => {
        event.preventDefault();
        if (action[id] || document.getElementById(id)) {
            return;
        }
        if (!data.type) {
            var result = await fetchPreview(data);
            queue[index] = data = {...data, ...result};
        }
        getPreview(data, {top: event.clientY, left: event.clientX});
        a.style.cssText = 'color: #C33;';
    });
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
.filter-extra [type="button"] {background-color: #000;}\
.filter-extra span {position: absolute; right: 0px; top: 10px; display: none;}\
.filter-preview {position: fixed; z-index: 3213; max-height: 800px; width: auto;}';
document.head.appendChild(css);

var menu = document.createElement('div');
menu.innerHTML = '<input class="form-control search-bar filter-text" placeholder="' + i18n.keyword + '" value="' + document.querySelector('#navbar form > input').value + '"><button class="btn btn-primary filter-button">🌐</button>';
document.querySelector('#navbar').appendChild(menu);
menu.querySelector('input').addEventListener('keypress', event => event.key === 'Enter' && menu.querySelector('button').click());
menu.querySelector('button').addEventListener('click', event => {
    if (event.ctrlKey) {
        batchCopy();
    }
    else {
        filterResult();
    }
});

function batchCopy() {
    if (action.copy) {
        return;
    }
    action.copy = true;
    var array = [];
    var checked = document.querySelectorAll('table > tbody > tr > td > [type="checkbox"]:checked');
    checked.forEach(async batch => {
        var data = queue[batch.value];
        if (!data.type) {
            var result = await fetchPreview(data);
            queue[batch.value] = data = {...data, ...result};
        }
        array.push(copyInfo(data));
    });
    var interval = setInterval(() => {
        if (checked.length === array.length) {
            navigator.clipboard.writeText(array.join('\n\n======================================================\n\n'));
            clearInterval(interval);
            action.copy = false;
        }
    }, 250);
}

function copyInfo({name, size, url = '', torrent, magnet}) {
    return i18n.name + ':\n' + name + ' (' + size + ')\n\n' + i18n.preview + ':\n' + url + '\n\n' + i18n.torrent + ':\n' + torrent + '\n\n' + i18n.magnet + ':\n' + magnet;
}

function filterResult() {
    var text = menu.querySelector('input').value;
    if (keyword === text) {
        if (keyword === '') {
            return;
        }
        filter.forEach(tr => { tr.style.display = tr.style.display === 'none' ? 'table-row' : 'none'; });
    }
    else if (text === '') {
        filter.forEach(tr => { tr.style.display = 'table-row'; });
    }
    else if (keyword !== text) {
        var keys = text.split(/[\|\/\\\+,:;\s]+/);
        filter = [];
        queue.forEach(({name, tr}) => {
            if (keys.filter(key => name.includes(key)).length === keys.length) {
                tr.style.display = 'none';
                filter.push(tr);
            }
        });
        keyword = text;
    }
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
        document.querySelector('li.next > a').click();
    }
    else if (event.key === 'ArrowLeft') {
        document.querySelector('li.previous > a').click();
    }
});

// Preview handler
function fetchPreview({id, src, td}) {
    action[id] = true;
    td.querySelector('span').style.display = 'inline';
    return fetch(src).then(response => response.text()).then(text => {
        if (text.includes('502 Bad Gateway') || text.includes('404 Not Found')) {
            throw 'Error';
        }
        else {
            action[id] = false;
            td.querySelector('span').style.display = 'none';
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
    }).catch(error => new Promise(resolve => {
        setTimeout(() => {
            resolve(fetchPreview({id, src, td}));
        }, 5000);
    }));
}

// Create preview
function getPreview(data, mouse) {
    data.type === 'none' ? alert(data.name + '\nNo Preview!') :
    data.type === 'image' ? imagePreview(data, mouse) :
    data.type === 'host' ? GM_openInTab(data.url, true) : null;
}

function imagePreview(id, url, mouse) {
    var image = document.createElement('img');
    image.className = 'filter-preview';
    image.id = id;
    image.src = url;
    image.style.cssText = 'top: ' + mouse.top + 'px; left: ' + mouse.left + 'px;';
    image.addEventListener('click', event => image.remove());
    document.body.appendChild(image);
}
