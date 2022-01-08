// ==UserScript==
// @name         Nyaa Torrent Helper
// @namespace    https://github.com/jc3213/userscript
// @version      5.3
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
#filter-list {position: absolute; background-color: #dff0d8; width: 1000px; height: 560px; white-space: nowrap; overflow-y: scroll; display: none; overflow-x: hidden; z-index: 9999999;}\
#filter-list > * {display: grid; grid-template-columns: 700px 70px 70px 70px 70px; position: relative;}\
#filter-list > * > * {padding: 10px 5px; margin: 1px; color: #fff; border-radius: 5px; text-decoration: none;}\
#filter-list > * > *:not(:first-child, text) {text-align: center; cursor: pointer; user-select: none;}\
#filter-list > * > *:nth-child(1) {background-color: #2bceec; overflow: hidden; z-index: 3213;}\
#filter-list > * > *:nth-child(1):hover {min-width: fit-content;}\
#filter-list > * > *:nth-child(2) {background-color: #ee1c1c;}\
#filter-list > * > *:nth-child(3):not(text) {background-color: #0056b0;}\
#filter-list > * > *:nth-child(4) {background-color: #056b00;}\
#filter-list > * > *:nth-child(5) {background-color: #0005cc;}\
#filter-preview {position: absolute; z-index: 3213;}';
document.head.appendChild(css);

var menu = document.createElement('div');
menu.id = 'filter-menu';
menu.innerHTML = '<input class="form-control search-bar" placeholder="' + i18n.keyword + '"><button class="btn btn-primary">🔆</button>';
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
    menu.querySelector('#preview').addEventListener('click', event => {
        event.target.style.cssText = 'background-color: #C3C;';
        getPreviewHandler(data, {top: event.clientY, left: event.clientX});
    });
    menu.querySelector('#copy').addEventListener('click', event => {
        event.target.innerText = '!';
        navigator.clipboard.writeText(i18n.name + ':\n' + data.name + ' (' + data.size + ')\n\n' + i18n.preview + ':\n' + (data.image ? data.image : data.web ? data.web : '') + '\n\n' + (data.torrent ? i18n.torrent + ':\n' + data.torrent + '\n\n' : '') + i18n.magnet + ':\n' + data.magnet);
        setTimeout(() => {event.target.innerText = i18n.copy;}, 1000);
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
    if (link.length === 2) {
        var torrent = link[0].href;
        var magnet = slimMagnetURI(link[1].href);
    }
    else {
        magnet = slimMagnetURI(link[0].href);
    }
    var data = {id, name, src, size, torrent, magnet};
    queue.push(data);
    a.addEventListener('contextmenu', event => {
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
    if (data.none) {
        noValidPreview(data);
    }
    else if (data.image) {
        createPreview(data, mouse);
    }
    else if (data.new) {
        openWebPreview(data);
    }
    else {
        xmlNodeHandler(data, mouse, getPreviewURL);
    }
}

function xmlNodeHandler(data, mouse, handler) {
    fetch(data.src).then(response => response.text()).then(text => {
        if (text.includes('502 Bad Gateway')) {
            throw new Error('502 Bad Gateway');
        }
        else {
            var node = document.createElement('div');
            node.innerHTML = text;
            handler(node, data, mouse);
        }
    }).catch(error => setTimeout(() => xmlNodeHandler(data, mouse, handler), 5000));
}

function getPreviewURL(node, data, mouse) {
    var description = node.querySelector('#torrent-description').innerHTML;
    var img = /https?:\/\/[^\)\]]+\.(jpg|png)/g.exec(description);
    if (img) {
        data.image = img[0];
        return createPreview(data, mouse);
    }
    var url = /https?:\/\/[^\*\r\n\)\]]+/g.exec(description);
    if (url) {
        data.web = url[0];
        return openWebPreview(data);
    }
    data.none = true;
    noValidPreview(data);
}

function openWebPreview(data) {
    GM_openInTab(data.web, true);
    action[data.id] = false;
}

function noValidPreview(data) {
    alert(data.name + '\nNo Preview!');
    action[data.id] = false;
}

// Create preview
function createPreview(data, mouse) {
    var image = document.createElement('img');
    image.id = 'filter-preview';
    image.src = data.image;
    image.style.cssText = 'max-height: 800px; width: auto; top: ' + (mouse.top + 800 > innerHeight ? innerHeight - 800 : mouse.top) + 'px; left: ' + (mouse.left + 600 > innerWidth ? innerWidth - 600 : mouse.left) + 'px;';
    image.addEventListener('click', event => image.remove());
    document.body.appendChild(image);
    action[data.id] = false;
}
