// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      1.9.4
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://*.syosetu.com/n*
// @exclude      https://*.syosetu.com/impression/*
// @exclude      https://*.syosetu.com/novelreview/*
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "*.microad.net/*", "action": "cancel"}
// @webRequest   {"selector": "*.microad.jp/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var {pathname} = location;
var formdata = new FormData($('.js-pdf-form')[0]);
var [, novelcode, novelread] = pathname.match(/^\/(?:.*\/ncode\/)?(n\w+)\/(?:(\d+)\/)?$/);
if (!novelcode) {
    return;
}
var novelname = pathname === '/' + novelcode + '/' ? document.title : $(`#container a[href$="${novelcode}/"]`)[0].innerText;
var myncode = novelcode;
var now = new Date();
var today = now.getFullYear() + now.getMonth() + now.getDate();
var timeline = now.getTime();
var validate = {};
var download = {};
var changed = false;
var shelf = false;
var aria2c;
var bookmark = GM_getValue('bookmark', []);
var scheduler = localStorage.scheduler ?? today;
var overlay = $('<div class="jsui-notify-overlay"></div>');

addEventListener('message', event => {
    if (event.data.extension_name === 'Download With Aria2') {
        aria2c = 'aria2c_jsonrpc_call';
    }
});

// UI作成関連
var manager = $('<div class="jsui-basic-menu jsui-book-manager"></div>');

var css = $(`<style>
.jsui-menu-item {text-align: center; margin: 1px; flex: auto; padding: 5px 10px; border-width: 0px;}
.jsui-menu-item:not(.jsui-menu-disabled):hover, .jsui-button-cell:hover {cursor: pointer; filter: contrast(65%);}
.jsui-menu-item:not(.jsui-menu-disabled):active, .jsui-button-cell:active {filter: contrast(35%);}
.jsui-menu-checked {padding: 4px 9px; border-style: inset; border-width: 1px;}
.jsui-menu-disabled {filter: contrast(15%);}
.jsui-basic-menu {margin: 0px; padding: 0px; user-select: none; display: flex; gap: 1px;}
.jsui-book-manager {position: relative; font-weight: bold; top: 8px; width: fit-content;}
.jsui-book-shelf {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px; overflow: hidden;}
.jsui-table, .jsui-logging {height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 20px; border-width: 1px; border-style: solid;}
.jsui-button-cell:nth-child(1) {line-height: 200%;}
.jsui-table-column {display: flex; gap: 1px; margin: 1px;}
.jsui-table-column > :not(:nth-child(2)) {flex: none; width: 120px;}
.jsui-table-cell, .jsui-button-cell {flex: auto; padding: 5px; text-align: center; line-height: 100%; border-width: 1px; border-style: solid;}
.jsui-table-head > * {background-color: #000000; color: #ffffff; padding: 10px 5px;}
.jsui-table-body > :nth-child(2n) {background-color: #efefef;}
.jsui-notify-overlay {position: fixed; top: 20px; left: 0px; z-index: 99999999;}
.jsui-notify-popup {position: relative; background-color: #fff; cursor: pointer; padding: 5px 10px; margin: 5px; width: fit-content; border-radius: 3px; border: 1px outset #cccccc;}
#head_nav, #novel_color {width: 880px !important; margin: auto;}
.novel_subtitle, .novel_view {margin: 0px !important; padding: 0px !important; width: 100% !important;}
.novel_subtitle {margin-bottom: 100px !important;}
.novel_view > p {margin: 30px 0px;}
.novel_view > p > br {display: none;}
.novel_bn:last-child {margin-top: 100px !important;}
</style>`);

var button = $('<div class="jsui-menu-item">書庫管理</div>').click(event => {
    if (shelf === false) {
        bookmark.forEach(fancyTableItem);
        shelf = true;
    }
    bookshelf.toggle();
    button.toggleClass('jsui-menu-checked');
});
var download_btn = $('<div class="jsui-menu-item">ダウンロード</div>').click(async event => {
    if (download[novelcode]) {
        fancyPopup(novelcode, novelname, 'はまだ処理しています、しばらくお待ちください！');
    }
    fancyPopup(novelcode, novelname, 'ダウンロード情報を収集をしています、しばらくお待ちください！');
    download[novelcode] = true;
    var referer = `https://ncode.syosetu.com/novelpdf/creatingpdf/ncode/${novelcode}/`;
    var token = await getPDFDownloadURL(referer);
    var url = `https://pdfnovels.net/${token}/${novelcode}.pdf`
    var name = novelname + '.pdf';
    if (aria2c) {
        var urls = [{ url, options: {out: name, referer, 'user-agent': navigator.userAgent} }];
        postMessage({ aria2c, params: {urls} });
        download[novelcode] = false;
        fancyPopup(novelcode, novelname, 'はaria2cのJSON-RPCへ送りました！');
        return;
    }
    fancyPopup(novelcode, novelname, 'のダウンロードを開始しました！');
    var details = await promisedXMLRequest(url, referer);
    var href = URL.createObjectURL(details.response);
    var down = $('<a></a>').attr({href, download: name});
    down[0].click();
    down.remove();
    download[novelcode] = false;
    fancyPopup(novelcode, novelname, 'のダウンロードを完了しました！');
});

manager.append(css, button, download_btn);
$('#head_nav').append(manager);

if (novelread) {
    var clearfix = $('<span class="jsui-menu-item">本文のみ</span>').click(event => {
        localStorage.clearfix = localStorage.clearfix === '0' ? '1' : '0';
        removeHeaderFooter();
    });
    manager.append(clearfix);
    removeHeaderFooter();
}

function removeHeaderFooter() {
    if (localStorage.clearfix === '1') {
        clearfix.addClass('jsui-menu-checked');
        $('#novel_p, #novel_a').hide();
    }
    else {
        clearfix.removeClass('jsui-menu-checked');
        $('#novel_p, #novel_a').show();
    }
};

// ショットカットマッピング
var shortcut = {};
$('a.novelview_pager-before, a.novelview_pager-next').each((index, node) => {
    var txt = node.textContent;
    switch (node.textContent.trim()) {
        case '前へ':
            shortcut.ArrowLeft = node;
            break;
        case '次へ':
            shortcut.ArrowRight = node;
            break;
    }
});
$(document).keydown(({key}) => shortcut[key]?.click());

// 書庫管理UI
var bookshelf = $('<div class="jsui-book-shelf"></div>').hide();;
var shelf_menu = $('<div class="jsui-basic-menu"></div>');
var shelf_table = $('<div class="jsui-table"></div>').html('<div class="jsui-table-head jsui-table-column"><div class="jsui-table-cell">NCODE</div><div class="jsui-table-cell">小説タイトル</div></div>');
bookshelf.append(shelf_menu, shelf_table);

var input_field = $('<input>').change(event => {
    myncode = event.target.value ?? novelcode;
});
var submit_btn = $('<div class="jsui-menu-item">NCODE登録</div>').click(async event => {
    var book = bookmark.find(({ncode}) => ncode === myncode);
    if (book) {
        var {ncode, title} = book;
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
        var res = await fetch('/' + myncode);
        var text = await res.text();
        if (text.includes('class="nothing"')) {
            validate[myncode] = 'が存在しません';
        }
        else {
            var tl = text.indexOf('<title>');
            var te = text.indexOf('</title>');
            title = text.slice(tl + 7, te);
            subscribeNcode(myncode, title)
        }
    }
});
function subscribeNcode(ncode, title) {
    var book = {ncode, title, last: 0, next: 0};
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    saveBookmarkButton();
    fancyPopup(ncode, title, 'は書庫に登録しました！');
}
var update_btn = $('<div class="jsui-menu-item jsui-menu-disabled" id="jsui-save-btn">書庫更新</div>').click(event => {
    if (changed) {
        GM_setValue('bookmark', bookmark);
        update_btn.addClass('jsui-menu-disabled');
        changed = false;
        shelf_table.show();
    }
});
shelf_menu.append(input_field, submit_btn, update_btn);
$(document.body).append(bookshelf, overlay);

// 書庫表記生成
function fancyTableItem(book, index) {
    var {ncode, title, next, last} = book;
    var mybook = $('<div class="jsui-table-column"></div>').attr('id', ncode);
    var cell_ncode = $('<div class="jsui-button-cell"></div>').text(ncode).click(event => removeNcodeFromShelf(mybook, index, ncode, title));
    var cell_title = $('<div class="jsui-button-cell"></div>').text(title).click(event => openNcodeInNewPage(ncode, title));
    mybook.append(cell_ncode, cell_title).appendTo(shelf_table);
}
function removeNcodeFromShelf(mybook, index, ncode, title) {
    if (confirm('【 ' + title + ' 】を書庫から削除しますか？')) {
        mybook.remove();
        bookmark.splice(index, 1);
        saveBookmarkButton();
        fancyPopup(ncode, title, 'は書庫から削除しました！');
    }
}
function openNcodeInNewPage(ncode, title) {
    if (confirm('小説【 ' + title + ' 】を開きますか？')) {
        open('https://ncode.syosetu.com/' + ncode + '/', '_blank');
    }
}
async function downloadCurrentNcode(book, title) {
    if (confirm(title + ' をダウンロードしますか？')) {
        var result = await downloadPDFHelper(book);
        if (result === 'ok') {
            saveBookmarkButton();
        }
    }
}
function generateTimeFormat(ms) {
    var time = new Date(ms);
    return time.getFullYear() + '/' + (time.getMonth() + 1) + '/' + time.getDate() + '\n' + time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}
function saveBookmarkButton() {
    update_btn.removeClass('jsui-menu-disabled');
    changed = true;
}

// ダウンロード関連
async function getPDFDownloadURL(referer) {
    var text = await fetch(referer, {method: 'POST', body: formdata, referer: location.origin}).then(response => response.text());
    var temp = $(`<div style="display: none;">${text}</div>`).appendTo(document.body);
    return new Promise(resolve => {
        var watcher = setInterval(() => {
            var url = temp.find('a.js-pdf-downloadpage-link')[0].href;
            if (url !== 'javascript:void(0)') {
                clearInterval(watcher);
                resolve(url.match(/\/([^\/]+)\/$/)[1]);
            }
        }, 200);
    });
}
function promisedXMLRequest(url, referer) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url,
            header: {'Referer': referer},
            method: 'GET',
            responseType: 'blob',
            onload: resolve,
            onerror: reject
        });
    });
}

// ログ関連
function fancyPopup(ncode, title, result) {
    if (ncode && title) {
        var message = '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」 <span style="color: violet">' + result + '</span>';
    }
    else if (ncode === undefined && title) {
        message = '<span style="color: darkgreen">' + title + '</span> <span style="color: violet">' + result + '</span>';
    }
    else if (ncode && title === undefined) {
        message = '<span style="color: darkgreen">' + ncode + '</span> <span style="color: violet">' + result + '</span>';
    }
    var popup = $('<div class="jsui-notify-popup"></div>').html(message).click(event => popup.remove());
    overlay.append(popup);
    popup.css('left', ($(document).width() - popup.width()) / 2 + 'px');
    setTimeout(() => popup.remove(), 3000);
}
