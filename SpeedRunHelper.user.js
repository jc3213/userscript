// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      2.17
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        *://www.speedrun.com/*
// @grant        GM_webRequest
// @webRequest   {"selector": "*.hotjar.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.scorecardresearch.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var logger = {};
var offset = {};
var style = {};

var css = document.createElement('style');
css.innerHTML = '#widget {display: none !important;}\
#centerwidget {width: 100% !important;}\
.speedrun-window {position: fixed; width: 1280px; height: 740px; z-index: 999;}\
.speedrun-window iframe {height: calc(100% - 20px); width: 100%;}\
.speedrun-top {position: relative; background-color: #52698A; width: 100%; user-select: none; height: 20px;}\
.speedrun-title > * {display: inline-block; width: 25%;}\
.speedrun-menu {position: absolute; right: 0px; top: 0px;}\
.speedrun-item {background-color: #fff; cursor: pointer; display: inline-block; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 5px;}\
.speedrun-item:hover {filter: opacity(60%);}\
.speedrun-item:active {filter: opacity(30%);}\
.speedrun-minimum {bottom: 0px; left: 0px; width: 30%; height: 20px; z-index: 99999;}\
.speedrun-minimum iframe {height: 0px;}\
.speedrun-maximum {top: 0px; left: 0px; width: ' + (outerWidth - 54) + 'px; height: ' + (outerHeight - 20) + 'px; z-index: 99999;}\
#speedrun-restore, .speedrun-minimum #speedrun-minimum, .speedrun-maximum #speedrun-maximum {display: none;}\
.speedrun-minimum #speedrun-restore, .speedrun-maximum #speedrun-restore {display: inline-block;}';
document.body.append(css);

document.getElementById('leaderboarddiv').addEventListener('contextmenu', event => {
    event.preventDefault();
    var row = [...document.querySelectorAll('tr')].find(record => record.contains(event.target));
    if (row) {
        var src = row.getAttribute('data-target');
        if (src) {
            var id = src.slice(src.lastIndexOf('/') + 1);
            var cells = row.querySelectorAll('td');
            var record = row.classList.contains('center-sm') ? {rank: 1, time: 2} : row.classList.contains('height-minimal') ? {rank: 1, player: 2, time: 3} : {rank: 0, player: 1, time: 2};
            var player = record.player ? cells[record.player].innerText : document.querySelector('.profile-username').innerText;
            var title = '<div class="speedrun-title"><span>Rank : ' + cells[record.rank].innerHTML + '</span> <span>Player : ' + player + '</span> <span>Time : ' + cells[record.time].innerHTML + '</span>';
            viewSpeedrunRecord({id, src, title});
        }
    }
});

function viewSpeedrunRecord({id, src, title}) {
    var view = document.querySelector('#speedrun-' + id);
    if (view) {
        view.style.top = view.top;
        view.style.left = view.left;
    }
    else if (logger[id]) {
        createRecordWindow(id, logger[id], title);
    }
    else {
        fetch(src).then(response => response.text()).then(htmlText => {
            var xml = document.createElement('div');
            xml.innerHTML = htmlText;
            logger[id] = xml.querySelector('#centerwidget iframe') ?? xml.querySelector('#centerwidget p > a');
            createRecordWindow(id, logger[id], title);
            xml.remove();
        });
    }
}

function createRecordWindow(id, content, title) {
    if (content.tagName === 'A') {
        return open(content.href, '_blank');
    }

    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.draggable = 'true';
    container.className = 'speedrun-window';
    container.innerHTML = '<div class="speedrun-top">' + title + '</div>\
<div class="speedrun-menu"><span id="speedrun-minimum" class="speedrun-item">📌</span>\
<span id="speedrun-maximum" class="speedrun-item">🔲</span>\
<span id="speedrun-restore" class="speedrun-item">⚓</span>\
<span id="speedrun-close" class="speedrun-item">❌</span></div>';
    document.body.appendChild(container);
    var restore = content.style.cssText = 'height: calc(100% - 20px); width: 100%;';
    container.appendChild(content);
    var index = [...document.querySelectorAll('[id^="speedrun-"]')].findIndex(view => view === container);
    container.top = container.style.top = 130 + index * 20 + 'px';
    container.left = container.style.left = (screen.availWidth - 1280) / 2 + index * 20 + 'px';
    container.querySelector('#speedrun-minimum').addEventListener('click', event => {
        container.classList.add('speedrun-minimum');
        container.classList.remove('speedrun-maximum');
        restore = container.style.cssText ? container.style.cssText : restore;
        container.style.cssText = '';
    });
    container.querySelector('#speedrun-maximum').addEventListener('click', event => {
        container.classList.add('speedrun-maximum');
        container.classList.remove('speedrun-minimum');
        restore = container.style.cssText ? container.style.cssText : restore;
        container.style.cssText = '';
    });
    container.querySelector('#speedrun-restore').addEventListener('click', event => {
        container.classList.remove('speedrun-maximum', 'speedrun-minimum');
        container.style.cssText = restore;
    });
    container.querySelector('#speedrun-close').addEventListener('click', event => {
        container.remove();
    });
}

document.addEventListener('dragstart', event => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
document.addEventListener('dragend', event => {
    event.target.style.top = event.target.offsetTop + event.clientY - offset.top + 'px';
    event.target.style.left = event.target.offsetLeft + event.clientX - offset.left + 'px';
});
