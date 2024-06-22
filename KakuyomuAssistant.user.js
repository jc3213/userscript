// ==UserScript==
// @name         「」カクヨム助手
// @namespace    https://github.com/jc3213/userscript
// @version      0.2
// @description  「」カクヨムのリーディング体験をより良くするためのツールです
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
    switch (event.key) {
        case 'ArrowLeft':
            open(document.querySelector('#contentMain-previousEpisode > a').href.slice(0, -4), '_self');
            break;
        case 'ArrowRight':
            open(document.querySelector('#contentMain-nextEpisode > a').href, '_self');
            break;
    }
});
