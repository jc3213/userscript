// ==UserScript==
// @name         哔哩哔哩直播间检测插件
// @namespace    https://github.com/jc3213/userscript
// @version      1
// @description  哔哩哔哩直播间屏蔽工具的直播间内检测插件
// @author       jc3213
// @include      /https?:\/\/live\.bilibili\.com\/\d+
// @require      https://github.com/jc3213/userscript/raw/main/BilibiliLiveRoomFilter.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var id = location.href.match(/\d+/)[0];
var player = document.querySelector('section.player-and-aside-area');
if (player) {
    banInsideLiveRoom(player);
}
else {
    document.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'DIV' && event.target.style.margin === '0px auto') {
            event.target.querySelector('iframe').addEventListener('load', (event) => {
                event.target.contentDocument.head.appendChild(css);
                event.target.contentDocument.addEventListener('DOMNodeInserted', (event) => {
                    if (event.target.id === 'head-info-vm') {
                        banInsideLiveRoom(event.target);
                    }
                });
            });
        }
    });
}
