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

const coreMenu = document.getElementById('mn_N7534_menu');
const workButton = coreMenu.children[0].children[0];
const signButton = coreMenu.children[1].children[0];

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

workButton.addEventListener('click', (event) => {
    event.preventDefault();
    autoWork();
});

signButton.addEventListener('click', (event) => {
    event.preventDefault();
    autoSign();
});

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function autoSign() {
    startWorking('签到', 'dsu_paulsign:sign', 80, async (document, window) => {
        const error = document.querySelector('#ct_shell > div:nth-child(1) > h1:nth-child(1)');

        if (error) {
            localStorage.setItem('signed', today);
            return { ok: false, error: error.textContent };
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
        return { ok: true };
    });
}

function autoWork() {
    startWorking('打工', 'np_cliworkdz:work', 120, async (document, window) => {
        const error = document.querySelector('#messagetext > p:first-of-type')?.childNodes?.[2];

        if (error) {
            const buffer = error.textContent.match(/(\d)小时(\d+)分钟(\d+)秒/);
            const next = buffer[1] * 3600000 + buffer[2] * 60000 + buffer[3] * 1000;

            setTimeout(autoWork, next);
            localStorage.setItem('worked', Date.now() + next);
            return { ok: false, error: error.textContent };
        }

        const ads = document.querySelectorAll('#advids > div > a');

        for (let i = 0, l = ads.length; i < l; i++) {
            const a = ads[i];
            a.href = a.target = null;
            a.click();
            await delay(300);
        }

        await delay(3000);

        document.querySelector('#stopad > a').click();
        setTimeout(autoWork, 21600000);
        localStorage.setItem('worked', Date.now() + 21600000);
        return { ok: true };
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

        const document = iframe.contentDocument;
        const window = iframe.contentWindow;

        window.setTimeout = () => {};

        const result = await callback(document, window);

        popup.textContent = result.ok ? `已完成${work}` : result.error;

        await delay(3000);
        delete pending[work];
        iframe.remove();
        popup.remove();
        iframe = popup = null;
    });
}
