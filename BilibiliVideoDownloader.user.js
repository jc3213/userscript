// ==UserScript==
// @name            Bilibili Video Downloader
// @name:zh         哔哩哔哩视频下载器
// @namespace       https://github.com/jc3213/userscript
// @version         0.4
// @description     Download videos from Bilibili Douga (No Bangumi Support)
// @description:zh  从哔哩哔哩下载视频（不支持番剧）
// @author          jc3213
// @match           *://www.bilibili.com/video/*
// @match           *://*.bilivideo.com/*
// @match           *://*.bilivideo.cn/*
// @match           *://*.cdnnodedns.cn/*
// @grant           GM_webRequest
// ==/UserScript==

var record = [];
var format = [
    {d: '30280', x: 'HQ.aac', r: '音频 高码率'},
    {d: '30216', x: 'LQ.aac', r: '音频 低码率'},
    {d: '30120', x: '4K-UHQ.mp4', r: '4K 超清'},
    {d: '30116', x: '1080HQ.mp4', r: '1080P 60帧'},
    {d: '30112', x: '1080HBr.mp4', r: '1080P 高码率'},
    {d: '30080', x: '1080.mp4', r: '1080P 高清'},
    {d: '30074', x: '720HQ.mp4', r: '720P 60帧'},
    {d: '30064', x: '720.mp4', r: '720P 高清'},
    {d: '30032', x: '480.mp4', r: '480P 清晰'},
    {d: '30016', x: '360.mp4', r: '360P 流畅'},
    {d: '30015', x: '360LQ.mp4', r: '360P 流畅'},
    {d: '120', x: '4K-UHQ.flv', r: '4K 超清 FLV'},
    {d: '116', x: '1080HQ.flv', r: '1080P 60帧 FLV'},
    {d: '112', x: '1080HBr.flv', r: '1080P 高码率 FLV'},
    {d: '80', x: '1080.flv', r: '1080P 高清 FLV'},
    {d: '74', x: '720HQ.flv', r: '720P 60帧 FLV'},
    {d: '64', x: '720.flv', r: '720P 高清 FLV'},
    {d: '32', x: '480.flv', r: '480P 清晰 FLV'},
    {d: '16', x: '360.flv', r: '360P 流畅 FLV'},
    {d: '15', x: '360LQ.flv', r: '360P 流畅 FLV'},
];

var btncss = 'background-color: #c26; color: #fff; margin: 1px; padding: 10px; display: inline-block; user-select: none; cursor: pointer;';
var boxcss = 'position: absolute; z-index: 99999; left: 33%;';
var whocss = document.querySelector('#viewbox_report') ? 'top: 94%; left: 33%' : 'top: 87%; left: 35%;';

var mybox = document.createElement('div');
mybox.style.cssText = boxcss + whocss;
document.body.appendChild(mybox);

document.querySelector('video').addEventListener('loadstart', (event) => {
    record = [];
    mybox.innerHTML = '';
});

GM_webRequest([
    {selector: '*://*.bilivideo.com/*', action: 'redirect'},
    {selector: '*://*.bilivideo.cn:*/*', action: 'redirect'},
    {selector: '*://*.cdnnodedns.cn:*/*', action: 'redirect'}
], (info, message, details) => {
    var file = details.url.split('?').shift().split('/').pop();
    if (record.includes(file) || details.url.includes('data')) {
        return;
    }
    record.push(file);

    var type = format.find(item => item.d === file.split('-').pop().split('.').shift());
    if (!type) {
        return console.log(details.url);
    }

    var item = document.createElement('a');
    item.innerText = type.r;
    item.href = details.url;
    item.target = '_self';
    item.style.cssText = btncss;
    item.onmouseenter = (event) => {
        event.target.download = document.title.split('_')[0] + type.x;
        item.onmouseenter = null;
    };
    item.onclick = (event) => {
        if (event.altKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({url: event.target.href, filename: event.target.download}) + '\n' + location.href);
        }
    };
    mybox.appendChild(item);
});
