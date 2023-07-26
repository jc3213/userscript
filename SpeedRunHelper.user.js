// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.3.0
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        https://www.speedrun.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@6a62f0fd4a32b30ad4e0dcd34a5856048401e638/ui/dragdrop.js#sha256-cC3r27zz33gEpm1Esdzlxiw3pshWSINZbJ6TohfyFpo=
// ==/UserScript==

'use strict';
var logger = {};
var style = {};
var {clientWidth, clientHeight} = document.documentElement;
var {pathname} = location;
var player = document.querySelector('.x-username.x-focus-inner');

var css = document.createElement('style');
css.innerHTML = `
.speedrun-window {position: fixed; width: 1280px; height: 742px; z-index: 999999; display: grid; grid-template-areas: "title menu" "player player"; grid-template-columns: calc(100% - 66px) 66px;}
.speedrun-window iframe {width: 1280px !important; height: 720px !important; grid-area: "player";}
.speedrun-record, .speedrun-menu {background-color: #181B1C; display: flex; height: 22px;}
.speedrun-record > * {flex: 1; margin: auto; padding: 0px 5px 0px 3px;}
.speedrun-record div {display: inline-block !important;}
.speedrun-record img {height: 16px !important; width: 16px !important; position: relative !important;}
.speedrun-menu {margin-left: auto;}
.speedrun-menu > * {background-color: #fff; color: #000; cursor: pointer; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 2px;}
.speedrun-menu > :hover {filter: opacity(60%);}
.speedrun-menu > :active {filter: opacity(30%);}
#speedrun-minimum {line-height: 30px;}
.speedrun-minimum {bottom: 0px; left: 0px; width: 30% !important; height: 20px !important; z-index: 99999;}
.speedrun-minimum iframe {display: none !important;}
.speedrun-maximum {top: 0px; left: 0px; width: ${clientWidth}px !important; height: ${clientHeight}px !important; z-index: 999999;}
.speedrun-maximum iframe {width: ${clientWidth}px !important; height: ${clientHeight - 20}px !important;}
#speedrun-restore, .speedrun-minimum #speedrun-minimum, .speedrun-maximum #speedrun-maximum {display: none;}
.speedrun-minimum #speedrun-restore, .speedrun-maximum #speedrun-restore {display: block;}`;
document.body.append(css);

document.querySelector('.space-y-4 [class*="lg:w-[400px]"]').remove();
console.log(document.querySelector('.relative.flex.w-full.max-w-full.flex-col.flex-nowrap.gap-4'))
document.querySelector('.relative.flex.w-full.max-w-full.flex-col.flex-nowrap.gap-4').addEventListener('contextmenu', pathname.startsWith('/series/') ? seriesboard : pathname.startsWith('/users/') ? userboard : gameboard);

function seriesboard(event) {
    var record = event.target.closest('div.flex.flex-row.flex-wrap.items-start.justify-start.p-2');
    if (record) {
        event.preventDefault();
        var [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
        speedrunRecord(rank.parentNode.href, rank, player, time);
    }
}

function userboard(event) {
    var record = event.target.closest('div.flex.flex-row.flex-wrap.items-start.justify-start.p-2');
    if (record) {
        event.preventDefault();
        var [rank, time] = record.querySelectorAll('a > .truncate');
        speedrunRecord(rank.parentNode.href, rank, player, time);
    }
}

function gameboard(event) {
    var record = event.target.closest('tr');
    if (record) {
        event.preventDefault();
        var [rank, player, time] = record.querySelectorAll('a');
        speedrunRecord(rank.href, rank, player, time);
    }
}

function cssTextGetter(offset) {
    var top = 130 + offset;
    var left = (document.documentElement.clientWidth - 1280) / 2 + offset;
    if (left < 0) {
        left = 0;
    }
    return `top: ${top}px; left: ${left}px;`;
}

async function speedrunRecord(src, rank, player, time) {
    var id = src.slice(src.lastIndexOf('/') + 1);
    var title = `<div>Rank : ${rank.innerHTML}</div><div>Player : ${player.textContent}</div><div>Time : ${time.textContent}</div>`;
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
    container.innerHTML = `<div class="speedrun-record">${title}</div>
<div class="speedrun-menu"><div id="speedrun-minimum">➖</div><div id="speedrun-maximum">🔲</div><div id="speedrun-restore">🔳</div><div id="speedrun-remove">❌</div></div>`;
    container.style.cssText = style[id] = cssTextGetter(container.offset);
    container.appendChild(content);
    container.addEventListener('click', (event) => {
        var btn = event.target.id;
        if (btn === 'speedrun-minimum') {
            container.classList.add('speedrun-minimum');
            container.classList.remove('speedrun-maximum');
            container.style.cssText = '';
        }
        else if (btn === 'speedrun-maximum') {
            container.classList.add('speedrun-maximum');
            container.classList.remove('speedrun-minimum');
            container.style.cssText = '';
        }
        else if (btn === 'speedrun-restore') {
            container.classList.remove('speedrun-maximum', 'speedrun-minimum');
            container.style.cssText = style[id];
        }
        else if (btn === 'speedrun-remove') {
            container.remove();
        }
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
