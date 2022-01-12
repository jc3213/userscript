// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      5.4
// @description  Nyaa Torrent right click to open available open preview in new tab
// @author       jc3213
// @connect      *
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_openInTab
// ==/UserScript==

'use strict';
// Variables
var filter = false;
var keyword = [];
var queue = [];
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

// Create UI
var css= document.createElement('style');
css.innerHTML = '#filter-menu input {display: inline-block; width: 170px; margin-top: 8px;}\
#filter-menu button {background-color: #056b00; margin-top: -3px;}\
#filter-list {position: absolute; background-color: #dff0d8; width: 1000px; height: 560px; white-space: nowrap; overflow-y: scroll; display: none; overflow-x: hidden; z-index: 3213;}\
#filter-list > * {display: grid; grid-template-columns: 700px 70px 70px 70px 70px; position: relative;}\
#filter-list > * > * {padding: 10px 5px; margin: 1px; color: #fff; border-radius: 5px; text-decoration: none;}\
#filter-list > * > *:not(:first-child, text) {text-align: center; cursor: pointer; user-select: none;}\
#filter-list > * > *:nth-child(1) {background-color: #2bceec; overflow: hidden; z-index: 3213;}\
#filter-list > * > *:nth-child(1):hover {min-width: fit-content;}\
#filter-list > * > *:nth-child(2) {background-color: #ee1c1c;}\
#filter-list > * > *:nth-child(3):not(text) {background-color: #0056b0;}\
#filter-list > * > *:nth-child(4) {background-color: #056b00;}\
#filter-list > * > *:nth-child(5) {background-color: #0005cc;}\
#filter-preview {position: absolute; z-index: 3213; max-height: 800px; width: auto;}';
document.head.appendChild(css);

var menu = document.createElement('div');
menu.id = 'filter-menu';
menu.innerHTML = '<input class="form-control search-bar" placeholder="' + i18n.keyword + '"><button class="btn btn-primary">🌐</button>';
document.querySelector('#navbar').appendChild(menu);
menu.querySelector('input').addEventListener('keypress', event => event.key === 'Enter' && menu.querySelector('button').click());
menu.querySelector('button').addEventListener('click', event => {
    var keys = menu.querySelector('input').value.split(/[\|\/\\\+,:;\s]+/);
    if (filter && keys.join() === keyword.join()) {
        popup.style.display = 'none';
        filter = false;
    }
    else {
        popup.innerHTML = '';
        popup.style.cssText = 'left: ' + (document.documentElement.offsetWidth - 1000) / 2 + 'px; top: ' + document.querySelector('#navbar').offsetHeight + 'px; display: block';
        queue.forEach(data => keys.filter(key => data.name.includes(key)).length === keys.length && getFilterResult(data) );
        keyword = keys;
        filter = true;
    }
});

var popup = document.createElement('div');
popup.id = 'filter-list';
document.body.appendChild(popup);

// Show filter result
function getFilterResult(data) {
    var menu = document.createElement('div');
    menu.innerHTML = '<span>' + data.name + '</span>\
    <span id="preview">' + i18n.preview + '</span>' +
    (data.torrent ? '<a href="' + data.torrent + '" target="_blank">' + i18n.torrent + '</a>' : '<text></text>') +
    '<a href="' + data.magnet + '">' + i18n.magnet + '</a>\
    <span id="copy">' + i18n.copy + '</span>';
    popup.appendChild(menu);
    menu.querySelector('#preview').addEventListener('click', async event => {
        await getPreviewHandler(data, {top: event.clientY, left: event.clientX});
        event.target.style.cssText = 'background-color: #C3C;';
    });
    menu.querySelector('#copy').addEventListener('click', async event => {
        event.target.innerText = '!';
        data = {...data, ...(!data.type && await xmlNodeHandler(data.src))};
        navigator.clipboard.writeText(i18n.name + ':\n' + data.name + ' (' + data.size + ')\n\n' + i18n.preview + ':\n' + (data.url ?? '') + '\n\n' + (data.torrent ? i18n.torrent + ':\n' + data.torrent + '\n\n' : '') + i18n.magnet + ':\n' + data.magnet);
        event.target.innerText = i18n.copy;
    });
}

// Extract data
document.querySelectorAll('table > tbody > tr').forEach((element) => {
    var a = element.querySelectorAll('td:nth-child(2) > a');
    a = a.length === 2 ? a[1] : a[0];
    var id = a.href.split('/').pop();
    var name = a.innerHTML;
    var src = a.href;
    var size = element.querySelector('td:nth-child(4)').innerText;
    var link = element.querySelectorAll('td:nth-child(3) > a');
    var torrent = link.length === 2 ? link[0].href : null;
    var magnet = link.length === 2 ? link[1].href : link[0].href;
    magnet = magnet.slice(0, magnet.indexOf('&'));
    var data = {id, name, src, size, torrent, magnet};
    queue.push(data);
    a.addEventListener('contextmenu', async event => {
        event.preventDefault();
        await getPreviewHandler(data, {top: event.clientY, left: event.clientX});
        a.style.cssText = 'color: #C33;';
    });
});

// Preview handler
async function getPreviewHandler(data, mouse) {
    if (action[data.id] || document.getElementById('preview-' + data.id)) {
        return;
    }
    action[data.id] = true;
    data.type === 'none' ? alert(data.name + '\nNo Preview!') :
    data.type === 'image' ? createPreview(data.url, mouse) :
    data.type === 'host' ? GM_openInTab(data.url, true) : await xmlNodeHandler(data.src).then(({type, url}) => {
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
function createPreview(url, mouse) {
    var image = document.createElement('img');
    image.id = 'filter-preview';
    image.src = url;
    image.style.cssText = 'top: ' + (mouse.top + 800 > innerHeight ? innerHeight - 800 : mouse.top) + 'px; left: ' + (mouse.left + 600 > innerWidth ? innerWidth - 600 : mouse.left) + 'px;';
    image.addEventListener('click', event => image.remove());
    document.body.appendChild(image);
}
