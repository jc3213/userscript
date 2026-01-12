// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      1.5.0
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://www.tsdm39.com/*
// @noframes
// ==/UserScript==

let { signed = '0', worked = '0' } = localStorage;
let action = {};
let today = new Date();
let date = today.getFullYear() + today.getMonth() + today.getDate();
let now = today.getTime();
let [e_work, e_sign] = document.querySelectorAll('#mn_Nfded_menu > li > a');

if (location.pathname === '/forum.php' && document.getElementById('tsdm_newpm')) {
    if (date > signed) {
        autoSign();
    }
    if (now > worked) {
        autoWork();
    } else {
        setTimeout(autoWork, worked - now);
    }
}

e_work.addEventListener('click', event => {
    event.preventDefault();
    autoWork();
});

e_sign.addEventListener('click', event => {
    event.preventDefault();
    autoSign();
});

async function autoSign() {
    startWorking('sign', 'dsu_paulsign:sign', '签到', 80, (document, window) =>{
        let error = document.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)');
        if (error) {
            return error.textContent;
        }
        window.Icon_selected('kx');
        document.getElementById('todaysay').value = '每日签到';
        setTimeout(() => {
            window.showWindow('qwindow', 'qiandao', 'post', '0');
        }, 3000);
    });
}

async function autoWork() {
    startWorking('work', 'np_cliworkdz:work', '打工', 120, (document, window) => {
        let error = document.querySelector('#messagetext > p:first-of-type')?.childNodes?.[2];
        if (error) {
            let [full, hh, mm, ss] = error.textContent.match(/(\d)小时(\d+)分钟(\d+)秒/);
            let next = hh * 3600000 + mm * 60000 + ss * 1000;
            setTimeout(autoWork, next);
            return error.textContent;
        }
        let index = 0;
        for (let a of document.querySelectorAll('#advids > div > a')) {
            setTimeout(() => {
                a.removeAttribute('href');
                a.removeAttribute('target');
                a.click();
            }, index++ * 300);
        }
        setTimeout(() => {
            document.querySelector('#stopad > a').click();
            setTimeout(autoWork, 21600000);
        }, 3000);
    });
}

function startWorking(type, id, work, top, callback) {
    if (action[type]) return;
    action[type] = true;
    let popup = document.createElement('div');
    let iframe = document.createElement('iframe');
    document.body.append(iframe, popup);
    popup.textContent = `查询${work}状态...`;
    popup.style.cssText = `border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; font-size: 16px; left: ${window.innerWidth / 2 - 190}px; top: ${top}px`;
    iframe.src = `/plugin.php?id=${id}`;
    iframe.style.display = 'none';
    iframe.addEventListener('load', (evnet) => {
        popup.textContent = `开始${work}...`;
        let { contentDocument, contentWindow } = iframe;
        contentWindow.setTimeout = () => null;
        popup.textContent = callback(contentDocument, contentWindow) ?? `已完成${work}`;
        setTimeout(() => {
            delete action[type];
            iframe.remove();
            popup.remove();
            iframe = null;
            popup = null;
        }, 3000);
    });
}
