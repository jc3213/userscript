// ==UserScript==
// @name         Bilibili 直播间屏蔽工具
// @namespace    https://github.com/jc3213/userscript
// @version      2
// @description  try to take over the world!
// @author       jc3213
// @match        *://live.bilibili.com/*
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

'use strict';
var ban_id = GM_getValue('id', []);
var ban_liver = GM_getValue('liver', []);
GM_addValueChangeListener('ban', (name, old_value, new_value, remote) => {
    if (new_value === '') {
        return;
    }
    ban_id.push(new_value.id);
    ban_liver.push(new_value.liver);
    GM_setValue('id', ban_id);
    GM_setValue('liver', ban_liver);
    GM_setValue('ban', '');
});

var player = document.querySelector('section.player-and-aside-area');
if (player) {
    var id = location.pathname.match(/\d+/)[0];
    if (ban_id.includes(id)) {
        var liver = player.querySelector('a.room-owner-username').innerHTML;
        if (confirm('【 ' + liver + ' 】的直播间已被屏蔽，是否继续观看？')) {
            return;
        }
        open('https://live.bilibili.com', '_self');
    }
}

var list = document.querySelector('ul.list');
if (list) {
    list.querySelectorAll('li').forEach(item => blockLiveRoom(item));
    list.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'LI') {
            blockLiveRoom(event.target);
        }
    });
}

function blockLiveRoom(element) {
    var id = element.querySelector('a').href.match(/\d+/)[0];
    if (ban_id.includes(id)) {
        element.style.display = 'none';
        return;
    }
    var liver = element.querySelector('div.room-anchor > span').innerHTML;
    var name = element.querySelector('span.room-title').innerHTML;
    var preview = element.querySelector('div.cover-ctnr').style['background-image'].match(/https:\/\/[^\@]+/)[0];

    var block = document.createElement('button');
    block.innerHTML = '屏蔽直播间';
    block.addEventListener('click', (event) => {
        if (confirm('确定要永久屏蔽【 ' + liver + ' 】的直播间吗？')) {
            element.style.display = 'none';
            GM_setValue('ban', {id: id, liver: liver})
        }
    });

    var download = document.createElement('button');
    download.innerHTML = '下载封面图';
    download.style.cssText = 'margin-left: 5px;';
    download.addEventListener('click', (event) => {
        if (confirm('确定要下载直播《' + name + '》的封面吗？')) {
            GM_download(preview, id + '_' + name);
        }
    });
    element.prepend(block);
    block.after(download);
}
