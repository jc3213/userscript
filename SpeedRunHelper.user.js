// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      2.10
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        *://www.speedrun.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "*://*.speedrun.com/a.js*", "action": "cancel"}
// @webRequest   {"selector": "*.hotjar.com/*", "action": "cancel"}
// @webRequest   {"selector": "*.scorecardresearch.com/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var logger = {};
var offset = {};

var minimum = document.createElement('div');
minimum.className = 'speedrun-minimum';
document.body.appendChild(minimum);

var maximum = document.createElement('div');
maximum.className = 'speedrun-maximum';
document.body.appendChild(maximum);

var css = document.createElement('style');
css.innerHTML = '.speedrun-window {position: fixed; width: 1280px; height: 740px; z-index: 999;}\
.speedrun-window iframe{height: calc(100% - 20px); width: 100%;}\
.speedrun-minimum {position: fixed; bottom: 0px; left: 0px; height: 20px; width: 100%; z-index: 99999;}\
.speedrun-minimum > * {position: static; width: 200px; margin-right: 5px; display: inline-block;}\
.speedrun-maximum {position: fixed; top: 0px; left: 0px; width: 100%; height: 100vh; z-index: 99999; display: none;}\
.speedrun-maximum > * {position: static; width: 100%; height: 100%;}\
.speedrun-menu {background-color: #52698A; width: 100%; text-align: right; user-select: none; height: 20px;}\
.speedrun-item {background-color: #fff; cursor: pointer; display: inline-block; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 5px;}\
.speedrun-item:hover {filter: opacity(60%);}\
.speedrun-item:active {filter: opacity(30%);}';
document.head.appendChild(css);

document.getElementById('leaderboarddiv').addEventListener('contextmenu', (event) => {
    event.preventDefault();
    var cell = [...document.querySelectorAll('tr')].find(record => record.contains(event.target));
    var src = cell.getAttribute('data-target');
    var id = src.slice(src.lastIndexOf('/') + 1);
    var name = cell.querySelector('td:nth-child(3)').innerText;
    viewSpeedrunRecord({id, src, name});
});

function viewSpeedrunRecord({id, src, name}) {
    var view = document.querySelector('#speedrun-' + id);
    if (view) {
        view.style.top = view.top;
        view.style.left = view.left;
    }
    else if (logger[id]) {
        createRecordWindow(id, logger[id], name);
    }
    else {
        GM_xmlhttpRequest({
            url: src,
            method: 'GET',
            onload: (response) => {
                var xml = document.createElement('div');
                xml.innerHTML = response.responseText;
                logger[id] = xml.querySelector('#centerbar iframe') ?? xml.querySelector('#centerbar center > a');
                createRecordWindow(id, logger[id], name);
                xml.remove();
            }
        });
    }
}

function createRecordWindow(id, content, name) {
    if (content.tagName === 'A') {
        return open(content.href, '_blank');
    }

    var container = document.createElement('div');
    container.id = 'speedrun-' + id;
    container.draggable = 'true';
    container.className = 'speedrun-window';
    container.innerHTML = '<div class="speedrun-menu">' + name + '<span id="speedrun-minimum" class="speedrun-item">📌</span>\
<span id="speedrun-maximum" class="speedrun-item">📽️</span>\
<span id="speedrun-restore" class="speedrun-item" style="display: none;">🔳</span>\
<span id="speedrun-close" class="speedrun-item">❌</span></div>';
    document.body.appendChild(container);
    content.style.cssText = 'height: calc(100% - 20px); width: 100%;';
    container.appendChild(content);
    var index = [...document.querySelectorAll('[id^="speedrun-"]')].findIndex(view => view === container);
    container.top = container.style.top = (screen.availHeight - 740) / 2 + index * 20 + 'px';
    container.left = container.style.left = (screen.availWidth - 1280) / 2 + index * 20 + 'px';
    container.addEventListener('click', (event) => {
        if (event.target.id === 'speedrun-minimum') {
            event.target.style.display = content.style.display = maximum.style.display = 'none';
            container.querySelector('#speedrun-restore').style.display = 'inline-block';
            minimum.appendChild(container);
        }
        if (event.target.id === 'speedrun-maximum') {
            event.target.style.display = 'none';
            container.querySelector('#speedrun-restore').style.display = 'inline-block';
            maximum.style.display = 'block';
            maximum.appendChild(container);
        }
        if (event.target.id === 'speedrun-restore') {
            container.querySelector('#speedrun-minimum').style.display = container.querySelector('#speedrun-maximum').style.display = 'inline-block';
            event.target.style.display = maximum.style.display = 'none';
            content.style.display = 'block';
            document.body.appendChild(container);
        }
        if (event.target.id === 'speedrun-close') {
            container.remove();
        }
    });
}

document.addEventListener('dragstart', (event) => {
    offset.top = event.clientY;
    offset.left = event.clientX
});
document.addEventListener('dragend', (event) => {
    event.target.style.top = event.target.offsetTop + event.clientY - offset.top + 'px';
    event.target.style.left = event.target.offsetLeft + event.clientX - offset.left + 'px';
});
