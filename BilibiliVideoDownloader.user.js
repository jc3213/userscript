// ==UserScript==
// @name         Bilibili Video Downloader
// @namespace    https://github.com/jc3213/userscript
// @version      0.1
// @description  Help you download videos on Bilibili
// @author       jc3213
// @match        *://www.bilibili.com/video/*
// @match        *://*.bilivideo.com/*
// @match        *://*.bilivideo.cn/*
// @match        *://*.cdnnodedns.cn/*
// @grant        GM_webRequest
// ==/UserScript==

var record = [];
var title = document.title.split('_')[0];
var referer = location.href;
var ext = [
    {d: '30280', x: '.aac', r: '音频'},
    {d: '30120', x: '4K-UHQ.mp4', r: '4K 超清'},
    {d: '30116', x: '1080HFR.mp4', r: '1080P 60帧'},
    {d: '30112', x: '1080HBR.mp4', r: '1080P 高码率'},
    {d: '30080', x: '1080.mp4', r: '1080P 高清'},
    {d: '30074', x: '720HFR.mp4', r: '720P 60帧'},
    {d: '30064', x: '720.mp4', r: '720P 高清'},
    {d: '30032', x: '480.mp4', r: '480P 清晰'},
    {d: '30016', x: '360.mp4', r: '360P 流畅'},
    {d: '30015', x: '360LQ.mp4', r: '360P 流畅'},
];

var btncss = 'background-color: #c26; color: #fff; margin: 1px; padding: 10px; display: inline-block; user-select: none; cursor: pointer;';
var boxcss = 'position: absolute; z-index: 99999; left: 33%;';
var whocss = document.querySelector('#viewbox_report') ? 'top: 94%; left: 33%' : 'top: 87%; left: 35%;';

var mybox = document.createElement('div');
mybox.style.cssText = boxcss + whocss;
document.body.appendChild(mybox);

GM_webRequest([
    {selector: '*://*.bilivideo.com/*', action: 'redirect'},
    {selector: '*://*.bilivideo.cn:*/*', action: 'redirect'},
    {selector: '*://*.cdnnodedns.cn:*/*', action: 'redirect'}
], (info, message, details) => {
    if (details.url.includes('data') || details.url.includes('webmask')) {
        return;
    }

    var url = details.url;
    var file = url.split('?')[0];

    if (record.includes(file)) {
        return;
    }
    record.push(file);

    var type = ext.find(item => item.d === file.split('-').pop().split('.').shift());
    var filename = title + type.x;

    //console.log(JSON.stringify({filename, url, referer}));
    var item = document.createElement('a');
    item.innerText = type.r;
    item.href = url;
    item.download = filename;
    item.target = '_self';
    item.style.cssText = btncss;
    item.addEventListener('click', (event) => {
        if (event.altKey) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify({filename, url}) + '\n' + referer);
        }
    });
    mybox.appendChild(item);
});
