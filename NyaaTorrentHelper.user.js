// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      4.35
// @description  Nyaa Torrent right click to open available open preview in new tab
// @author       jc3213
// @match        *://*.nyaa.si/*
// @exclude      *://*.nyaa.si/view/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

'use strict';
// Variables
var filter = false;
var keyword = [];
var queue = [];
var action = {};
var hosts = {
    'hentai-covers.site': '#image-viewer-container > img',
    'e-hentai.org': '#gd1 > div',
    'www.dlsite.com': 'li.slider_item.active > img'
}

// i18n Strings
var messages = {
    'en-US': {
        filter: 'Filter',
        keyword: 'Keyword...',
        name: 'Name',
        preview: 'Preview',
        torrent: 'Torrent',
        magnet: 'Magnet',
        copy: 'Copy'
    },
    'zh-CN': {
        filter: '过滤',
        keyword: '关键词...',
        name: '名字',
        preview: '预览',
        torrent: '种子',
        magnet: '磁链',
        copy: '复制'
    }
};
var i18n = messages[navigator.language] || messages['en-US'];

if (['502 Bad Gateway', '429 Too Many Requests'].includes(document.title)) {
    setTimeout(() => location.reload(), 5000);
}

// Create UI
var css= document.createElement('style');
css.innerHTML = '.filter-button {background-color: #056b00; border: 1px solid black; color: #FFF; padding: 10px; cursor: pointer; user-select: none;}\
.filter-buttonn:active {filter: opacity(30%);}\
.filter-item {position: relative; padding: 2px;}\
.filter-item > * {color: #fff; padding: 10px 5px; width: fit-content; border-radius: 3px; position: absolute; display: inline-block; text-decoration: none; vertical-align: middle;}\
.filter-item > *:not(:first-child) {cursor: pointer; width: 60px; text-align: center; user-select: none;}\
.filter-item *:not(:first-child):hover, filter-button:hover {filter: opacity(60%);}\
.filter-item > *:nth-child(1) {background-color: #2bceec; overflow: hidden; z-index: 3213; width: 728px;}\
.filter-item > *:nth-child(1):hover {min-width: fit-content;}\
.filter-item > *:nth-child(2) {background-color: #ee1c1c; left: 733px;}\
.filter-item > *:nth-child(3) {background-color: #0056b0; left: 797px;}\
.filter-item > *:nth-child(4) {background-color: #056b00; left: 860px;}\
.filter-item > *:nth-child(5) {background-color: #0005cc; left: 923px;}\
.filter-preview {position: fixed; z-index: 3213;}';
document.head.appendChild(css);

var container = document.createElement('div');
container.style.cssText = 'position:fixed; top: 6px; left: calc(40% - 50px); z-index: 3213; padding: 1px;';
document.body.appendChild(container);

var input = document.createElement('input');
input.style.cssText = 'color: black; border: 1px solid black; padding: 5px; width: 180px; height: 38px;';
input.placeholder = i18n.keyword;
input.addEventListener('keypress', (event) => { if (event.key === 'Enter') {button.click();} });
container.appendChild(input);

var button = document.createElement('span');
button.className = 'filter-button';
button.innerHTML = i18n.filter;
button.addEventListener('click', (event) => {
    var keys = input.value.split(/[\|\/\\\+,:;\s]+/);
    if (filter && keys.join() === keyword.join()) {
        popup.style.display = 'none';
        filter = false;
    }
    else {
        popup.innerHTML = '';
        popup.style.display = 'block';
        queue.forEach(data => {
            if (keys.filter(key => data.name.includes(key)).length === keys.length) {
                getFilterResult(data);
            }
        });
        popup.querySelectorAll('div').forEach((element, index) => { element.style.top = index * 40 + 'px'; });
        keyword = keys;
        filter = true;
    }
});
container.appendChild(button);

var popup = document.createElement('div');
popup.style.cssText = 'position: fixed; left: calc(50% - 550px); background-color: #dff0d8; width: 1000px; height: 560px; white-space: nowrap; overflow-y: scroll; display: none; overflow-x: hidden;';
container.appendChild(popup);

// Show filter result
function getFilterResult(data) {
console.log(data);
    var menu = document.createElement('div');
    menu.className = 'filter-item';
    menu.innerHTML = '<span>' + data.name + '</span>\
    <span>' + i18n.preview + '</span>\
    <a href="' + data.torrent + '" target="_blank" style="display: ' + (data.torrent ? 'block' : 'none') + '">' + i18n.torrent + '</a>\
    <a href="' + data.magnet + '">' + i18n.magnet + '</a>\
    <span>' + i18n.copy + '</span>';
    popup.appendChild(menu);
    menu.querySelector('span:nth-child(2)').addEventListener('click', (event) => {
        event.target.style.cssText = 'background-color: #C3C;';
        getPreviewHandler(data, {top: event.clientY, left: event.clientX});
    });
    menu.querySelector('span:nth-child(5)').addEventListener('click', (event) => {
        navigator.clipboard.writeText(i18n.name + ':\n' + data.name + '\n\n' + (data.image ? i18n.preview + ':\n' + data.image.src + '\n\n' : '') + (data.torrent ? i18n.torrent + ':\n' + data.torrent + '\n\n' : '') + i18n.magnet + ':\n' + data.magnet);
    });
}

// Extract data
document.querySelectorAll('table > tbody > tr').forEach((element) => {
    var data = {};
    var a = element.querySelectorAll('td:nth-child(2) > a');
    a = a.length === 2 ? a[1] : a[0];
    data.id = a.href.split('/').pop();
    data.name = a.innerHTML;
    data.src = a.href;
    var link = element.querySelectorAll('td:nth-child(3) > a');
    if (link.length === 2) {
        data.torrent = link[0].href;
        data.magnet = slimMagnetURI(link[1].href);
    }
    else {
        data.magnet = slimMagnetURI(link[0].href);
    }
    queue.push(data);
    a.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        a.style.cssText = 'color: #C33;';
        getPreviewHandler(data, {top: event.clientY, left: event.clientX});
    });
});

function slimMagnetURI(magnet) {
    return magnet.slice(0, magnet.indexOf('&'));
}

// Preview handler
function getPreviewHandler(data, mouse) {
    if (action[data.id] || document.getElementById('preview-' + data.id)) {
        return;
    }
    action[data.id] = true;
    if (data.image) {
        createPreview(data, mouse);
    }
    else if (data.new) {
        openWebPreview(data);
    }
    else if (data.sel) {
        xmlNodeHandler(data, mouse, getWebPreview);
    }
    else if (data.none) {
        noValidPreview(data);
    }
    else {
        xmlNodeHandler(data, mouse, getPreviewURL);
    }
}
function xmlNodeHandler(data, mouse, handler) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: data.src,
        onload: (details) => {
            if (details.response.includes('502 Bad Gateway')) {
                xmlNodeHandler(data, mouse, handler);
            }
            else {
                var node = document.createElement('div');
                node.innerHTML = details.response;
                handler(node, data, mouse);
            }
        },
        onerror: (details) => {
            xmlNodeHandler(data, mouse, handler);
        }
    });
}
function getPreviewURL(node, data, mouse) {
    var description = node.querySelector('#torrent-description').innerHTML;
    var img = /https?:\/\/[^\)\]]+\.(jpg|png)/g.exec(description);
    if (img) {
        data.image = document.createElement('img');
        data.image.src = img[0];
        return createPreview(data, mouse);
    }
    var url = /https?:\/\/[^\*\r\n\)\]]+/g.exec(description);
    if (url) {
        var src = url[0];
        var host = src.split(/[\/:]+/)[1];
        data.src = src;
        if (data.sel = hosts[host]) {
            xmlNodeHandler(data, mouse, getWebPreview);
        }
        else {
            data.new = true;
            openWebPreview(data);
        }
        return;
    }
    data.none = true;
    noValidPreview(data);
}
function getWebPreview(node, data, mouse) {
    data.image = node.querySelector(data.sel);
    if (data.image) {
        createPreview(data, mouse);
    }
    else {
        alert(data.name + '\n' + data.src + '\nFailed Previewing');
        action[data.id] = false;
    }
}
function openWebPreview(data) {
    if (confirm(data.name + '\n' + data.src + '\nNot Supported!\nOpen in New Tab?')) {
        open(data.src, '_blank');
    }
    action[data.id] = false;
}
function noValidPreview(data) {
    alert(data.name + '\nNo Preview!');
    action[data.id] = false;
}

// Create preview
function createPreview(data, mouse) {
    data.image.className = 'filter-preview';
    data.image.style.cssText = 'max-height: 800px; width: auto; top: ' + (mouse.top + 800 > innerHeight ? innerHeight - 800 : mouse.top) + 'px; left: ' + (mouse.left + 600 > innerWidth ? innerWidth - 600 : mouse.left) + 'px;';
    data.image.addEventListener('click', (event) => data.image.remove());
    document.body.appendChild(data.image);
    action[data.id] = false;
}
