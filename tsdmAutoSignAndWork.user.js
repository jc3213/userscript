// ==UserScript==
// @name         天使动漫自动签到打工
// @namespace    https://github.com/jc3213/userscript
// @version      1.6.0
// @description  天使动漫全自动打工签到脚本 — 完全自动无需任何操作，只需静待一分钟左右
// @author       jc3213
// @match        *://www.tsdm39.com/*
// @noframes
// ==/UserScript==

const signed = Number(localStorage.getItem('signed'));
const worked = Number(localStorage.getItem('worked'));

const time = new Date();
const today = String(time.getFullYear()) + String(time.getMonth() + 1).padStart(2, '0') + String(time.getDate()).padStart(2, '0');

const pending = {};

const signButton = document.getElementById('um').children[1].children[13];
signButton.onclick = autoSign;

if (signButton) {
    if (today > signed) {
        autoSign();
    }

    const now = Date.now() / 1000;
    if (now > worked) {
        autoWork();
    } else {
        setTimeout(autoWork, worked - now);
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function autoSign() {
    startWorking('签到', 'dsu_paulsign:sign', 80, async (document, window) => {
        const error = document.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)');
        if (error) {
            localStorage.setItem('signed', today);
            return error.textContent;
        }

        const signForm = document.getElementById('qiandao');
        const emoji = document.getElementById('kx');
        const comment = document.getElementById('todaysay')

        emoji.onclick = emoji.dataset.link = null;
        emoji.click();
        comment.value = '每日签到';
        await delay(3000);
        signForm.submit();
        localStorage.setItem('signed', today);

        return false;
    });
}

function autoWork() {
    startWorking('打工', 'np_cliworkdz:work', 120, async (document, window) => {
        let error = document.querySelector('#messagetext > p:first-of-type')?.childNodes?.[2];

        if (error) {
            let [full, hh, mm, ss] = error.textContent.match(/(\d)小时(\d+)分钟(\d+)秒/);
            let next = hh * 3600000 + mm * 60000 + ss * 1000;
            setTimeout(autoWork, next);
            localStorage.setItem('worked', Date.now() + next);
            return error.textContent;
        }

        let index = 0;

        for (let a of document.querySelectorAll('#advids > div > a')) {
            a.removeAttribute('href');
            a.removeAttribute('target');
            a.click();
            await delay(300);
        }

        await delay(3000);

        document.querySelector('#stopad > a').click();
        setTimeout(autoWork, 21600000);
        localStorage.setItem('worked', Date.now() + 21600000);

        return false;
    });
}

function startWorking(work, plugin, top, callback) {
    if (pending[work]) return;

    pending[work] = true;

    let popup = document.createElement('div');
    let iframe = document.createElement('iframe');
    document.body.append(iframe, popup);
    popup.textContent = `查询${work}状态...`;
    popup.style.cssText = `border-radius: 5px; background-color: #FFF; padding: 5px; position: fixed; width: 380px; text-align: center; font-size: 16px; left: ${window.innerWidth / 2 - 190}px; top: ${top}px`;
    iframe.src = `/plugin.php?id=${plugin}`;
    iframe.style.display = 'none';
    iframe.addEventListener('load', async (evnet) => {
        popup.textContent = `开始${work}...`;
        let { contentDocument, contentWindow } = iframe;
        contentWindow.setTimeout = () => {};
        let result = await callback(contentDocument, contentWindow);
        popup.textContent = result || `已完成${work}`;
        setTimeout(() => {
            delete pending[work];
            iframe.remove();
            popup.remove();
            iframe = popup = null;
        }, 3000);
    });
}
