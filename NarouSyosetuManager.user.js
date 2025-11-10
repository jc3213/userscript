// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      2.0.0
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @exclude      https://ncode.syosetu.com/impression/*
// @exclude      https://ncode.syosetu.com/novelpdf/*
// @exclude      https://ncode.syosetu.com/novelview/*
// @exclude      https://ncode.syosetu.com/novelreview/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

'use strict';
// 書庫関連
let [, novelcode, novelread] = location.pathname.match(/^\/(?:.*\/ncode\/)?(n\w+)\/(?:(\d+))?\/?$/);
if (!novelcode) return;

let shortcut = '';
let shortime;
let novelname = $('.c-announce-box > :last-child > :first-child, h1.novel_title')[0].textContent;
let myncode = novelcode;
let now = new Date();
let today = now.getFullYear() + now.getMonth() + now.getDate();
let timeline = now.getTime();
let validate = {};
let novels = {};
let changed = false;
let shelf = false;
let bookmark = GM_getValue('bookmark', []);
let scheduler = localStorage.scheduler ?? today;

// UI作成関連
let manager = $('<div class="jsui-basic-menu jsui-book-manager"></div>');
let overlay = $('<div class="jsui-notify-overlay"></div>');
let clearfix;
let css = $(`<style>
.jsui-menu-item { text-align: center; margin: 1px; flex: auto; padding: 5px 10px; border-width: 0px; }
.jsui-menu-item:not(.jsui-menu-disabled):hover, .jsui-button-cell:hover { cursor: pointer; filter: contrast(65%); }
.jsui-menu-item:not(.jsui-menu-disabled):active, .jsui-button-cell:active { filter: contrast(35%); }
.jsui-menu-checked { padding: 4px 9px; border-style: inset; border-width: 1px; }
.jsui-menu-disabled { filter: contrast(15%); }
.jsui-basic-menu { margin: 0px; padding: 0px; user-select: none; display: flex; gap: 1px; }
.jsui-basic-menu > input { flex: 2; }
.jsui-book-manager { position: relative; font-weight: bold; left: 5px; width: fit-content; }
.jsui-book-shelf { position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px; overflow: hidden; }
.jsui-table, .jsui-logging { height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 20px; border-width: 1px; border-style: solid; }
.jsui-table-column { display: grid; gap: 1px; margin: 1px; grid-template-columns: 180px auto; }
.jsui-table-cell, .jsui-button-cell { padding: 5px; text-align: center; line-height: 200%; border-width: 1px; border-style: solid; }
.jsui-table-head > * { background-color: #000000; color: #ffffff; padding: 10px 5px; }
.jsui-table-body > :nth-child(2n) { background-color: #efefef; }
.jsui-notify-overlay { position: fixed; top: 20px; left: 0px; z-index: 99999999; }
.jsui-notify-popup { position: relative; background-color: #fff; cursor: pointer; padding: 5px 10px; margin: 5px; width: fit-content; border-radius: 3px; border: 1px outset #cccccc; }
nav { width: fit-content !important; }
main { width: 50% !important; }
p { margin: 0px; font-size: 18px !important; font-family: "Segoe UI", Verdana, "メイリオ", Meiryo, sans-serif; }
</style>`);

let button = $('<div class="jsui-menu-item">書庫管理</div>').click(() => {
    if (shelf === false) {
        bookmark.forEach(fancyTableItem);
        shelf = true;
    }
    bookshelf.toggle();
    button.toggleClass('jsui-menu-checked');
});

manager.append(css, button);
$('nav').append(manager);

if (novelread) {
    clearfix = $('<span class="jsui-menu-item">本文のみ</span>').click(() => {
        localStorage.clearfix = localStorage.clearfix === '0' ? '1' : '0';
        removeHeaderFooter();
    });
    manager.append(clearfix);
    removeHeaderFooter();
}

function removeHeaderFooter() {
    if (localStorage.clearfix === '1') {
        clearfix.addClass('jsui-menu-checked');
        $('.p-novel__text--preface, .p-novel__text--afterword').hide();
    }
    else {
        clearfix.removeClass('jsui-menu-checked');
        $('.p-novel__text--preface, .p-novel__text--afterword').show();
    }
};

// ショットカットマッピング
const hotkey = {
    '0' (event) {
        event.preventDefault();
        clearTimeout(shortime);
        shortcut += event.key;
        shortime = setTimeout(() => {
            open('https://ncode.syosetu.com/' + novelcode + (shortcut[0] === '0' ? '/' : '/' + shortcut + '/'), '_blank');
            shortcut = '';
        }, 1000);
    },
    'Escape': () => clearTimeout(shortime),
    'ArrowLeft': (event) => {
        event.preventDefault();
        $('a.c-pager__item--before')[0]?.click();
    },
    'ArrowRight': (event) => {
        event.preventDefault();
        $('a.c-pager__item--next')[0]?.click();
    }
};
['1','2','3','4','5','6','7','8','9'].forEach((i) => { hotkey[i] = hotkey['0']; });

$(document).keydown((event) => {
    hotkey[event.key]?.(event);
});

// 書庫管理UI
let bookshelf = $('<div class="jsui-book-shelf"></div>').hide();
let shelf_menu = $('<div class="jsui-basic-menu"></div>');
let shelf_table = $('<div class="jsui-table"></div>').html('<div class="jsui-table-head jsui-table-column"><div class="jsui-table-cell">NCODE</div><div class="jsui-table-cell">小説タイトル</div></div>');
bookshelf.append(shelf_menu, shelf_table);

let input_field = $('<input>').change((event) => {
    myncode = event.target.value ?? novelcode;
});

let submit_btn = $('<div class="jsui-menu-item">NCODE登録</div>').click(async () => {
    let book = bookmark.find(({ncode}) => ncode === myncode);
    if (book) {
        let {ncode, title} = book;
        fancyPopup(ncode, title, 'は既に書庫に登録しています！');
        validate[ncode] = title;
    }
    else if (myncode === novelcode) {
        subscribeNcode(novelcode, novelname);
    }
    else {
        if (validate[myncode]) {
            return fancyPopup(myncode, null, 'が存在しません！');;
        }
        validate[myncode] = '検証中';
        fancyPopup(myncode, null, 'を検証しています、しばらくお待ちください！');
        let res = await fetch('/' + myncode);
        let text = await res.text();
        if (text.includes('class="nothing"')) {
            validate[myncode] = 'が存在しません';
        }
        else {
            let tl = text.indexOf('<title>');
            let te = text.indexOf('</title>');
            title = text.slice(tl + 7, te);
            subscribeNcode(myncode, title)
        }
    }
});
function subscribeNcode(ncode, title) {
    let book = {ncode, title, last: 0, next: 0};
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    saveBookmarkButton();
    fancyPopup(ncode, title, 'は書庫に登録しました！');
}
let update_btn = $('<div class="jsui-menu-item jsui-menu-disabled" id="jsui-save-btn">書庫更新</div>').click(() => {
    if (!changed) return;
    GM_setValue('bookmark', bookmark);
    update_btn.addClass('jsui-menu-disabled');
    changed = false;
    shelf_table.show();
});
shelf_menu.append(input_field, submit_btn, update_btn);
$(document.body).append(bookshelf, overlay);

// 書庫表記生成
function fancyTableItem(book, index) {
    let { ncode, title, next, last } = book;
    let mybook = $('<div class="jsui-table-column"></div>').attr('id', ncode);
    let cell_ncode = $('<div class="jsui-button-cell"></div>').text(ncode).click(() => removeNcodeFromShelf(mybook, index, ncode, title));
    let cell_title = $('<div class="jsui-button-cell"></div>').text(title).click(() => openNcodeInNewPage(ncode, title));
    mybook.append(cell_ncode, cell_title).appendTo(shelf_table);
}
function removeNcodeFromShelf(mybook, index, ncode, title) {
    if (!confirm('【 ' + title + ' 】を書庫から削除しますか？')) return;
    mybook.remove();
    bookmark.splice(index, 1);
    saveBookmarkButton();
    fancyPopup(ncode, title, 'は書庫から削除しました！');
}
function openNcodeInNewPage(ncode, title) {
    if (!confirm('小説【 ' + title + ' 】を開きますか？')) return;
    open('https://ncode.syosetu.com/' + ncode + '/', '_blank');
}
function saveBookmarkButton() {
    update_btn.removeClass('jsui-menu-disabled');
    changed = true;
}

// ログ関連
function fancyPopup(ncode, title, result) {
    let message;
    if (ncode && title) {
        message = '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」 <span style="color: violet">' + result + '</span>';
    }
    else if (ncode === undefined && title) {
        message = '<span style="color: darkgreen">' + title + '</span> <span style="color: violet">' + result + '</span>';
    }
    else if (ncode && title === undefined) {
        message = '<span style="color: darkgreen">' + ncode + '</span> <span style="color: violet">' + result + '</span>';
    }
    let popup = $('<div class="jsui-notify-popup"></div>').html(message).click(() => popup.remove());
    overlay.append(popup);
    popup.css('left', ($(document).width() - popup.width()) / 2 + 'px');
    setTimeout(() => popup.remove(), 3000);
}
