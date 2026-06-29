// ==UserScript==
// @name            Bilibili Emojis Extractor
// @name:zh         哔哩哔哩表情提取
// @namespace       https://github.com/jc3213/userscript
// @version         0.6
// @description     Extract official Emojis in users' comments
// @description:zh  提取评论区的官方表情的图片
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/v/*
// @match           https://www.bilibili.com/bangumi/*
// @grant           GM_download
// ==/UserScript==

let calls = {};
let index = 0;

function sendMessage(aria2c, params) {
    return new Promise((resolve, reject) => {
        let id = 'bili-emoji-extract-' + index++;

        let timer = setTimeout(() => {
            delete calls[id];
            reject( new Error('"Download With Aria2" is either not installed, disabled, or lower than v4.17.0.3548.') );
        }, 1000);

        calls[id] = (result) => {
            clearTimeout(timer);
            delete calls[id];
            resolve(result);
        };

        window.postMessage({ aria2c, id, params });
    });
}

function aria2Status() {
    return sendMessage('aria2c_status');
}

function aria2Download(params) {
    return sendMessage('aria2c_download', params);
}

window.addEventListener('message', (event) => {
    let message = event.data;

    if (message.aria2c !== 'aria2c_response') return;

    let func = calls[message.id];

    if (!func) return;

    func(message.result);
});

let keyword;

let result;

function extractImages(root) {
    let topRoot = root.shadowRoot;

    if (!topRoot) return;

    let topTree = topRoot.querySelector('bili-rich-text');

    if (!topTree) return;

    let subRoot = topTree.shadowRoot;

    if (!subRoot) return;

    let images = subRoot.querySelectorAll('img');
    let total = images.length;

    if (total === 0) return;

    for (let i = 0; i < total; i++) {
        let image = images[i];
        let alt = image.alt.toLowerCase();

        if (!alt.includes(keyword)) return;

        let src = image.src;
        let url = src.split('@')[0];
        let out = `${alt.slice(1, -1)}.${url.split('.').pop()}`;

        result.set(url, out);
    }
}


document.addEventListener('keydown', (event) => {
    if (!(event.altKey && event.shiftKey && event.code === 'KeyE')) return;

    keyword = prompt('输入表情包关键词：').toLowerCase();

    result = new Map();

    let comments = document.getElementById('commentapp').children[0].shadowRoot.children[1].children[1].children;

    for (let i = 0, l = comments.length; i < l; i++) {
        let components = comments[i].shadowRoot.children;
        let comment = components[0];
        let replies = components[1].children[0].shadowRoot.children[0].children[0].children;

        extractImages(comment);

        for (let j = 0, m = replies.length; j < m; j++) {
            extractImages(replies[j]);
        }
    }

    let size = result.size;

    if (size === 0) {
        alert('未找到所输入关键词对应的表情！');
        return;
    } else {
        alert(`找到${size}个表情……`);
    }

    aria2Status().then(() => {
        let session = [];

        for (let entries of result) {
            session.push({ url: entries[0], options: { out: entries[1] } });
        }

        aria2Download(session);
    }).catch(() => {
        let index = 0;

        for (let entries of result) {
            setTimeout(() => GM_download(entries[0], entries[1]), index++ * 200);
        }
    });
});
