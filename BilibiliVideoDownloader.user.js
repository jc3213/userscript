// ==UserScript==
// @name         Bilibili Video Downloader
// @namespace    https://github.com/jc3213/userscript
// @version      0.1
// @description  Help you download videos on Bilibili
// @author       jc3213
// @match        *://*.bilibili.com/video/*
// @match        *://*.bilivideo.com/*
// @match        *://*.bilivideo.cn/*
// @match        *://*.cdnnodedns.cn/*
// @grant        GM_webRequest
// ==/UserScript==

var record = [];
var title = document.title.split('_')[0];
var referer = location.href;
var ext = [
    {r: '30280', x: '.aac', d: '音频'},
    {r: '30080', x: '1080.mp4', d: '1080高清'},
    {r: '30064', x: '720.mp4', d: '720高清'},
    {r: '30032', x: '480.mp4', d: '480清晰'},
    {r: '30015', x: '360.mp4', d: '360流畅'},
];

var btncss = 'background-color: #c26; color: #fff; margin: 1px; padding: 10px; display: block; user-select: none; cursor: pointer;';
var boxcss = 'position: absolute; z-index: 99999; left: 33%;';

var mybtn = document.createElement('div')
mybtn.innerText = '下载';
mybtn.style.cssText = btncss + boxcss + ' top: 94%;';
mybtn.addEventListener('click', () => {
    mybox.style.display = mybox.style.display === 'none' ? 'block' : 'none';
});
document.body.appendChild(mybtn);

var mybox = document.createElement('div');
mybox.style.cssText = boxcss + ' top: 98.15%; display: none';
document.body.appendChild(mybox);

GM_webRequest([
    {selector: '*://*.bilivideo.com/*', action: 'redirect'},
    {selector: '*://*.bilivideo.cn:*/*', action: 'redirect'},
    {selector: '*://*.cdnnodedns.cn:*/*', action: 'redirect'}
], (info, message, details) => {
    if (details.url.includes('data')) {
        return;
    }

    var url = details.url;
    var file = url.split('?')[0];

    if (record.includes(file)) {
        return;
    }

    record.push(file);
    var type = ext.find(item => item.r === file.split('-').pop().split('.').shift());
    var filename = title + type.x;

    //console.log(JSON.stringify({filename, url, referer}));
    var item = document.createElement('a');
    item.innerText = type.d;
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
