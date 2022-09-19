// ==UserScript==
// @name         小説家になろう 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      5.2
// @description  小説家になろう の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        *://ncode.syosetu.com/n*
// @match        *://novel18.syosetu.com/n*
// @require      https://raw.githubusercontent.com/jc3213/jsui/main/src/menu.js#sha256-4uEnJMWpOGBw8mlVCtlVfGWKeofIQaSphaTV6KkP/FI=
// @require      https://raw.githubusercontent.com/jc3213/jsui/main/src/table.js#sha256-wxnfVu13CEdSl0RlAjyJg44EUyjGLjY8kOJkuET29Ag=
// @require      https://raw.githubusercontent.com/jc3213/metalink4.js/main/src/metalink4_0.2.0.js#sha256-rZ1X/YrJghSCBAxFdbk/qBJf85/p6TzWL3FWUeiA7gc=
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   {"selector": "*.microad.net/*", "action": "cancel"}
// @webRequest   {"selector": "*.microad.jp/*", "action": "cancel"}
// ==/UserScript==

'use strict';
var novelist = {ncode: /n\d+\w+/g.exec(location.pathname), title: document.title, now: Date.now(), today: new Date().getFullYear() + new Date().getMonth() + new Date().getDate()};
novelist.myncode = novelist.ncode = novelist.ncode.pop();
var validate = {};
var download = {};
var session = [];
var sync = false;
var show = false;
var log = false;
var bookmark = GM_getValue('bookmark', []);
var scheduler = GM_getValue('scheduler', novelist.today);
var jsMenu = new JSUI_Menu();
var jsTable = new JSUI_Table(['NCODE', '小説タイトル', '更新間隔', 'ダウンロード']);

// UI作成関連
var css = document.createElement('style');
css.innerHTML = '.jsui_menu_btn {display: block !important; padding: 5px !important;}\
.jsui_btn_checked {padding: 4px !important; border: 1px inset #00F;}\
.jsui_table, .jsui_logging {height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 10px;}\
.jsui_table > * > *:nth-child(2) {flex: 3;}\
.jsui_manager {position: fixed; top: 47px; left: calc(50% - 440px); background-color: #fff; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px; overflow: hidden;}\
.jsui_notify {width: fit-content; border-radius: 5px; border: 1px solid #000; background-color: #fff; z-index: 55555; padding: 10px; margin: 0px auto 5px !important;}';

var notify = document.createElement('div');
notify.style.cssText = 'position: absolute; top: 20px; left: 0px; width: 100%; z-index: 999999;';

document.body.append(notify, css);

var navi = document.querySelector('#head_nav');
var navi_inner = navi.querySelector('li:last-child');

var manager = jsMenu.menu([
    {label: '書庫管理', onclick: openBookShelf},
    {label: 'PDF小説', onclick: openPDFNovel}
]);
manager.style.cssText = 'line-height: 40px; font-weight: bold;';
function openBookShelf() {
    if (!show) {
        bookmark.forEach(fancyTableItem);
        show = true;
    }
    container.style.display = event.target.classList.contains('jsui_btn_checked') ? 'none' : 'block';
    event.target.classList.toggle('jsui_btn_checked');
}
function openPDFNovel() {
    open('https://pdfnovels.net/' + novelist.ncode + '/main.pdf', '_blank');
}
if (navi) {
    navi.appendChild(manager);
}

var container = document.createElement('div');
container.className = 'jsui_manager';
container.style.cssText = 'display: none;';

var submenu = jsMenu.menu([
    {label: 'NCODE登録', onclick: subscribeCurrentNovel},
    {label: 'NCODE更新', onclick: updateAllNovels},
    {label: 'NCODE保存', onclick: exportAllNovels},
    {label: '書庫更新', onclick: saveAllChanges},
    {label: 'ログ表示', onclick: toggleLogging}
]);
function subscribeCurrentNovel() {
    var book = bookmark.find(book => book.ncode === novelist.myncode);
    if (book) {
        myFancyPopup(book.ncode, book.title, 'は既に書庫に登録しています！');
        validate[book.ncode] = book.title;
    }
    else if (novelist.myncode === novelist.ncode) {
        subscribeNcode(novelist.ncode, novelist.title);
    }
    else {
        validateNcode(novelist.myncode);
    }
}
function updateAllNovels() {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        bookmarkSyncPreHandler(() => bookmark.forEach(batchDownloadPreHandler));
    }
}
function exportAllNovels() {
    if (confirm('全ての小説のダウンロード情報をエックスポートしますか？')) {
        var json = bookmark.map(book => {
            book.last = novelist.now;
            container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(novelist.now);
            return {url: [{url: 'https://pdfnovels.net/' + book.ncode + '/main.pdf'}], name: book.title + '.pdf', language: 'ja'};
        });
        new Metalink4(json).saveAs('小説家になろう書庫');
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
    jsTable.table.style.display = event.target.classList.contains('jsui_btn_checked') ? 'block' : 'none';
    event.target.classList.toggle('jsui_btn_checked');
}

var saveBtn = submenu.childNodes[3];
var logBtn = submenu.childNodes[4];
saveBtn.style.cssText = 'display: none !important';

var input = document.createElement('input');
input.addEventListener('change', event => novelist.myncode = event.target.value ?? novelist.ncode);

var logWindow = document.createElement('div');
logWindow.className = 'jsui_logging';

submenu.prepend(input);
container.prepend(submenu, jsTable.table, logWindow);
document.body.appendChild(container);

// ブックマーク表記生成
function fancyTableItem(book, index) {
    var {ncode, title, next, last} = book;
    var mybook = jsTable.add([
        {label: ncode, onclick: event => removeNcodeFromShelf(mybook, index, ncode, title)},
        {label: title, onclick: event => openNcodeInNewPage(ncode, title)},
        {label: generateTimeFormat(book.last), onclick: event => downloadCurrentNcode(book, title)}
    ]);

    var input = document.createElement('input');
    input.type = 'number';
    input.style.width = '16.666666666666667%';
    input.min = '0';
    input.max = '30';
    input.value = next;
    input.title = next === 0 ? 'は更新しないように設定しました！' : 'は ' + next + ' 日間隔で更新するように設定しました！'
    input.addEventListener('change', event => changeNcodeUpdatePeriod(book, ncode, title, event.target.value | 0));

    mybook.lastChild.before(input);
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
        validate[ncode] === '検証中' ? myFancyPopup('', 'Nコード' + ncode, 'は既に検証しています、何度もクリックしないでください！') :
        validate[ncode] === 'エラー' ? myFancyPopup('', 'Nコード' + ncode, 'は存在しないか既にサーバーから削除されています！') :
        subscribeNcode(ncode, validate[ncode]);
        return;
    }
    validate[ncode] = '検証中';
    myFancyPopup('', 'Nコード' + ncode, 'を検証しています、しばらくお待ちください！');
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
if (novelist.today !== scheduler) {
    bookmarkSyncPreHandler(() => bookmark.forEach(updateFancyBookmark));
    GM_setValue('scheduler', novelist.today);
}
function bookmarkSyncPreHandler(start) {
    updateObserver(bookmark.length, () => {
        myFancyPopup('', '登録した全てのNコード', 'を更新しています！');
        if (typeof start === 'function') {
            start();
        }
    }, () => {
        GM_setValue('bookmark', bookmark);
        myFancyPopup('', '登録した全てのNコード', 'の更新が完了しました！');
        logWindow.innerHTML = '';
    });
}
function updateObserver(queue, start, end) {
    if (sync) {
        return myFancyPopup('', '', '更新スケジュールを処理しています、何度もクリックしないでください！');
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
        return myFancyPopup(book.ncode, book.title, 'は更新しないように設定しています！！');
    }
    var next = book.next - (novelist.now - book.last) / 86400000;
    if (next > 0) {
        next = next >= 1 ? (next | 0) + '日' : (next * 24 | 0) + '時間';
        myFancyPopup(book.ncode, book.title, 'は <b>' + next + '</b> 後に更新する予定です！');
        session.push(book.ncode);
    }
    else {
        batchDownloadPreHandler(book);
    }
}
function batchDownloadPreHandler(book) {
    if (download[book.ncode] === 'ダウンロード') {
        return myFancyPopup(book.ncode, book.title, 'はまだ処理しています、しばらくお待ちください！');
    }
    download[book.ncode] = 'ダウンロード';
    myFancyPopup(book.ncode, book.title, 'のダウンロードを開始しました！');
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
                book.last = novelist.now;
                container.querySelector('#' + book.ncode).lastChild.innerHTML = generateTimeFormat(novelist.now);
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
    myFancyPopup(book.ncode, book.title, 'の縦書きPDFは只今生成中です、 60秒後に再試行します！');
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
    var html = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    var log = document.createElement('p');
    log.innerHTML = html;
    logWindow.prepend(log);
    myFancyPopup(ncode, title, result);
}
function myFancyPopup(ncode, title, result) {
    var popup = document.createElement('div');
    popup.innerHTML = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    popup.className = 'jsui_notify';
    popup.addEventListener('click', event => popup.remove());
    notify.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
}
function myFancyNcode(ncode, title) {
    return ncode && title ? '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」' :
        !ncode && title ? '<span style="color: darkgreen">' + title + '</span>' :
    ncode && !title ? '<span style="color: darkgreen">' + ncode + '</span>' : '';
}
