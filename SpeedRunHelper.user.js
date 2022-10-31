// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.2.1
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        *://www.speedrun.com/*
// @require      https://raw.githubusercontent.com/jc3213/jslib/main/ui/dragdrop.js#sha256-cC3r27zz33gEpm1Esdzlxiw3pshWSINZbJ6TohfyFpo=
// @grant        GM_webRequest
// @webRequest   {"selector": "*.hotjar.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.stripe.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.scorecardresearch.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var logger = {};
var style = {};
var {clientWidth, clientHeight} = document.documentElement;

var css = document.createElement('style');
css.innerHTML = '#widget {display: none !important;}\
#centerwidget {width: 100% !important;}\
.speedrun-window {position: fixed; width: 1280px; height: 740px; z-index: 999999;}\
.speedrun-window iframe {width: 1280px !important; height: 720px !important;}\
.speedrun-menu {background-color: #52698A; width: 100%; user-select: none; height: 20px; display: grid; grid-template-columns: auto 66px;}\
.speedrun-menu > * {display: flex;}\
.speedrun-menu > * > * {flex: 1;}\
.speedrun-item {background-color: #fff; color: #000; cursor: pointer; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 2px;}\
.speedrun-item:hover {filter: opacity(60%);}\
.speedrun-item:active {filter: opacity(30%);}\
#speedrun-minimum {line-height: 30px;}\
.speedrun-minimum {bottom: 0px; left: 0px; width: 25% !important; height: 20px !important; z-index: 99999;}\
.speedrun-minimum iframe {display: none !important;}\
.speedrun-maximum {top: 0px; left: 0px; width: ' + clientWidth + 'px !important; height: ' + clientHeight + 'px !important; z-index: 999999;}\
.speedrun-maximum iframe {width: 100% !important; height: calc(100% - 20px) !important;}\
#speedrun-restore, .speedrun-minimum #speedrun-minimum, .speedrun-maximum #speedrun-maximum {display: none;}\
.speedrun-minimum #speedrun-restore:nth-child(2), .speedrun-maximum #speedrun-restore:nth-child(4) {display: block;}';
document.body.append(css);

document.querySelector('.widget-column').remove();

if (document.title.includes('series') || document.title.startsWith('Runs')) {
    appendEvent('div.maincontent', 'a.rounded-sm', record => {
        var src = record.href;
        var game = record.parentNode.querySelector('div.font-title').innerText;
        var [style, category, rank, time, player, nation] = record.innerText.split('\n');
        viewSpeedrunRecord(src, rank, player, time);
    });
}
else {
    appendEvent('[component-name="GameLeaderboardWidget"]', 'tr', record => {
        var src = record.querySelector('a').href;
        var [rank, player, time, platform, date] = record.innerText.split('\t');
        rank = rank === '' ? record.querySelector('img').outerHTML : rank;
        viewSpeedrunRecord(src, rank, player, time);
    });
}

function appendEvent(board, record, callback) {
    var _board_ = document.querySelector(board);
    _board_.addEventListener('contextmenu', event => {
        var _record_ = [..._board_.querySelectorAll(record)].find(record => record.contains(event.target));
        if (_record_) {
            event.preventDefault();
            callback(_record_);
        }
    });
}

function cssTextGetter(offset) {
    var top = 130 + offset;
    var left = (document.documentElement.clientWidth - 1280) / 2 + offset;
    if (left < 0) {
        left = 0;
    }
    return 'top: ' + top + 'px; left: ' + left + 'px;';
}

async function viewSpeedrunRecord(src, rank, player, time) {
    var id = src.slice(src.lastIndexOf('/') + 1);
    var title = '<div>Rank : ' + rank + '</div><div>Player : ' + player + '</div><div>Time : ' + time + '</div>';
    var view = document.querySelector('#speedrun-' + id);
    if (view) {
        view.style.cssText = style[id] = cssTextGetter(view.offset);
    }
    else if (logger[id]) {
        createRecordWindow(id, title, top, logger[id]);
    }
    else {
        var response = await fetch(src);
        var html = await response.text();
        var xml = document.createElement('div');
        xml.innerHTML = html;
        logger[id] = xml.querySelector('iframe[class]');
        createRecordWindow(id, title, top, logger[id]);
        xml.remove();
    }
}

function createRecordWindow(id, title, top, content) {
    if (content.tagName === 'A') {
        return open(content.href, '_blank');
    }
    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.offset = document.querySelectorAll('.speedrun-window').length * 30;
    container.className = 'speedrun-window';
    container.innerHTML = '<div class="speedrun-menu"><div>' + title + '</div>\
<div><div id="speedrun-minimum" class="speedrun-item">➖</div>\
<div id="speedrun-restore" class="speedrun-item">🔳</div>\
<div id="speedrun-maximum" class="speedrun-item">🔲</div>\
<div id="speedrun-restore" class="speedrun-item">🔳</div>\
<div id="speedrun-close" class="speedrun-item">❌</div></div></div>';
    container.style.cssText = style[id] = cssTextGetter(container.offset);
    container.appendChild(content);
    container.querySelector('#speedrun-minimum').addEventListener('click', event => {
        container.classList.add('speedrun-minimum');
        container.classList.remove('speedrun-maximum');
        container.style.cssText = '';
    });
    container.querySelector('#speedrun-maximum').addEventListener('click', event => {
        container.classList.add('speedrun-maximum');
        container.classList.remove('speedrun-minimum');
        container.style.cssText = '';
    });
    container.querySelectorAll('#speedrun-restore').forEach(button => button.addEventListener('click', event => {
        container.classList.remove('speedrun-maximum', 'speedrun-minimum');
        container.style.cssText = style[id];
    }));
    container.querySelector('#speedrun-close').addEventListener('click', event => {
        container.remove();
    });
    document.body.appendChild(container);
    var dragdrop = new DragDrop(container);
    dragdrop.ondragend = position => {
        if (container.className === 'speedrun-window') {
            style[id] = container.style.cssText;
        }
        else {
            container.style.cssText = '';
        }
    }
}
