// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      1.5.3
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @match        https://novel18.syosetu.com/*
// @require      https://raw.githubusercontent.com/jc3213/jslib/9b140156a3b2190cf59dc3ff479f4ab61687dfec/ui/menu.js#sha256-1nO5024DhoyaoA4irujLR4ZvhmxeZF8e9uHwspVgvps=
// @require      https://raw.githubusercontent.com/jc3213/jslib/4221499b1b97992c9bce74122a4fe54435dbab59/ui/table.js#sha256-NEbVclWSJYQHpTp+wA8ANAq3YfaWrKyMXeySqFctiTU=
// @require      https://raw.githubusercontent.com/jc3213/jslib/26bdf18ec342013e1bdb27c20bd7633859d9cc72/ui/notify.js#sha256-7be5JjqTLPgG4In14VPg/1ZRxaAMg8uADYBd3mtSmsY=
// @require      https://raw.githubusercontent.com/jc3213/jslib/main/js/metalink4.js#sha256-KrcYnyS4fuAruLmyc1zQab2cd+YRfF98S4BupoTVz+A=
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "*.microad.net/*", "action": "cancel"}
// @webRequest   {"selector": "*.microad.jp/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var navi = document.querySelector('#head_nav');
if (navi === undefined) {
    return;
}

var {pathname} = location;
var {clearfix} = localStorage;
var title = document.querySelector('p.novel_title') ?? document.querySelector('a.margin_r20');
var novelcode = /n\d+\w+/g.exec(pathname)[0];
var novelname = title.innerText;
var myncode = novelcode;
var now = new Date();
var today = now.getFullYear() + now.getMonth() + now.getDate();
var timeline = now.getTime();
var validate = {};
var download = {};
var session = [];
var sync = false;
var show = false;
var log = false;
var bookmark = GM_getValue('bookmark', []);
var scheduler = GM_getValue('scheduler', today);
var jsMenu = new FlexMenu();
var jsTable = new FlexTable();
var jsNotify = new SimpleNotify();

// UI作成関連
var css = document.createElement('style');
css.innerHTML = `.jsui-menu-item {border-width: 0px;}
.jsui-menu-item:active, .jsui-menu-checked {padding: 2px; border-width: 1px;}
.jsui-table, .jsui-logging {height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 10px;}
.jsui-table > * > *:nth-child(2) {flex: 3;}
.jsui-manager {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px; overflow: hidden;}
.novel_subtitle, .novel_view {margin: 0px !important; padding: 0px !important; width: 100% !important;}
.novel_subtitle {margin-bottom: 100px !important;}
.novel_view > p {margin: 30px 0px;}
.novel_view > p > br {display: none;}
.novel_bn:last-child {margin-top: 100px !important;}`;
document.body.appendChild(css);

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        document.querySelector('div.novel_bn > a:nth-child(1)').click();
    }
    else if (event.keyCode === 39) {
        document.querySelector('div.novel_bn > a:nth-child(2)').click();
    }
});

var content = jsMenu.item({text: '本文のみを見る', onclick: toggleRemoveHeader});
content.style.cssText = 'display: inline-block !important; padding: 3px 5px; border-width: 1px; margin-left: 5px;';
document.querySelector('div.novel_bn').appendChild(content);
function toggleRemoveHeader() {
    localStorage.clearfix = clearfix = clearfix === '0' ? '1' : '0';
    removeHeaderFooter();
}
function removeHeaderFooter() {
    if (clearfix === '1') {
        content.classList.add('jsui-menu-checked');
        document.querySelectorAll('#novel_p, #novel_a').forEach(element => { element.style.display = 'none'} );
    }
    else {
        content.classList.remove('jsui-menu-checked');
        document.querySelectorAll('#novel_p, #novel_a').forEach(element => { element.style.display = 'block'} );
    }
};
removeHeaderFooter();

var manager = jsMenu.menu({
    items: [
        {text: '書庫管理', onclick: openBookShelf},
        {text: 'PDF小説', onclick: openPDFNovel}
    ]
});
manager.style.cssText = 'line-height: 40px; font-weight: bold;';
navi.appendChild(manager);
function openBookShelf() {
    if (!show) {
        bookmark.forEach(fancyTableItem);
        show = true;
    }
    container.style.display = event.target.classList.contains('jsui-menu-checked') ? 'none' : 'block';
    event.target.classList.toggle('jsui-menu-checked');
}
function openPDFNovel() {
    open('https://pdfnovels.net/' + novelcode + '/main.pdf', '_blank');
}

var container = document.createElement('div');
container.className = 'jsui-manager';
container.style.cssText = 'display: none;';

var submenu = jsMenu.menu({
    items: [
        {text: 'NCODE登録', onclick: subscribeCurrentNovel},
        {text: 'NCODE保存', onclick: exportAllNovels},
        {text: 'PDFダウンロード', onclick: downloadAllPDfs},
        {text: '書庫更新', onclick: saveAllChanges, attributes: [{name: 'id', value: 'jsui-save-btn'}]},
        {text: 'ログ表示', onclick: toggleLogging, attributes: [{name: 'id', value: 'jsui-log-btn'}]}
    ]
});
function subscribeCurrentNovel() {
    var book = bookmark.find(book => book.ncode === myncode);
    if (book) {
        myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」は既に書庫に登録しています！');
        validate[book.ncode] = book.title;
    }
    else if (myncode === novelcode) {
        subscribeNcode(novelcode, novelname);
    }
    else {
        validateNcode(myncode);
    }
}
function downloadAllPDfs() {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        bookmarkSyncPreHandler(() => bookmark.forEach(batchDownloadPreHandler));
    }
}
function exportAllNovels() {
    if (confirm('全ての小説のダウンロード情報をエックスポートしますか？')) {
        var json = bookmark.map(book => {
            book.last = timeline;
            container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(timeline);
            return {url: [{url: 'https://pdfnovels.net/' + book.ncode + '/main.pdf'}], name: book.title + '.pdf', language: 'ja'};
        });
        var metalink = metalink4(json);
        var blob = new Blob([metalink], {type: 'application/metalink+xml; charset=utf-8'})
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '小説家になろう書庫-' + new Date().toJSON().slice(0, -2).replace(/[T:\.\-]/g, '_') + '.meta4';
        a.click();
        a.remove();
        saveBookmarkButton();
        alert('情報のエックスポートは無事に成功しました！');
    }
}
function saveAllChanges() {
    GM_setValue('bookmark', bookmark);
    saveBtn.style.cssText = 'display: none !important';
    logWindow.innerHTML = '';
    jsTable.table.style.display = 'block';
}
function toggleLogging(event) {
    jsTable.table.style.display = event.target.classList.contains('jsui-menu-checked') ? 'block' : 'none';
    event.target.classList.toggle('jsui-menu-checked');
}

var saveBtn = submenu.querySelector('#jsui-save-btn');
var logBtn = submenu.querySelector('#jsui-log-btn')
saveBtn.style.cssText = 'display: none !important';

var input = document.createElement('input');
input.addEventListener('change', event => myncode = event.target.value ?? novelcode);

var logWindow = document.createElement('div');
logWindow.className = 'jsui-logging';

submenu.prepend(input);
jsTable.head = ['NCODE', '小説タイトル', '更新間隔', 'ダウンロード'];
container.prepend(submenu, jsTable.table, logWindow);
document.body.appendChild(container);

// ブックマーク表記生成
function fancyTableItem(book, index) {
    var {ncode, title, next, last} = book;
    var mybook = jsTable.add([ncode, title, '', generateTimeFormat(book.last)], [
        event => removeNcodeFromShelf(mybook, index, ncode, title), event => openNcodeInNewPage(ncode, title), event => downloadCurrentNcode(book, title)
    ]);

    var input = document.createElement('input');
    input.type = 'number';
    input.style.width = '16.666666666666667%';
    input.min = '0';
    input.max = '30';
    input.value = next;
    input.title = next === 0 ? 'は更新しないように設定しました！' : 'は ' + next + ' 日間隔で更新するように設定しました！'
    input.addEventListener('change', event => changeNcodeUpdatePeriod(book, ncode, title, event.target.value | 0));

    mybook.childNodes[2].replaceWith(input);
    mybook.id = ncode;
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
function downloadCurrentNcode(book, title) {
    if (confirm(title + ' をダウンロードしますか？')) {
        updateObserver(1, () => batchDownloadPreHandler(book), saveBookmarkButton);
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
    saveBtn.style.display = logBtn.style.display = 'block';
}

// NCODE検証&登録
function validateNcode(ncode) {
    if (validate[ncode]) {
        validate[ncode] === '検証中' ? myFancyPopup('Nコード【' + ncode + '】は既に検証しています、何度もクリックしないでください！') :
        validate[ncode] === 'エラー' ? myFancyPopup('Nコード【' + ncode + '】は存在しないか既にサーバーから削除されています！') :
        subscribeNcode(ncode, validate[ncode]);
        return;
    }
    validate[ncode] = '検証中';
    myFancyPopup('Nコード【' + ncode + '】を検証しています、しばらくお待ちください！');
    GM_xmlhttpRequest({
        url: 'https://ncode.syosetu.com/' + ncode,
        method: 'GET',
        onload: (details) => {
            validate[ncode] = details.responseXML.title;
            subscribeNcode(ncode, validate[ncode]);
        }
    });
}
function subscribeNcode(ncode, title) {
    var book = {ncode, title, last: 0, next: 0};
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    saveBookmarkButton();
    myFancyLog(ncode, title, 'は書庫に登録しました！');
}

// PDF自動更新関連
if (today !== scheduler) {
    bookmarkSyncPreHandler(() => bookmark.forEach(updateFancyBookmark));
    GM_setValue('scheduler', today);
}
function bookmarkSyncPreHandler(start) {
    updateObserver(bookmark.length, () => {
        myFancyPopup('登録した全てのNコードを更新しています！');
        if (typeof start === 'function') {
            start();
        }
    }, () => {
        GM_setValue('bookmark', bookmark);
        myFancyPopup('登録した全てのNコードの更新が完了しました！');
        logWindow.innerHTML = '';
    });
}
function updateObserver(queue, start, end) {
    if (sync) {
        return myFancyPopup('更新スケジュールを処理しています、何度もクリックしないでください！');
    }
    sync = true;
    if (typeof start === 'function') {
        start();
    }
    var observer = setInterval(() => {
        if (session.length === queue) {
            session = [];
            sync = false;
            clearInterval(observer);
            if (typeof end === 'function') {
                end();
            }
        }
    }, 1000);
}
function updateFancyBookmark(book) {
    if (book.next === 0) {
        session.push(book.ncode);
        return myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」は更新しないように設定しています！！');
    }
    var next = book.next - (timeline - book.last) / 86400000;
    if (next > 0) {
        next = next >= 1 ? (next | 0) + '日' : (next * 24 | 0) + '時間';
        myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」は ' + next + ' 後に更新する予定です！');
        session.push(book.ncode);
    }
    else {
        batchDownloadPreHandler(book);
    }
}
function batchDownloadPreHandler(book) {
    if (download[book.ncode] === 'ダウンロード') {
        return myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」はまだ処理しています、しばらくお待ちください！');
    }
    download[book.ncode] = 'ダウンロード';
    myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」のダウンロードを開始しました！');
    GM_xmlhttpRequest({
        url: 'https://pdfnovels.net/' + book.ncode + '/main.pdf',
        method: 'GET',
        responseType: 'blob',
        onload: (details) => {
            if (details.response.type === 'application/pdf') {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(details.response);
                a.download = book.title;
                a.click();
                book.last = timeline;
                container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(timeline);
                myFancyLog(book.ncode, book.title, 'のダウンロードは完了しました！');
                delete download[book.ncode];
                session.push(book.ncode)
            }
            else {
                download[book.ncode] = 'リトライ';
                downloadPDFHandler(book);
            }
        }
    });
}
function downloadPDFHandler(book) {
    myFancyPopup('Nコード【' + book.ncode + '】、「' + book.title + '」の縦書きPDFは只今生成中です、 60秒後に再試行します！');
    var timer = 60;
    var retry = setInterval(() => {
        timer --;
        if (timer === 0) {
            batchDownloadPreHandler(book);
            clearInterval(retry);
        }
    }, 1000);
}

// ログ関連
function myFancyLog(ncode, title, result) {
    if (ncode && title) {
        var html = '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」 <span style="color: violet">' + result + '</span>';
        var message = 'Nコード【' + ncode + '】、「' + title + '」' + result;
    }
    else if (ncode === undefined && title) {
        html = '<span style="color: darkgreen">' + title + '</span> <span style="color: violet">' + result + '</span>';
        message = '「' + title + '」' + result;
    }
    else if (ncode && title === undefined) {
        html = '<span style="color: darkgreen">' + ncode + '</span> <span style="color: violet">' + result + '</span>';
        message = 'Nコード【' + ncode + '】' + result;
    }
    var log = document.createElement('p');
    log.innerHTML = html;
    logWindow.prepend(log);
    myFancyPopup(message);
}
function myFancyPopup(message) {
    jsNotify.popup({message, timeout: 3000});
}
