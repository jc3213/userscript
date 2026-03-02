// ==UserScript==
// @name         Speedrun.com Helper
// @namespace    https://github.com/jc3213/userscript
// @version      1.6.0
// @description  Easy way for speedrun.com to open record window
// @author       jc3213
// @match        https://www.speedrun.com/*
// ==/UserScript==

'use strict';
let speedrun = {};
let worker = {};
let style = {};
let srDrag;
let srY;
let srX;
let srPane = -1;
let srWatch = location.pathname.split('/')?.[1];

let { innerHeight, innerWidth } = window;
let fixedX;
let fixedY;
if (innerHeight < 720) {
    fixedX = 854;
    fixedY = 480;
} else if (innerHeight < 1080) {
    fixedX = 1280;
    fixedY = 720;
} else if (innerHeight < 1440) {
    fixedX = 1920;
    fixedY = 1080;
} else if (innerHeight < 2160) {
    fixedX = 2560;
    fixedY = 1440;
} else {
    fixedX = 3840;
    fixedY = 2160;
}

let css = document.createElement('style');
css.innerHTML = `
#app-main [class$="lg:w-[400px]"] { display: none !important; }
.speedrun-window { position: absolute; z-index: 999999; display: grid; grid-template-columns: calc(100% - 66px) 66px; }
.speedrun-window iframe { width: ${fixedX}px; height: ${fixedY}px; grid-column: span 2; }
.speedrun-record, .speedrun-menu { background-color: #181B1C; display: flex; height: 22px; }
.speedrun-record > * { flex: 1; margin: auto; padding: 0px 5px 0px 3px; }
.speedrun-record * { display: inline-block !important; }
.speedrun-record img { height: 16px !important; width: 16px !important; position: relative !important; margin-right: 3px; }
.speedrun-menu {margin-left: auto;}
.speedrun-menu > * { background-color: #fff; color: #000; cursor: pointer; height: 20px; width: 20px; font-size: 14px; text-align: center; vertical-align: top; margin-left: 2px; }
.speedrun-menu > :hover { filter: opacity(60%); }
.speedrun-menu > :active { filter: opacity(30%); }
#speedrun-minimum { line-height: 30px; }
.speedrun-minimum { bottom: 0px; left: 0px; width: 30% !important; height: 20px !important; z-index: 99999; }
.speedrun-minimum iframe { display: none !important; }
.speedrun-maximum { top: 0px; left: 0px; width: ${innerWidth - 4}px !important; height: ${innerHeight - 4}px !important; z-index: 999999; }
.speedrun-maximum iframe { width: ${innerWidth - 4}px !important; height: ${innerHeight - 24}px !important; }
#speedrun-restore, .speedrun-minimum #speedrun-minimum, .speedrun-maximum #speedrun-maximum { display: none; }
.speedrun-minimum #speedrun-restore, .speedrun-maximum #speedrun-restore { display: block; }`;
document.body.append(css);

document.querySelector('main').addEventListener('contextmenu', async (event) => {
    if (event.ctrlKey || event.altKey || event.shiftKey) {
        return;
    }
    let result;
    if (srWatch === '') {
        let record = event.target.closest('div.cursor-pointer.x-focus-outline-offset.overflow-hidden');
        if (record) {
            let [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
            result = { url: rank.parentNode.href, rank, player, time };
        }
    } else if (srWatch === 'series') {
        let record = event.target.closest('div.cursor-pointer.x-focus-outline-offset.overflow-hidden');
        if (record) {
            let [rank, time, player] = record.querySelectorAll('a > .truncate, a.x-username-truncate');
            result = { url: rank.parentNode.href, rank, player, time };
        }
    } else if (srWatch === 'users') {
        let record = event.target.closest('div.cursor-pointer.x-focus-outline-offset.overflow-hidden');
        if (record) {
            let player = document.querySelector('.x-username > span');
            let [rank, time] = record.querySelectorAll('a > .truncate');
            result = { url: rank.parentNode.href, rank, player, time };
        }
    } else {
        let record = event.target.closest('tr');
        if (record) {
            let [rank, player, time] = record.querySelectorAll('a');
            result = { url: rank.href, rank, player, time };
        }
    }
    if (!result) {
        return;
    }
    event.preventDefault();
    let { url, rank, player, time } = result;
    let id = url.slice(url.lastIndexOf('/') + 1);
    if (worker[id]) {
        return;
    }
    worker[id] = true;
    let title = `<div>Rank: ${rank.innerHTML}</div><div>Player: ${player.innerHTML}</div><div>Time: ${time.textContent}</div>`;
    if (speedrun[id]) {
        worker[id] = false;
        speedrun[id].style.cssText = style[id] = fixedPanePosition(speedrun[id].offset);
        return document.body.appendChild(speedrun[id]);
    }
    let response = await fetch(url);
    let html = await response.text();
    let start = html.indexOf('<iframe');
    let end = html.indexOf('</iframe>', start) + 9;
    let iframe = html.substring(start, end);
    console.log(iframe);
    createRecordWindow(id, title, top, iframe);
});

document.addEventListener('dragstart', (event) => {
    let pane = event.target.closest('div[id^=speedrun-');
    if (pane.draggable) {
        srDrag = pane;
        srX = event.clientX - srDrag.offsetLeft;
        srY = event.clientY - srDrag.offsetTop;
    }
});

document.addEventListener('dragover', (event) => {
    event.preventDefault();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
    srDrag.style.left = event.clientX - srX + 'px';
    srDrag.style.top = event.clientY - srY + 'px';
    srDrag = null;
});

function createRecordWindow(id, title, top, player) {
    let pane = document.createElement('div');
    pane.id = 'speedrun-' + id;
    pane.offset = ++srPane * 30;
    pane.className = 'speedrun-window';
    pane.draggable = true;
    pane.innerHTML = `
<div class="speedrun-record">${title}</div>
<div class="speedrun-menu">
    <div id="speedrun-minimum">➖</div>
    <div id="speedrun-restore">🔳</div>
    <div id="speedrun-maximum">🔲</div>
    <div id="speedrun-remove">❌</div>
</div>
${player}`;
    pane.style.cssText = style[id] = fixedPanePosition(pane.offset);
    pane.addEventListener('click', (event) => {
        let { id } = event.target;
        if (id === 'speedrun-minimum') {
            pane.classList.add('speedrun-minimum');
            pane.classList.remove('speedrun-maximum');
            pane.style.cssText = '';
        } else if (id === 'speedrun-maximum') {
            pane.classList.add('speedrun-maximum');
            pane.classList.remove('speedrun-minimum');
            pane.style.cssText = '';
        } else if (id === 'speedrun-restore') {
            pane.classList.remove('speedrun-maximum', 'speedrun-minimum');
            pane.style.cssText = style[id];
        } else if (id === 'speedrun-remove') {
            pane.remove();
            --srPane;
        }
    });
    document.body.appendChild(pane);
    speedrun[id] = pane;
    worker[id] = false;
}

function fixedPanePosition(offset) {
    let top = 130 + offset;
    let left = (innerWidth - fixedX) / 2 + offset;
    if (left < 0) {
        left = 0;
    }
    return `top: ${top}px; left: ${left}px;`;
}
