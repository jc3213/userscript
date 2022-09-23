// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      1.1.0
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://www.tsdm39.net/*
// @require      https://raw.githubusercontent.com/jc3213/jslib/main/ui/menu.js#sha256-rqc3iH2Kcl/OD7aLRrpgVeCmsY4QP1XVqb702NoPAFU=
// @noframes
// ==/UserScript==

'use strict';
var {signed = '0', worked = '0', autorun = '0'} = localStorage;
var working = {};
var today = new Date();
var date = today.getFullYear() + today.getMonth() + today.getDate();
var now = today.getTime();
var jsMenu = new FlexMenu();

var smenu = jsMenu.menu([
    {label: '签到', onclick: autoSign},
    {label: '打工', onclick: autoWork},
    {label: '自动', onclick: switchAuto}
]);
var autoBtn = smenu.childNodes[2];
autoBtn.innerText = autorun === '1' ? '✅自动' : '自动';

var css = document.createElement('style');
css.innerHTML = '.jsui-basic-menu {width: 160px;}\
.jsui-menu-item {font-weight: bold; border-radius: 5px; background-color: #000; padding: 2px 10px; margin: 4px 0px;}\
.jsui-menu-item:last-child {flex: 1.5;}\
iframe {position: absolute; top: 200px; left: 100px; height: 400px; width: 400px; display: none;}';

var headbar = document.querySelector('#toptb > .wp');
headbar.append(smenu, css);

if (autorun === '1') {
    if (date > signed) {
        autoSign();
    }
    if (now > worked) {
        autoWork();
    }
    else {
        setTimeout(autoWork, worked - now);
    }
}

function switchAuto() {
    localStorage.autorun = autorun = autorun === '1' ? '0' : '1';
    autoBtn.innerText = autorun === '1' ? '✅自动' : '自动';
}

async function autoSign() {
    if (working.sign) {
        return;
    }
    working.sign = now;
    var popup = startPopup('查询签到状态...', '80px');
    var idoc = await startWork('/plugin.php?id=dsu_paulsign:sign');
    var iwin = idoc.defaultView;
    if (idoc.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)')) {
        popup.innerText = idoc.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)').innerText;
        localStorage.signed = signed = date;
        endWork(iwin, popup, 'sign');
    }
    else {
        popup.innerText = '开始签到...';
        iwin.Icon_selected('kx');
        idoc.getElementById('todaysay').value = '每日签到';
        setTimeout(() => {
            iwin.showWindow('qwindow', 'qiandao', 'post', '0');
            popup.innerText = '已完成签到';
            localStorage.signed = signed = date;
            endWork(iwin, popup, 'sign');
        }, 3000);
    }
}

async function autoWork() {
    if (working.work) {
        return;
    }
    working.work = now;
    var popup = startPopup('查询打工状态...', '120px');
    var idoc = await startWork('/plugin.php?id=np_cliworkdz:work');
    var iwin = idoc.defaultView;
    if (idoc.querySelector('#messagetext')) {
        var text = idoc.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var clock = text.match(/\d+/g);
        var next = (clock[0] | 0) * 3600000 + (clock[1] | 0) * 60000 + (clock[2] | 0) * 1000;
        popup.innerText = text;
        localStorage.worked = worked = Date.now() + next;
        endWork(iwin, popup, 'sign');
    }
    else {
        popup.innerText = '开始打工...';
        idoc.querySelectorAll('#advids > div > a').forEach((element, index) => {
            element.removeAttribute('href');
            element.removeAttribute('target');
            setTimeout(() => element.click(), index * 300);
        });
        setTimeout(() => {
            idoc.querySelector('#stopad > a').click();
            setTimeout(autoWork, 21600000);
            popup.innerText = '已完成打工';
            localStorage.worked = worked = Date.now() + 21600000;
            endWork(iwin, popup, 'sign');
        }, 3000);
    }
}

function startPopup(string, top) {
    var popup = document.createElement('div');
    popup.innerText = string;
    popup.style.cssText = 'border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; left: ' + (document.documentElement.clientWidth - 380) / 2 + 'px; font-size: 16px; top: ' + top;
    document.body.append(popup);
    return popup;
}

function startWork(url) {
    return new Promise(resolve => {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.addEventListener('load', event => resolve(iframe.contentDocument));
        document.body.append(iframe);
        iframe.contentWindow.setTimeout = () => void 0;
    });
}

function endWork(iwin, popup, key) {
    setTimeout(() => {
        iwin.frameElement.remove();
        delete working[key];
        popup.remove();
    }, 5000);
}
