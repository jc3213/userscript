// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      1.3.0
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://*.tsdm39.com/*
// @noframes
// ==/UserScript==

'use strict';
var {signed = '0', worked = '0'} = localStorage;
var action = {};
var today = new Date();
var date = today.getFullYear() + today.getMonth() + today.getDate();
var now = today.getTime();

var css = document.createElement('style');
css.innerHTML = `iframe {position: absolute; top: 200px; left: 100px; height: 400px; width: 400px; display: none;}`;
document.head.appendChild(css);

if (date > signed) {
    autoSign();
}
if (now > worked) {
    autoWork();
}
else {
    setTimeout(autoWork, worked - now);
}

document.querySelector('#mn_Nfded_menu > :nth-child(1) > a').addEventListener('click', event => {
    event.preventDefault();
    autoWork();
});
document.querySelector('#mn_Nfded_menu > :nth-child(2) > a').addEventListener('click', event => {
    event.preventDefault();
    autoSign();
});

async function autoSign() {
    if (action.signed) {
        return;
    }
    action.signed = true;
    var popup = startPopup('查询签到状态...', '80px');
    var idoc = await startWork('/plugin.php?id=dsu_paulsign:sign');
    var iwin = idoc.defaultView;
    var error = idoc.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)');
    if (error) {
        var text = error.innerText;
    }
    else {
        popup.innerText = '开始签到...';
        iwin.Icon_selected('kx');
        idoc.getElementById('todaysay').value = '每日签到';
        await waitTimeout(3000);
        iwin.showWindow('qwindow', 'qiandao', 'post', '0');
        text = '已完成签到';
    }
    endWork('signed', date, text, popup, iwin);
}

async function autoWork() {
    if (action.worked) {
        return;
    }
    action.worked = true;
    var popup = startPopup('查询打工状态...', '120px');
    var idoc = await startWork('/plugin.php?id=np_cliworkdz:work');
    var iwin = idoc.defaultView;
    if (idoc.querySelector('#messagetext')) {
        var text = idoc.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var [full, hh, mm, ss] = text.match(/(\d)小时(\d+)分钟(\d+)秒/);
        var next = hh * 3600000 + mm * 60000 + ss * 1000;
    }
    else {
        popup.innerText = '开始打工...';
        idoc.querySelectorAll('#advids > div > a').forEach(async (element, index) => {
            element.removeAttribute('href');
            element.removeAttribute('target');
            await waitTimeout(index * 300);
            element.click();
        });
        await waitTimeout(3000);
        idoc.querySelector('#stopad > a').click();
        setTimeout(autoWork, 21600000);
        text = '已完成打工';
        next = 21600000;

    }
    endWork('worked', Date.now() + next, text, popup, iwin);
}

async function endWork(work, value, text, popup, frame) {
    action[work] = false;
    localStorage[work] = self[work] = value;
    popup.innerText = text;
    await waitTimeout(5000);
    frame.frameElement.remove();
    popup.remove();
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

function waitTimeout(number) {
    return new Promise(resolve => {
        setTimeout(resolve, number);
    });
}
