// ==UserScript==
// @name         优化虎扑热评显示
// @namespace    https://github.com/jc3213/userscript
// @version      1
// @description  限制虎扑热评高度，减少页面占用以优化阅读体验
// @author       jc3213
// @match        *://bbs.hupu.com/*
// ==/UserScript==

$('div[class="w_reply clearfix"]').css({'height': '400px', 'overflow-y': 'auto'});
