// ==UserScript==
// @name         カクヨム「」助手
// @namespace    https://github.com/jc3213/userscript
// @version      0.1
// @description  カクヨム「」のリーディング体験をより良くするツールです
// @author       jc3213
// @match        https://kakuyomu.jp/works/*/episodes/*
// ==/UserScript==

// Remove side navigator
document.querySelector('#content').classList.remove('contentAside-isShown');

// Wide content field
document.querySelector('div.widget-episode-inner').style['max-width'] = '50%';

// Content font to Meiryo
document.querySelector('div.widget-episodeBody').style['font-family'] = '"Segoe UI",Verdana,"メイリオ",Meiryo,sans-serif';

// Shortcut hotkey
document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        document.querySelector('#contentMain-previousEpisode > a').click();
    }
    else if (event.keyCode === 39) {
        document.querySelector('#contentMain-nextEpisode > a').click();
    }
});
