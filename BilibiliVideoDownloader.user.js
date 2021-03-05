// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         0.18
// @description     Download videos that you are watching from Bilibili (No Bangumi Support)
// @description:zh  从哔哩哔哩下载你正在收看的视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @grant           GM_webRequest
// ==/UserScript==

var record = [];
var title = document.title.match(/^[^_]+/)[0];
var mybox = document.createElement('div');
var format = {
    '30280': {x: '192K.aac', r: '音频 高码率'},
    '30232': {x: '128K.aac', r: '音频 中码率'},
    '30216': {x: '64K.aac', r: '音频 低码率'},
    '30120': {x: '4K-UHQ.mp4', r: '4K 超清'},
    '30116': {x: '1080HQ.mp4', r: '1080P 60帧'},
    '30112': {x: '1080HBr.mp4', r: '1080P 高码率'},
    '30080': {x: '1080.mp4', r: '1080P 高清'},
    '30074': {x: '720HQ.mp4', r: '720P 60帧'},
    '30064': {x: '720.mp4', r: '720P 高清'},
    '30032': {x: '480.mp4', r: '480P 清晰'},
    '30016': {x: '360.mp4', r: '360P 流畅'},
    '30015': {x: '360LQ.mp4', r: '360P 流畅'},
    '120': {x: '4K-UHQ.flv', r: '4K 超清 FLV'},
    '116': {x: '1080HQ.flv', r: '1080P 60帧 FLV'},
    '112': {x: '1080HBr.flv', r: '1080P 高码率 FLV'},
    '80': {x: '1080.flv', r: '1080P 高清 FLV'},
    '74': {x: '720HQ.flv', r: '720P 60帧 FLV'},
    '64': {x: '720.flv', r: '720P 高清 FLV'},
    '32': {x: '480.flv', r: '480P 清晰 FLV'},
    '16': {x: '360.flv', r: '360P 流畅 FLV'},
    '15': {x: '360LQ.flv', r: '360P 流畅 FLV'}
};

document.addEventListener('DOMNodeInserted', (event) => {
    if (event.target.tagName === 'VIDEO') {
        biliVideoExtractor(event.target);
    }
});
biliVideoExtractor(document.querySelector('video'));

function biliVideoExtractor(video) {
    if (video) {
        video.addEventListener('play', () => {
            var toolbar = document.querySelector('#toolbar_module') || document.querySelector('#arc_toolbar_report');
            toolbar.append(mybox);
            mybox.querySelector('a:nth-child(1)').href = document.head.innerHTML.match(/"thumbnailUrl"[^"]+"([^"]+)"/)[1]
        });
        video.addEventListener('loadstart', () => {
            record = [];
            mybox.innerHTML = '';
            title = document.title.match(/^[^_]+/)[0];
            createMenuitem('下载封面', '#', title + '.jpg');
        });
    }
}

GM_webRequest([
    {selector: '*://*.bilivideo.com/*', action: 'redirect'},
    {selector: '*://*.bilivideo.cn:*/*', action: 'redirect'},
    {selector: '*://*.cdnnodedns.cn:*/*', action: 'redirect'},
    {selector: '*://*.cachenode.cn:*/*', action: 'redirect'}
], (info, message, details) => {
    try {
        var file = details.url.match(/\d+-1-(\d+)\.(?:flv|m4s)/)[1];
        var type = format[file];
        if (record.includes(file)) {
            return;
        }
        else if (!type) {
            return console.log(new URL(details.url).hostname);
        }
        record.push(file);
    }
    catch(e) {
        return;
    }

    createMenuitem(type.r, details.url, title + type.x);
});

function createMenuitem(label, url, filename) {
    var item = document.createElement('a');
    item.href = url;
    item.target = '_self';
    item.innerText = label;
    item.download = filename;
    item.style.cssText = 'background-color: #c26; color: #fff; margin-left: 3px; padding: 10px; position: relative; top: ' + (document.querySelector('#toolbar_module > div.mobile-info') ? '5px' : '0px');
    item.addEventListener('click', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({url: item.href, filename: item.download}) + '\n' + location.href);
        }
    });
    mybox.appendChild(item);
}
