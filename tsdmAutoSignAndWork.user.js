// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      3.0
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://www.tsdm39.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// ==/UserScript==

'use strict';
var signed = GM_getValue('signed', 0);
var worked = GM_getValue('worked', 0);
var autoed = GM_getValue('autoed', false);
var today = new Date().getFullYear() + new Date().getMonth() + new Date().getDate();

var css = document.createElement('style');
css.innerHTML = '.my-menu {background-color: #fff; position: fixed; top: 40px; right: 100px; width: 100px; z-index: 99999;}\
.my-menu button {width: 100px; padding: 5px;}\
iframe {position: absolute; top: 200px; left: 100px; height: 800px; width: 800px; display: none;}';

var menu = document.createElement('div');
menu.innerHTML = '<button class="my-button">签到</button>\
<button class="my-button">打工</button>\
<button class="my-button"><span class="my-auto"></span>自动</button>';
menu.className = 'my-menu';
menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';

document.body.append(menu, css);

if (autoed) {
    if (today > signed) {
        autoSign();
    }
    if (Date.now() > worked) {
        autoWork();
    }
}

menu.querySelector('.my-button:nth-child(1)').addEventListener('click', event => {
    autoSign();
});
menu.querySelector('.my-button:nth-child(2)').addEventListener('click', event => {
    autoWork();
});
menu.querySelector('.my-button:nth-child(3)').addEventListener('click', event => {
    autoed = !autoed;
    menu.querySelector('.my-auto').innerHTML = autoed ? '✅' : '';
    GM_setValue('autoed', autoed);
});

async function autoSign() {
    var warn = await notification('sign');
    var frame = await promiseIframe('/plugin.php?id=dsu_paulsign:sign');
    if (frame.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)')) {
        GM_setValue('signed', today);
        warn.innerText = frame.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)').innerHTML;
        autoEnd(frame, warn);
    }
    else {
        warn.innerText = '开始签到...';
        frame.defaultView.Icon_selected('kx');
        document.getElementById('todaysay').value = '每日签到';
        setTimeout(() => {
            frame.defaultView.showWindow('qwindow', 'qiandao', 'post', '0');
            GM_setValue('signed', today);
            warn.innerText = '已完成签到';
            autoEnd(frame, warn);
        }, 3000);
    }
}

async function autoWork() {
    var warn = await notification('work');
    var frame = await promiseIframe('/plugin.php?id=np_cliworkdz:work');
    if (frame.querySelector('#messagetext')) {
        var text = frame.querySelector('#messagetext > p:nth-child(1)').innerHTML.split(/<br>|<script/)[1];
        var clock = text.match(/\d+/g);
        var next = (clock[0] | 0) * 3600000 + (clock[1] | 0) * 60000 + (clock[2] | 0) * 1000;
        warn.innerText = text;
        if (worked === 0) GM_setValue('worked', Date.now() + next);
        autoEnd(frame, warn);
    }
    else {
        warn.innerText = '开始打工...';
        frame.querySelectorAll('#advids > div > a').forEach((element, index) => {
            element.removeAttribute('href');
            element.removeAttribute('target');
            setTimeout(() => element.click(), index * 300);
        });
        setTimeout(() => {
            frame.querySelector('#stopad > a').click();
            GM_setValue('worked', Date.now() + 21600000);
            warn.innerText = '已完成打工';
            autoEnd(frame, warn);
        }, 3000);
    }
}

function promiseIframe(url) {
    return new Promise(resolve => {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.id = url.slice(url.lastIndexOf(':') + 1);
        iframe.addEventListener('load', event => resolve(iframe.contentDocument));
        document.body.appendChild(iframe);
    });
}

function notification(type) {
    return new Promise(resolve => {
        var {top, text} = type === 'sign' ? {top: '125px', text: '查询签到状态...'} : {top: '165px', text: '查询打工状态...'};
        var warn = document.createElement('div');
        warn.style.cssText = 'border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; left: ' + (innerWidth - 380) / 2 + 'px; font-size: 16px; top: ' + top;
        warn.innerHTML = text;
        document.body.appendChild(warn);
        resolve(warn)
    });
}

function autoEnd(frame, warn) {
    setTimeout(() => {
        frame.defaultView.frameElement.remove();
        warn.remove();
    }, 5000);
}
