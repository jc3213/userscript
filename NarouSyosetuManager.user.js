// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      2.1.1
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @exclude      https://ncode.syosetu.com/impression/*
// @exclude      https://ncode.syosetu.com/novelpdf/*
// @exclude      https://ncode.syosetu.com/novelview/*
// @exclude      https://ncode.syosetu.com/novelreview/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==

'use strict';
// 書庫関連
let [, novelcode, novelread] = location.pathname.match(/^\/(?:.*\/ncode\/)?(n\w+)\/(?:(\d+))?\/?$/);
if (!novelcode) return;

let bookmark = GM_getValue('bookmark');
if (bookmark === undefined) {
    bookmark = GM_listValues().map((i) => {
        if (i === 'bookmark') return;
        let value = GM_getValue(i);
        GM_deleteValue(i);
        return [i, value];
    });
    GM_setValue('bookmark', bookmark);
}
console.log(bookmark);
let novels = new Map(bookmark);;
let validate = {};
let shortcut = '';
let novelname = $('.c-announce-box > :last-child > :first-child, h1.novel_title')[0].textContent;
let shelf = false;

// ホットキー関連
let keyTime;

const hotkey = {
    '0' () {
        clearTimeout(keyTime);
        shortcut += event.key;
        keyTime = setTimeout(() => {
            open('https://ncode.syosetu.com/' + novelcode + (shortcut[0] === '0' ? '/' : '/' + shortcut + '/'), '_blank');
            shortcut = '';
        }, 1000);
    },
    'Escape': () => clearTimeout(keyTime),
    'ArrowLeft': () => $('a.c-pager__item--before')[0]?.click(),
    'ArrowRight': () => $('a.c-pager__item--next')[0]?.click()
};

['1','2','3','4','5','6','7','8','9'].forEach((i) => {
    hotkey[i] = hotkey['0'];
});

$(document).keydown((event) => {
    let key = hotkey[event.key];
    if (!key || event.target.localName === 'input') return;
    event.preventDefault();
    hotkey[event.key]();
});

// UI作成関連
let manager = $('<div class="jsui-basic-menu jsui-book-manager"></div>');
let overlay = $('<div class="jsui-notify-overlay"></div>');
let clearfix;
let css = $(`<style>
.jsui-menu-item { text-align: center; margin: 1px; flex: auto; padding: 5px 10px; border-width: 0px; }
.jsui-menu-item:not(.jsui-menu-disabled):hover, .jsui-button-cell:hover { cursor: pointer; filter: contrast(65%); }
.jsui-menu-item:not(.jsui-menu-disabled):active, .jsui-button-cell:active { filter: contrast(35%); }
.jsui-menu-checked { padding: 4px 9px; border-style: inset; border-width: 1px; }
.jsui-basic-menu { margin: 0px; padding: 0px; user-select: none; display: flex; gap: 1px; }
.jsui-basic-menu > input { flex: 4; }
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
        novels.forEach(fancyTableItem);
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

// 書庫管理UI
let bookshelf = $('<div class="jsui-book-shelf"></div>').hide();
let shelf_menu = $('<div class="jsui-basic-menu"></div>');
let shelf_table = $('<div class="jsui-table"></div>').html('<div class="jsui-table-head jsui-table-column"><div class="jsui-table-cell">NCODE</div><div class="jsui-table-cell">小説タイトル</div></div>');
bookshelf.append(shelf_menu, shelf_table);

let input_field = $('<input>').keydown((event) => {
    if (event.key === 'Enter') {
        submit_btn[0].click();
    }
});

let submit_btn = $('<div class="jsui-menu-item">NCODE登録</div>').click(async () => {
    let ncode = input_field[0].value.match(/\/(n\w+)\//)?.[1];
    if (!ncode) {
        return fancyPopup(ncode, null, 'は間違っています！');
    }
    let book = novels.get(ncode);
    if (book) {
        fancyPopup(ncode, book, 'は既に書庫に登録しています！');
    }
    else if (ncode === novelcode) {
        subscribeNcode(ncode, novelname);
    }
    else {
        if (validate[ncode]) {
            return fancyPopup(ncode, null, 'を検証しています、しばらくお待ちください！');
        }
        validate[ncode] = true;
        let res = await fetch('/' + ncode);
        let text = await res.text();
        book = text.match(/<title[^>]*>(.*)<\/title>/)[1];
        book === 'エラー'
            ? fancyPopup(ncode, null, 'は「小説家になろう」に存在しません！')
            : subscribeNcode(ncode, book)
        delete validate[ncode];
    }
});
function subscribeNcode(ncode, book) {
    fancyTableItem(book, ncode);
    novels.set(ncode, book);
    GM_setValue('bookmark', [...novels]);
    fancyPopup(ncode, book, 'は書庫に登録しました！');
}

let types = [{ description: 'なろう書庫', accept: { 'application/x-syosetu': ['.syosetu'] } }];
let export_btn = $('<div class="jsui-menu-item" id="jsui-save-btn">書庫エクスポート</div>').click(async () => {
    let text = JSON.stringify([...novels], null, 4);
    let blob = new Blob([text]);
    let now = new Date();
    let time = now.getFullYear() + paddingTimeStamp(now.getMonth() + 1) + paddingTimeStamp(now.getDate()) + '-' + paddingTimeStamp(now.getHours()) + paddingTimeStamp(now.getMinutes()) + paddingTimeStamp(now.getSeconds());
    let handle = await document.defaultView.showSaveFilePicker({ suggestedName: 'なろう書庫-' + time + '.syosetu', types });
    let writer = await handle.createWritable();
    await writer.write(blob);
    await writer.close();
});
let import_btn = $('<div class="jsui-menu-item" id="jsui-save-btn">書庫インスポート</div>').click(async () => {
    let [handle] = await document.defaultView.showOpenFilePicker({ types });
    let file = await handle.getFile();
    let text = await file.text();
    let json = JSON.parse(text);
    novels = new Map(json);
    shelf_table.empty();
    novels.clear();
    novels.forEach((book, ncode) => {
        novels.set(ncode, book);
        fancyTableItem(book, ncode);
    });
    GM_setValue('bookmark', [...novels]);
});
function paddingTimeStamp(number) {
    return String(number).padStart(2, '0');
}

shelf_menu.append(input_field, submit_btn, export_btn, import_btn);
$(document.body).append(bookshelf, overlay);

// 書庫表記生成
function fancyTableItem(book, ncode) {
    let mybook = $('<div class="jsui-table-column"></div>').attr('id', ncode);
    let cell_ncode = $('<div class="jsui-button-cell"></div>').text(ncode).click(() => removeNcodeFromShelf(mybook, ncode, book));
    let cell_title = $('<div class="jsui-button-cell"></div>').text(book).click(() => openNcodeInNewPage(ncode, book));
    mybook.append(cell_ncode, cell_title).appendTo(shelf_table);
}
function removeNcodeFromShelf(mybook, ncode, book) {
    if (!confirm('【 ' + book + ' 】を書庫から削除しますか？')) return;
    mybook.remove();
    novels.delete(ncode);
    GM_setValue('bookmark', [...novels]);
    fancyPopup(ncode, book, 'は書庫から削除しました！');
}
function openNcodeInNewPage(ncode, book) {
    if (!confirm('小説【 ' + book + ' 】を開きますか？')) return;
    open('https://ncode.syosetu.com/' + ncode + '/', '_blank');
}

// ログ関連
function fancyPopup(ncode, book, result) {
    let message = book
        ? '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + book + '</span>」 <span style="color: violet">' + result + '</span>'
        : '<span style="color: darkgreen">' + ncode + '</span> <span style="color: violet">' + result + '</span>';
    let popup = $('<div class="jsui-notify-popup"></div>').html(message).click(() => popup.remove());
    overlay.append(popup);
    popup.css('left', ($(document).width() - popup.width()) / 2 + 'px');
    setTimeout(() => popup.remove(), 3000);
}
