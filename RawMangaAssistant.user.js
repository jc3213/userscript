// ==UserScript==
// @name            Raw Manga Assistant
// @name:zh         漫画生肉网站助手
// @namespace       https://github.com/jc3213/userscript
// @version         2.0
// @description     Assistant for raw manga online website
// @description:zh  漫画生肉网站助手脚本
// @author          jc3213
// @match           https://jestful.net/*
// @match           https://weloma.art/*
// @match           https://rawdevart.art/*
// @match           https://manga1000.top/*
// @connect         *
// @grant           GM_xmlhttpRequest
// @run-at          document-idle
// ==/UserScript==

'use strict';
let { host, pathname } = location;
let sites = {
    'jestful.net': {
        viewer: /-chapter-/,
        manga: { selector: 'img.chapter-img', attr: 'data-aload', except: ['olimposcan2', 'knet_64ba650e3ad61.png', 'cr_649a4491439a0.jpg'] },
        title: () => {
            let [, title, chap] = document.title.match(/^(.+)(?:\s-\sRaw)?\sChapter\s(\d+\.?\d?)/);
            return { name: title.replace(' - Raw', ''), chap };
        },
        shortcut: { prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next' },
        patch: () => {
            localStorage.setItem('shown_at', 3000000000000);
            document.querySelector('#list-imga').oncontextmenu = '';
        },
        ads: ', #list-imga > center'
    },
    'weloma.art': {
        viewer: /^\/\d+\/\d+/,
        manga: { selector: 'img.chapter-img', attr: 'data-src', except: ['/uploads/'] },
        title: { selector: 'img.chapter-img', attr: 'alt', regexp: /^(.+)(?:\s-\sRAW)\sChapter\s(\d+(?:\.\d)?)/ },
        shortcut: { prev: 'a.btn.btn-info.prev', next: 'a.btn.btn-info.next' }
    },
    'rawdevart.art': {
        viewer: /\/chapter-/,
        manga: { selector: 'canvas[data-srcset]', attr: 'data-srcset', except: ['450x375.png', '800x700.jpeg'] },
        title: { selector: 'meta[property="og:title"]', attr: 'content', regexp: /^(.+)\s(?:RAW)?\s?\sChapter\s(\d+(?:\.\d)?)/ },
        shortcut: { prev: '#sub-app .chapter-btn.prev > a', next: '#sub-app .chapter-btn.next > a' },
    },
    'manga1000.top': {
        viewer: /-chapter-/,
        manga: { selector: '#listImgs > img', attr: 'data-src' },
        title: { selector: 'meta[name="description"]', attr: 'content', regexp: /^Read\sraw\smanga\sjp\s(.+)\s-\s(?:RAW)?\schap\s(\d+(?:\.\d)?)/ },
        shortcut: { prev: 'a.rd_top-left', next: 'a.rd_top-right' },
    },
};
let watch = sites[host];

if (!watch.viewer.test(pathname)) {
    return;
}

let folder;
let urls = [];
let headers = { 'cookie': document.cookie, 'referer': location.href, 'user-agent': navigator.userAgent };
watch?.patch();

let locale = {
    'en-US': {
        save: {
            label: 'Download Chapter',
            done: '%n% images downloaded successfully'
        },
        copy: {
            label: 'Copy to Clipboard',
            done: '%n% URLs copied to clipboard'
        },
        aria2: {
            label: 'Download with Aria2',
            done: '%n% images are sent to Download with Aria2',
            error: 'Please config Download with Aria2 correctly'
        },
        gotop: {
            label: 'Back to Top',
        },
        extract: {
            start: 'Extracting manga images...',
            done: 'Extracted %n% image URLs',
            error: 'Unsupported image format'
        }
    },
    'zh-CN': {
        save: {
            label: '下载本章',
            done: '已成功下载 %n% 张图片'
        },
        copy: {
            label: '复制到剪切板',
            done: '已复制 %n% 个图片链接到剪贴板'
        },
        aria2: {
            label: '通过 Aria2 下载',
            done: '%n% 个图片已传入通过 Aria2 下载',
            error: '请检查通过 Aria2 下载是否正确配置'
        },
        gotop: {
            label: '回到顶部',
        },
        extract: {
            start: '正在提取漫画图片...',
            done: '已成功提取 %n% 张图片链接',
            error: '不支持的图片格式'
        }
    }
};
let i18n = locale[navigator.language] ?? locale['en-US'];

let overlay = document.createElement('div');
overlay.className = 'assist-overlay';

let css = document.createElement('style');
css.textContent = `
.assist-overlay { position: fixed; top: 0px; left: 0px; z-index: 999999999; width: 100%; inset: 0; display: flex; flex-direction: column; pointer-events: none; align-items: center; }
.assist-notify { pointer-events: auto; width: fit-content; margin-top: 10px; }
.assist-mainmenu, .assist-menuitem, .assist-notify { color: #000; background-color: #fff; border: 1px solid darkviolet; }
.assist-mainmenu { position: fixed; z-index: 999999999; }
.assist-menuitem:hover { filter: brightness(1.0) contrast(0.7); }
.assist-menuitem:active { filter: brightness(0.9) contrast(0.6); }
.assist-menuitem, .assist-notify { padding: 5px; text-align: center; font-size: 16px; user-select: none; }
.assist-menuitem { width: 180px; }
.assist-hidden ${watch.ads} { display: none !important }
`;

let ctxmenu = document.createElement('div');
ctxmenu.className = 'assist-mainmenu assist-hidden';
ctxmenu.innerHTML = `
<div id="assist-download" class="assist-menuitem">${i18n.save.label}</div>
<div id="assist-clipboard" class="assist-menuitem">${i18n.copy.label}</div>
<div id="assist-message" class="assist-menuitem">${i18n.aria2.label}</div>
<div id="assist-scrolltop" class="assist-menuitem">${i18n.gotop.label}</div>
`;

let aria2btn = ctxmenu.children[2];

ctxmenu.addEventListener('click', (event) => {
    let { id } = event.target;
    ctxMenuEvent[id]?.();
});

document.body.append(ctxmenu, css, overlay);

const ctxMenuEvent = {
    'assist-download': downloadAllUrls,
    'assist-clipboard': copyAllUrls,
    'assist-message': downloadWithAria2,
    'assist-scrolltop'() {
        document.documentElement.scrollTop = 0;
    }
};

async function downloadAllUrls() {
    let index = 0;
    let download = [];
    for (let url of urls) {
        let props = { url, headers, method: 'GET', responseType: 'blob' };
        let time = index++ * 200;
        let name = String(index).padStart(3, '0');
        download.push(new Promise((resolve, reject) => {
            props.onload = (details) => {
                setTimeout(() => {
                    let blob = details.response;
                    let a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = name + '.' + blob.type.slice(blob.type.indexOf('/') + 1);
                    a.click();
                    URL.revokeObjectURL(a.href);
                    a = null;
                    resolve(true);
                }, time);
            };
            props.onerror = reject;
            GM_xmlhttpRequest(props);
        }));
    }
    await Promise.all(download);
    notification('save', 'done');
}

function copyAllUrls() {
    navigator.clipboard.writeText(urls.join('\n'));
    notification('copy', 'done');
}

function downloadWithAria2() {
    bridge('aria2c_status').then(async ({ options }) => {
        let params = [];
        options.dir += folder;
        for (let url of urls) {
            params.push({ url, options });
        }
        let { result, error } = await bridge('aria2c_download', params);
        if (result) {
            notification('aria2', 'done');
        } else {
            notification('aria2', 'error');
        }
    }).catch(notification);
}

document.addEventListener('contextmenu', (event) => {
    let { shiftKey, ctrlKey, altKey, clientY, clientX } = event;
    if (shiftKey || ctrlKey || altKey) {
        return;
    }
    event.preventDefault();
    ctxmenu.classList.remove('assist-hidden');
    let { innerWidth, innerHeight } = document.defaultView;
    let { offsetWidth, offsetHeight } = ctxmenu;
    let top = clientY + offsetHeight > innerHeight ? innerHeight - offsetHeight : clientY;
    let left = clientX + offsetWidth > innerWidth ? innerWidth - offsetWidth : clientX;
    ctxmenu.style.cssText = `top: ${top}px; left: ${left}px;`;
});

document.addEventListener('click', (event) => {
    ctxmenu.classList.add('assist-hidden');
});

document.addEventListener('keydown', (event) => {
    if (!watch.shortcut) return;
    let { code } = event;
    let hotkey = code === 'ArrowLeft'
        ? document.querySelector(watch.shortcut.prev)
        : code === 'ArrowRight' ? document.querySelector(watch.shortcut.next)
        : null;
    if (hotkey) {
        hotkey.href ? open(hotkey.href , '_self') : hotkey.click();
    }
});

let started = notification('extract', 'start');
setTimeout(() => {
    let { selector, except } = watch.manga;
    let images = document.querySelectorAll(selector);
    if (images.length === 0) {
        notification('extract', 'error');
        return;
    }
    for (let i of document.querySelectorAll(selector)) {
        let src = i.getAttribute(watch.manga.attr) ?? i.getAttribute('src');
        let url = src.trim();
        if (url.startsWith('//')) {
            url.replace('//', 'http://');
        }
        if (except) {
            let matched = false;
            for (let s of except) {
                if (url.includes(s)) {
                    i.remove();
                    matched = true;
                    break;
                }
            }
            if (matched) continue;
        }
        urls.push(url);
    }
    let name;
    let chap;
    let symbol = navigator.platform === 'Win32' ? '\\' : '/';
    if (typeof watch.title === 'function') {
        let title = watch.title();
        name = title.name;
        chap = title.chap;
    } else {
        let title = document.querySelector(watch.title.selector).getAttribute(watch.title.attr);
        let temp = title.match(watch.title.regexp);
        console.log(title, watch.title.regexp);
        console.log(temp);
        name = temp[1];
        chap = temp[2]
    }
    let title = symbol + name + symbol + chap.padStart(2, '0');
    folder = title.replace(/[:\?\"\']/g, '_');
    console.log(folder);
    started.remove();
    notification('extract', 'done');
}, 2000);

function notification(action, status, url) {
    let text = i18n[action][status] ?? i18n[action];
    if (text.includes('%n%')) {
        text = text.replace('%n%', urls.length);
    }
    let notify = document.createElement('div');
    notify.className = 'assist-notify';
    notify.textContent = `🔔 ${text}`;
    notify.addEventListener('click', (e) => notify.remove());
    setTimeout(() => notify.remove(), 5000);
    overlay.appendChild(notify);
    return notify;
}

let message = {};

function bridge(aria2c, params) {
    return new Promise((resolve, reject) => {
        let id = crypto.randomUUID();
        let timer = setTimeout(() => {
            delete message[id];
            reject( new Error('"Download With Aria2" is either not installed, disabled, or lower than v4.17.0.3548.') );
        }, 3000);
        message[id] = (result) => {
            clearTimeout(timer);
            delete message[id];
            resolve(result);
        }
        window.postMessage({ aria2c, id, params });
    });
}

window.addEventListener('message', (event) => {
    let { aria2c, id, result } = event.data;
    if (aria2c === 'aria2c_response') {
        message[id]?.(result);
    }
});
