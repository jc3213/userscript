// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      1.8.0
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @match        https://novel18.syosetu.com/*
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
var [, novelcode, novelread] = pathname.match(/(n\w+)\/(?:(\d+)\/)?$/);
if (!novelcode) {
    return;
}
var novelname = pathname === '/' + novelcode + '/' ? document.title : $('#container a[href$="/' + novelcode + '/"]')[0].innerText;
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
    var {extension_name} = event.data;
    if (extension_name === 'Download With Aria2') {
        aria2c = extension_name;
    }
});

var tategaki = $('#head_nav > :nth-child(5) > a');
tategaki.attr('href', 'https://pdfnovels.net/' + novelcode + '/main.pdf').click(event => {
    if (aria2c) {
        event.preventDefault();
        postMessage({aria2c, download: { url: tategaki.href, options: {out: novelname + '.pdf'} } });
    }
});

// UI作成関連
var manager = $('<div class="jsui-basic-menu jsui-book-manager"></div>');

var css = $(`<style>
.jsui-menu-item {text-align: center; margin: 1px; flex: auto; padding: 5px 10px; border-width: 0px;}
.jsui-menu-item:not(.jsui-menu-disabled):hover, .jsui-table-button:hover {cursor: pointer; filter: contrast(65%);}
.jsui-menu-item:not(.jsui-menu-disabled):active, .jsui-table-button:active {filter: contrast(35%);}
.jsui-menu-checked {padding: 4px 9px; border-style: inset; border-width: 1px;}
.jsui-menu-disabled {filter: contrast(15%);}
.jsui-basic-menu {margin: 0px; padding: 0px; user-select: none; display: flex; gap: 1px;}
.jsui-book-manager {position: relative; font-weight: bold; top: 8px; width: fit-content;}
.jsui-book-shelf {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px; overflow: hidden;}
.jsui-table, .jsui-logging {height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 20px; border-width: 1px; border-style: solid;}
.jsui-table-button:nth-child(1) {line-height: 200%;}
.jsui-table-column {display: flex; gap: 1px; margin: 1px;}
.jsui-table-column > :not(:nth-child(2)) {flex: none; width: 120px;}
.jsui-table-cell, .jsui-table-button {flex: auto; padding: 5px; text-align: center; line-height: 100%; border-width: 1px; border-style: solid;}
.jsui-table-head > * {background-color: #000000; color: #ffffff; padding: 10px 5px;}
.jsui-table-body > :nth-child(2n) {background-color: #efefef;}
.jsui-notify-overlay {position: fixed; top: 20px; left: 0px; z-index: 99999999;}
.jsui-notify-popup {position: relative; background-color: #fff; cursor: pointer; padding: 5px 10px; margin: 5px; width: fit-content; border-radius: 3px; border: 1px outset #cccccc;}
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

manager.append(css, button);
$('#head_nav').append(manager);

if (novelread) {
    $('#novel_color').css('width', '60%');
    var clearfix = $('<div class="jsui-menu-item">本文のみ</div>').click(event => {
        localStorage.clearfix = localStorage.clearfix === '0' ? '1' : '0';
        removeHeaderFooter();
    });;
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

var bookshelf = $('<div class="jsui-book-shelf"></div>').hide();;
var shelf_menu = $('<div class="jsui-basic-menu"></div>');
var shelf_table = $('<div class="jsui-table"></div>').html('<div class="jsui-table-head jsui-table-column"><div class="jsui-table-cell">NCODE</div><div class="jsui-table-cell">小説タイトル</div><div class="jsui-table-cell">更新間隔</div><div class="jsui-table-cell">ダウンロード</div></div>');
var shelf_debug = $('<div class="jsui-logging"></div>');
bookshelf.append(shelf_menu, shelf_table, shelf_debug);

var input_field = $('<input>').change(event => {
    myncode = event.target.value ?? novelcode;
});
var submit_btn = $('<div class="jsui-menu-item">NCODE登録</div>').click(async event => {
    var book = bookmark.find(({ncode}) => ncode === myncode);
    if (book) {
        var {ncode, title} = book;
        myFancyPopup('Nコード【' + ncode + '】、「' + title + '」は既に書庫に登録しています！');
        validate[ncode] = title;
    }
    else if (myncode === novelcode) {
        subscribeNcode(novelcode, novelname);
    }
    else {
        if (validate[myncode]) {
            return myFancyPopup('Nコード【' + myncode + '】が存在しません');;
        }
        validate[myncode] = '検証中';
        myFancyPopup('Nコード【' + myncode + '】を検証しています、しばらくお待ちください！');
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
var export_btn = $('<div class="jsui-menu-item">NCODE保存</div>').click(event => {
    if (confirm('全ての小説のダウンロード情報をエックスポートしますか？')) {
        var text = JSON.stringify(bookmark);
        var blob = new Blob([text], {type: 'application/metalink+xml; charset=utf-8'})
        var href = URL.createObjectURL(blob);
        var download = '小説家になろう書庫-' + new Date().toJSON().slice(0, -2).replace(/[T:\.\-]/g, '_') + '.json';
        var a = $('<a></a>').attr({href, download});
        a[0].click();
        a.remove();
        saveBookmarkButton();
        alert('情報のエックスポートは無事に成功しました！');
    }
});
var download_btn = $('<div class="jsui-menu-item">PDFダウンロード</div>').click(async event => {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        if (download.all) {
            return;
        }
        download.all = true;
        var session = bookmark.map(downloadPDFHelper);
        var result = await Promise.all(session);
        myFancyPopup('全ての小説の縦書きPDFのダウンロードがかんりょうしました！');
        GM_setValue('bookmark', result);
        download.all = false;
    }
});
var update_btn = $('<div class="jsui-menu-item jsui-menu-disabled" id="jsui-save-btn">書庫更新</div>').click(event => {
    if (changed) {
        GM_setValue('bookmark', bookmark);
        update_btn.addClass('jsui-menu-disabled');
        changed = false;
        shelf_table.show();
    }
});
var debug_btn = $('<div class="jsui-menu-item" id="jsui-log-btn">ログ表示</div>').click(event => {
    shelf_table.toggle();
    debug_btn.toggleClass('jsui-menu-checked');
});
shelf_menu.append(input_field, submit_btn, export_btn, download_btn, update_btn, debug_btn);

$(document.body).append(bookshelf, overlay).keydown(event => {
    if (event.keyCode === 37) {
        $('#novel_color > .novel_bn > a')[0].click();
    }
    else if (event.keyCode === 39) {
        $('#novel_color > .novel_bn > a')[1].click();
    }
});

// ブックマーク表記生成
function fancyTableItem(book, index) {
    var {ncode, title, next, last} = book;
`<div class="jsui-table-column" id="n1976ey">
<div class="jsui-table-button">2023/5/168:6:28</div></div>`
    var mybook = $('<div class="jsui-table-column"></div>').attr('id', ncode);
    var cell_ncode = $('<div class="jsui-table-button"></div>').text(ncode).click(event => removeNcodeFromShelf(mybook, index, ncode, title));
    var cell_title = $('<div class="jsui-table-button"></div>').text(title).click(event => openNcodeInNewPage(ncode, title));
    var cell_input = $('<input type="number" min="0" max="30" style="width: 126px;">').attr('title', next === 0 ? '自動更新をしません' : next + '日間隔で更新します').val(next).change(event => changeNcodeUpdatePeriod(book, ncode, title, event.target.value | 0));
    var cell_update = $('<div class="jsui-table-button"></div>').text(generateTimeFormat(book.last)).click(event => downloadCurrentNcode(book, title));
    mybook.append(cell_ncode, cell_title, cell_input, cell_update).appendTo(shelf_table);
}
function removeNcodeFromShelf(mybook, index, ncode, title) {
    if (confirm('【 ' + title + ' 】を書庫から削除しますか？')) {
        mybook.remove();
        bookmark.splice(index, 1);
        saveBookmarkButton();
        myFancyLog(ncode, title, 'は書庫から削除しました！');
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
function changeNcodeUpdatePeriod(book, ncode, title, value) {
    book.next = value;
    saveBookmarkButton();
    event.target.title = value === 0 ? '自動更新をしません' : value + '日間隔で更新します';
    myFancyLog(ncode, title, value === 0 ? 'は更新しないように設定しました！' : 'は ' + value + ' 日間隔で更新するように設定しました！');
}

function generateTimeFormat(ms) {
    var time = new Date(ms);
    return time.getFullYear() + '/' + (time.getMonth() + 1) + '/' + time.getDate() + '\n' + time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}
function saveBookmarkButton() {
    update_btn.removeClass('jsui-menu-disabled');
    changed = true;
}

// ブックマーク自動更新
if (today !== scheduler) {
    var update = bookmark.map(book => {
        var {ncode, title, next, last} = ncode;
        if (next === 0) {
            return myFancyPopup('Nコード【' + ncode + '】、「' + title + '」は更新しないように設定しています！！');
        }
        var update = next - (timeline - last) / 86400000;
        if (update > 0) {
            update = update >= 1 ? (next | 0) + '日' : (update * 24 | 0) + '時間';
            return myFancyPopup('Nコード【' + ncode + '】、「' + title + '」は ' + update + ' 後に更新する予定です！');
        }
        else {
            return downloadPDFHelper(book);
        }
    });
    Promise.all(update).then(result => {
        localStorage.scheduler = today;
    });
}

// ダウンロード関連
async function downloadPDFHelper(book) {
    var {ncode, title} = book;
    var url = 'https://pdfnovels.net/' + ncode + '/main.pdf';
    var name = title + '.pdf';
    if (aria2c) {
        postMessage({aria2c, download: { url, options: {out: name} } });
        book.last = updateBookInfo(ncode);
        //return book;
    }
    if (download[ncode]) {
        myFancyPopup('Nコード【' + ncode + '】、「' + title + '」はまだ処理しています、しばらくお待ちください！');
        return book;
    }
    download[ncode] = true;
    myFancyPopup('Nコード【' + ncode + '】、「' + title + '」のダウンロードを開始しました！');
    var details = await promisedXMLRequest(url);
    if (details.response.type === 'application/pdf') {
        var href = URL.createObjectURL(details.response);
        var down = $('<a></a>').attr({href, download: name});
        down[0].click();
        down.remove();
        book.last = updateBookInfo(ncode);
        download[ncode] = false;
        return book;
    }
    else {
        return waitForRetryDownload(book);
    }
}
function updateBookInfo(ncode) {
    var date = shelf_table.find('#' + ncode + '> :last-child').text(generateTimeFormat(timeline));
    return timeline;
}
function promisedXMLRequest(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url,
            method: 'GET',
            responseType: 'blob',
            onload: resolve,
            onerror: reject
        });
    });
}
function waitForRetryDownload(book) {
    return new Promise(resolve => {
        var {ncode, title} = book;
        myFancyPopup('Nコード【' + ncode + '】、「' + title + '」の縦書きPDFは只今生成中です、 60秒後に再試行します！');
        setTimeout(async () => {
            var blob = await downloadPDFHelper(book);
            resolve(blob);
        }, 60000);
    });
}

// ログ関連
function myFancyLog(ncode, title, result) {
    if (ncode && title) {
        var message = '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」 <span style="color: violet">' + result + '</span>';
    }
    else if (ncode === undefined && title) {
        message = '<span style="color: darkgreen">' + title + '</span> <span style="color: violet">' + result + '</span>';
    }
    else if (ncode && title === undefined) {
        message = '<span style="color: darkgreen">' + ncode + '</span> <span style="color: violet">' + result + '</span>';
    }
    var log = $('<p></p>').html(message);
    shelf_debug.prepend(log);
    myFancyPopup(message);
}
function myFancyPopup(message) {
    var popup = $('<div class="jsui-notify-popup"></div>').html(message).click(event => popup.remove());
    overlay.append(popup);
    popup.css('left', ($(document).width() - popup.width()) / 2 + 'px');
    setTimeout(() => popup.remove(), 3000);
}
