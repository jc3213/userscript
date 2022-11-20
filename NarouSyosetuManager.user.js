// ==UserScript==
// @name         「小説家になろう」 書庫管理
// @namespace    https://github.com/jc3213/userscript
// @version      1.6.1
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        https://ncode.syosetu.com/*
// @match        https://novel18.syosetu.com/*
// @require      https://raw.githubusercontent.com/jc3213/jslib/9b140156a3b2190cf59dc3ff479f4ab61687dfec/ui/menu.js#sha256-1nO5024DhoyaoA4irujLR4ZvhmxeZF8e9uHwspVgvps=
// @require      https://raw.githubusercontent.com/jc3213/jslib/39c093071d6c63d23b190801289cc663b2030e62/ui/table.js#sha256-dBp2g4nHZuDF0G+q6H8L7AEuSuM89+WDdMOeR7mXAg4=
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
var changed = false;
var shelf = false;
var bookmark = GM_getValue('bookmark', []);
var scheduler = GM_getValue('scheduler', today);
var jsMenu = new FlexMenu();
var jsTable = new FlexTable();
var jsNotify = new SimpleNotify();

// UI作成関連
var css = document.createElement('style');
css.innerHTML = `.jsui-menu-item {border-width: 0px;}
.jsui-menu-item:not(.jsui-menu-disabled):active, .jsui-menu-checked {padding: 2px; border-width: 1px;}
.jsui-menu-disabled {padding: 2px;}
.jsui-table, .jsui-logging {height: 560px; margin-top: 5px; overflow-y: auto; margin-bottom: 20px;}
.jsui-table > :nth-child(n+2) > :nth-child(1) {line-height: 44px;}
.jsui-table > * > :not(:nth-child(2)) {flex: none; width: 120px;}
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

var noveltitle = document.querySelector('div.novel_bn');
if (noveltitle) {
    var content = jsMenu.item({text: '本文のみを見る', onclick: toggleRemoveHeader});
    content.style.cssText = 'display: inline-block !important; padding: 3px 5px; border-width: 1px; margin-left: 5px;';
    noveltitle.appendChild(content);
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
}

var manager = jsMenu.menu({
    items: [
        {text: '書庫管理', onclick: openBookShelf},
        {text: 'PDF小説', onclick: openPDFNovel}
    ]
});
manager.style.cssText = 'line-height: 40px; font-weight: bold;';
navi.appendChild(manager);
function openBookShelf() {
    if (shelf === false) {
        bookmark.forEach(fancyTableItem);
        shelf = true;
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
function subscribeNcode(ncode, title) {
    var book = {ncode, title, last: 0, next: 0};
    fancyTableItem(book, bookmark.length);
    bookmark.push(book);
    saveBookmarkButton();
    myFancyLog(ncode, title, 'は書庫に登録しました！');
}
async function subscribeCurrentNovel() {
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
}
function downloadAllPDfs() {
    if (confirm('全ての小説の縦書きPDFをダウンロードしますか？')) {
        if (download.all) {
            return;
        }
        var session = bookmark.map(downloadPDFHelper);
        Promise.all(session).then(array => {
            myFancyPopup('全ての小説の縦書きPDFのダウンロードがかんりょうしました！');
        });
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
    if (changed) {
        GM_setValue('bookmark', bookmark);
        saveBtn.classList.add('jsui-menu-disabled');
        changed = false;
        jsTable.table.style.display = 'block';
    }
}
function toggleLogging(event) {
    jsTable.table.style.display = event.target.classList.contains('jsui-menu-checked') ? 'block' : 'none';
    logBtn.classList.toggle('jsui-menu-checked');
}

var saveBtn = submenu.querySelector('#jsui-save-btn');
var logBtn = submenu.querySelector('#jsui-log-btn')
saveBtn.classList.add('jsui-menu-disabled');

var input = document.createElement('input');
input.addEventListener('change', event => {
    myncode = event.target.value ?? novelcode;
});

var logWindow = document.createElement('div');
logWindow.className = 'jsui-logging';

submenu.prepend(input);
jsTable.head = ['NCODE', '小説タイトル', '更新間隔', 'ダウンロード'];
container.prepend(submenu, jsTable.table, logWindow);
document.body.appendChild(container);

// ブックマーク表記生成
function fancyTableItem(book, index) {
    var {ncode, title, next, last} = book;
    var mybook = jsTable.add([ncode, title, generateTimeFormat(book.last)], [
        event => removeNcodeFromShelf(mybook, index, ncode, title), event => openNcodeInNewPage(ncode, title), event => downloadCurrentNcode(book, title)
    ]);

    var input = document.createElement('input');
    input.type = 'number';
    input.style.width = '126px';
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
        downloadPDFHelper(book).then(result => {
            if (result === 'ok') {
                saveBookmarkButton();
            }
        });
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
    saveBtn.classList.remove('jsui-menu-disabled');
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
        GM_setValue('scheduler', today);
    });
}

// ダウンロード関連
async function downloadPDFHelper(book) {
    var {ncode, title} = book;
    if (download[ncode] === 'ダウンロード') {
        return myFancyPopup('Nコード【' + ncode + '】、「' + title + '」はまだ処理しています、しばらくお待ちください！');
    }
    download[ncode] = 'ダウンロード';
    myFancyPopup('Nコード【' + ncode + '】、「' + title + '」のダウンロードを開始しました！');
    var details = await promisedXMLRequest('https://pdfnovels.net/' + book.ncode + '/main.pdf');
    if (details.response.type === 'application/pdf') {
        var url = URL.createObjectURL(details.response);
        container.querySelector('#' + ncode).lastChild.innerHTML = generateTimeFormat(timeline);
        book.last = timeline;
        delete download[ncode];
        var a = document.createElement('a');
        a.href = url;
        a.download = title;
        a.click();
        return 'ok';
    }
    else {
        download[ncode] = 'リトライ';
        return waitForRetryDownload(book);
    }
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
