// ==UserScript==
// @name            Bilibili Emojis Extractor
// @name:zh         哔哩哔哩表情提取
// @namespace       https://github.com/jc3213/userscript
// @version         0.3
// @description     Extract official Emojis in users' comments
// @description:zh  提取评论区的官方表情的图片
// @author          jc3213
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/v/*
// @match           https://www.bilibili.com/bangumi/*
// @grant           GM_download
// ==/UserScript==

let callMap = new Map();

let callback = (aria2c, params) => {
    return new Promise((resolve, reject) => {
        let id = crypto.randomUUID();
        let timer = setTimeout(() => {
            callMap.delete(id);
            reject( new Error('"Download With Aria2" is either not installed, disabled, or lower than v4.17.0.3548.') );
        }, 1000);
        callMap.set(id, (result) => {
            clearTimeout(timer);
            callMap.delete(id);
            resolve(result);
        });
        window.postMessage({ aria2c, id, params });
    });
};

window.addEventListener('message', (event) => {
    let { aria2c, id, result } = event.data;
    if (aria2c === 'aria2c_response') {
        callMap.get(id)?.(result);
    }
});

let aria2Bridge = {
    status: () => callback('aria2c_status'),
    download: (params) => callback('aria2c_download', params)
};

let keyword;

let result;

function extractImages(root) {
    let content = root.shadowRoot?.querySelector('bili-rich-text')?.shadowRoot;
    let images = content?.querySelectorAll('img');
    if (images?.length > 0) {
        for (let { alt, src } of images) {
            if (!alt.includes(keyword)) return;
            let url = src.split('@')[0];
            if (result.has(url)) return;
            let out = `${alt.slice(1, -1)}.${url.split('.').pop()}`;
            result.set(url, out);
        }
    }
}

function extractEmoji() {
    keyword = prompt('输入表情包关键词：');

    result = new Map();

    let comments = document.getElementById('commentapp').children[0].shadowRoot.children[1].children[1];

    for (let com of comments.children) {
        let [comment, replies] = com.shadowRoot.children;
        extractImages(comment);
        for (let img of replies.children[0].shadowRoot.children[0].children[0].children) {
            extractImages(img);
        }
    }

    let { size } = result;

    if (size === 0) {
        alert('未找到所输入关键词对应的表情！');
        return;
    } else {
        alert(`找到${size}个表情……`);
    }

    aria2Bridge.status().then(() => {
        let session = [];
        for (let [url, out] of result) {
            session.push({ url, options: { out } });
        }
        aria2Bridge.download(session);
    }).catch(() => {
        let index = 0;
        for (let [url, name] of result) {
            setTimeout(() => GM_download(url, name), index++ * 200);
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyE') {
        extractEmoji();
    }
});
