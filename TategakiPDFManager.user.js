// ==UserScript==
// @name         縦書きPDF書庫
// @namespace    https://github.com/jc3213/userscript
// @version      18
// @description  「小説家になろう」の小説情報を管理し、縦書きPDFをダウンロードするツールです
// @author       jc3213
// @match        *://ncode.syosetu.com/n*
// @match        *://novel18.syosetu.com/n*
// @connect      pdfnovels.net
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_webRequest
// @webRequest   [ {"selector": "*.microad.net/*", "action": "cancel"}, {"selector": "*.microad.jp/*", "action": "cancel"} ]
// ==/UserScript==

'use strict';
var novelist = {ncode: location.pathname.match(/n\w{4,}/g), title: document.title, now: Date.now()};
novelist.myncode = novelist.ncode = novelist.ncode.pop();
var validate = {};
var download = {};
var session = {};
var worker = false;
var bookmark = GM_getValue('bookmark', {});
var scheduler = GM_getValue('scheduler', novelist.now);

// UI作成関連
var css = document.createElement('style');
css.innerHTML = '.manager-button {background-color: #FFF; padding: 5px; border: 1px outset #000 ; user-select: none ; z-index: 3213; display: inline-block; font-weight: bold; cursor: pointer;}\
.manager-button:hover {filter: opacity(60%);}\
.manager-button:active {filter: opacity(30%);}\
.manager-checked {padding: 4px; border: 2px inset #00F;}\
.manager-container {position: fixed; top: 47px; left: calc((100% - 880px) / 2); background-color: #FFF; padding: 10px; z-index: 3213; border: 1px solid #CCC; width: 880px; height: 600px;}\
.manager-container > span, .manager-container > input {margin-left: 5px;}\
.manager-container > div {padding: 5px; margin-top: 5px;}\
.manager-shelf, .manager-logs {overflow-y: scroll; height: 552px;}\
.manager-shelf div:nth-child(2n+1) {background-color: #DDD;}\
.manager-shelf span {height: 40px; text-align: center; vertical-align: middle; display: inline-block; padding: 5px;}\
.manager-shelf input {width: 50px;}\
.manager-shelf span:nth-child(1) {width: 80px; margin-top: 15px; cursor: pointer;}\
.manager-shelf span:nth-child(2) {width: 460px; overflow-y: hidden; text-align: left; cursor: pointer;}\
.manager-shelf span:nth-child(3) {width: 90px; margin-top: 15px;}\
.manager-shelf span:nth-child(4) {width: 180px; overflow-y: hidden; cursor: pointer;}\
.manager-shelf div:nth-child(1) span {height: 20px; overflow-y: hidden; text-align: center; margin: 0px; cursor: default;}\
.manager-shelf div:nth-child(n+2) span:hover {filter: opacity(60%);}\
.manager-shelf div:nth-child(n+2) span:active {filter: opacity(30%);}\
.fancylog {font-size: 16px;}\
.notification {position: fixed; width: fit-content; border-radius: 5px; border: 1px solid #000;}';
document.head.appendChild(css);

var manager = document.createElement('span');
manager.innerHTML = '書庫管理';
manager.className = 'manager-button';
manager.style.cssText = 'margin: 10px 5px;'
manager.addEventListener('click', (event) => {
    if (manager.classList.contains('manager-checked')) {
        container.style.display = 'none';
    }
    else {
        container.style.display = 'block';
    }
    manager.classList.toggle('manager-checked');
});
document.getElementById('head_nav').appendChild(manager);

var container = document.createElement('div');
container.className = 'manager-container';
container.style.cssText = 'display: none;';
document.body.appendChild(container);

var subscribe = document.createElement('span');
subscribe.innerHTML = 'NCODE登録';
subscribe.className = 'manager-button';
subscribe.addEventListener('click', (event) => {
    if (bookmark[novelist.myncode]) {
        myFancyPopup(novelist.myncode, bookmark[novelist.myncode].title, 'は既に書庫に登録しています！');
    }
    else if (novelist.myncode === novelist.ncode) {
        subscribeNcode(novelist.ncode, novelist.title);
    }
    else {
        validateNcode(novelist.myncode);
    }
});
container.appendChild(subscribe);
// NCODE検証&登録
function validateNcode(ncode) {
    if (validate[ncode] === '検証中') {
        return myFancyPopup('', 'Nコード' + ncode, 'は既に検証しています、何度もクリックしないでください！');
    }
    if (validate[ncode]) {
        return validNcodeResponse(ncode, validate[ncode]);
    }
    validate[ncode] = '検証中';
    myFancyLog('', 'Nコード' + ncode, 'を検証しています、しばらくお待ちください！', true)
    GM_xmlhttpRequest({
        url: 'https://ncode.syosetu.com/' + ncode,
        method: 'GET',
        onload: (details) => {
            validate[ncode] = details.responseXML.title;
            validNcodeResponse(ncode, validate[ncode]);
        }
    });
}
function validNcodeResponse(ncode, title) {
    if (title === 'エラー') {
        myFancyLog('', 'Nコード' + ncode, 'は存在しないか既にサーバーから削除されています！', true);
    }
    else {
        subscribeNcode(ncode, title);
    }
}
function subscribeNcode(ncode, title) {
    bookmark[ncode] = {
        title: title,
        last: 0,
        next: 3
    }
    GM_setValue('bookmark', bookmark);
    fancyTableItem(ncode, bookmark[ncode]);
    myFancyLog(ncode, title, 'は書庫に登録しました！', true);
}

var ncodeBox = document.createElement('input');
ncodeBox.style.cssText = 'padding: 6px; font-size: 16px;';
ncodeBox.addEventListener('change', (event) => { novelist.myncode = event.target.value || novelist.ncode; });
container.appendChild(ncodeBox);

var update = document.createElement('span');
update.innerHTML = 'NCODE一括更新';
update.className = 'manager-button';
update.addEventListener('click', bookmarkSyncPreHandler);
container.appendChild(update);

var openlog = document.createElement('span');
openlog.innerHTML = 'ログ表示';
openlog.className = 'manager-button';
openlog.addEventListener('click', (event) => {
    if (openlog.classList.contains('manager-checked')) {
        fancylog.style.display = 'none';
        shelf.style.display = 'block';
    }
    else {
        fancylog.style.display = 'block';
        shelf.style.display = 'none';
    }
    openlog.classList.toggle('manager-checked');
});
container.appendChild(openlog);

var fancylog = document.createElement('div');
fancylog.className = 'manager-logs';
fancylog.style.cssText = 'display: none;';
container.appendChild(fancylog);

var shelf = document.createElement('div');
shelf.className = 'manager-shelf';
container.appendChild(shelf);

var head = document.createElement('div');
head.style.cssText = 'background-color: #000; color: #FFF;';
head.innerHTML = '<span>NCODE</span><span>小説タイトル</span><span>更新間隔</span><span>ダウンロード</span>';
shelf.appendChild(head);

// ブックマーク表記生成
Object.entries(bookmark).forEach(item => fancyTablePreHandler(...item));
function fancyTablePreHandler(ncode, book) {
    if (document.getElementById(ncode)) {
        document.getElementById(ncode + '-next').value = book.next;
        document.getElementById(ncode + '-update').innerHTML = book.last;
    }
    else {
        fancyTableItem(ncode, book)
    }
}
function fancyTableItem(ncode, book) {
    var box = makeFancyItem(shelf, {'tag': 'div', 'attr': {'id': ncode}});
    makeFancyItem(box, {'tag': 'span', 'title': 'NCODEを書庫から削除します', 'html': ncode, 'click': (event) => removeNcodeFromLibrary(ncode, book.title)});
    makeFancyItem(box, {'tag': 'span', 'title': '小説のウェブページを開きます', 'html': book.title, 'click': (event) => openNovelPage(ncode, book.title)});
    var item3 = makeFancyItem(box, {'tag': 'span', 'title': '更新間隔を' + book.next + '日に設定します'});
    makeFancyItem(item3, {'tag': 'input', 'change': (event) => updatePeriodHandler(event, item3, ncode, book.title), 'attr': {'id': ncode + '-next', 'value': book.next}});
    makeFancyItem(box, {'tag': 'span', 'title': '縦書きPDFの更新をチェックします', 'html': new Date(book.last), 'click': (event) => updateTategakiPDF(ncode, book.title), 'attr': {'id': ncode + '-update'}});
}
function makeFancyItem(box, props) {
    var tag = document.createElement(props.tag);
    if (props.title) {
        tag.title = props.title;
    }
    if (props.html) {
        tag.innerHTML = props.html;
    }
    if (props.click) {
        tag.addEventListener('click', props.click);
    }
    if (props.change) {
        tag.addEventListener('change', props.change);
    }
    if (props.attr) {
        Object.entries(props.attr).forEach(item => { tag[item[0]] = item[1] });
    }
    box.appendChild(tag);
    return tag;
}
// ブックマーク事件処理
function removeNcodeFromLibrary(ncode, title) {
    if (confirm('【 ' + title + ' 】を書庫から削除しますか？')) {
        document.getElementById(ncode).remove();
        delete bookmark[ncode];
        GM_setValue('bookmark', bookmark);
        myFancyLog(ncode, title, 'は書庫から削除しました！', true);
    }
}
function openNovelPage(ncode, title) {
    if (confirm('小説【 ' + title + ' 】を開きますか？')) {
        open('https://ncode.syosetu.com/' + ncode + '/', '_blank')
    }
}
function updatePeriodHandler(event, node, ncode, title) {
    var value = event.target.value.match(/\d+/)[0];
    node.title = '更新間隔を' + value + '日に設定します';
    bookmark[ncode].next = value;
    GM_setValue('bookmark', bookmark);
    myFancyPopup(ncode, title, 'は ' + value + ' 日置きに更新します！');
}
function updateTategakiPDF(ncode, title) {
    if (confirm(title + ' をダウンロードしますか？')) {
        updateObserver(1);
        batchDownloadPreHandler(ncode, title);
    }
}

// PDF自動更新関連
if (novelist.now >= scheduler) {
    bookmarkSyncPreHandler();
}
function bookmarkSyncPreHandler() {
    if (worker) {
        return myFancyPopup('', '', '更新スケジュールを処理しています、何度もクリックしないでください！');
    }
    worker = true;
    myFancyPopup('', '登録した全てのNコード', 'を更新しています！');
    updateObserver(Object.keys(bookmark).length, () => {
        worker = false;
        GM_setValue('scheduler', Date.now() + 14400000);
        myFancyPopup('', '登録した全てのNコード', 'の更新が完了しました！');
    });
    Object.keys(bookmark).forEach(item => updateFancyBookmark(item));
}
function updateObserver(worker, callback) {
    var observer = setInterval(() => {
        if (Object.keys(session).length === worker) {
            if (typeof callback === 'function') {
                callback();
            }
            session = {};
            GM_setValue('bookmark', bookmark);
            clearInterval(observer);
        }
    }, 1000);
}
function updateFancyBookmark(ncode) {
    // パッチ
    delete bookmark[ncode].hash;
    //
    var next = bookmark[ncode].next - (novelist.now - bookmark[ncode].last) / 86400000;
    if (next > 0) {
        next = next >= 1 ? (next | 0) + '日' : (next * 24 | 0) + '時間';
        myFancyLog(ncode, bookmark[ncode].title, 'は <b>' + next + '</b> 後に更新する予定です！');
        session[ncode] = 'のち更新';
    }
    else {
        batchDownloadPreHandler(ncode);
    }
}
function batchDownloadPreHandler(ncode) {
    if (download[ncode] === 'ダウンロード') {
        return myFancyPopup(ncode, bookmark[ncode].title, 'はまだ処理しています、しばらくお待ちください！');
    }
    download[ncode] = 'ダウンロード';
    myFancyLog(ncode, bookmark[ncode].title, 'のダウンロードを開始しました！', true);
    GM_xmlhttpRequest({
        url: 'https://pdfnovels.net/' + ncode + '/main.pdf',
        method: 'GET',
        responseType: 'blob',
        onload: (details) => {
            if (details.response.type === 'application/pdf') {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(details.response);
                a.download = bookmark[ncode].title;
                a.click();
                bookmark[ncode].last = novelist.now;
                document.getElementById(ncode + '-update').innerHTML = new Date(novelist.now);
                myFancyLog(ncode, bookmark[ncode].title, 'のダウンロードは完了しました！', true);
                delete download[ncode];
                session[ncode] = '完了';
            }
            else {
                downloadPDFHandler(ncode);
            }
        }
    });
}
function downloadPDFHandler(ncode) {
    myFancyPopup(ncode, bookmark[ncode].title, 'の縦書きPDFは只今生成中です、 60秒後に再試行します！');
    var timer = 60;
    var retry = setInterval(() => {
        timer.html --;
        if (timer === 0) {
            delete download[ncode];
            batchDownloadPreHandler(ncode);
            clearInterval(retry);
        }
    }, 1000);
}

// ログ関連
function myFancyLog(ncode, title, result, popup) {
    var html = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    var log = document.createElement('p');
    log.className = 'fancylog';
    log.innerHTML = html;
    fancylog.prepend(log);
    if (popup === true) {
        myFancyPopup(ncode, title, result);
    }
}
function myFancyPopup(ncode, title, result) {
    var html = myFancyNcode(ncode, title) + ' <span style="color: violet">' + result + '</span>';
    var popup = document.createElement('div');
    popup.innerHTML = html;
    popup.className = 'notification fancylog manager-container';
    popup.style.height = 'fit-content';
    popup.addEventListener('click', (event) => removePopup(popup));
    document.body.appendChild(popup);
    alignFancyPopup();
    setTimeout(() => removePopup(popup), 5000);
}
function myFancyNcode(ncode, title) {
    if (ncode && title) {
        return '「<span style="color: darkgreen" title="Nコード【' + ncode + '】">' + title + '</span>」';
    }
    if (!ncode && title) {
        return '<span style="color: darkgreen">' + title + '</span>';
    }
    if (ncode && !title) {
        return '<span style="color: darkgreen">' + ncode + '</span>';
    }
    return '';
}
function alignFancyPopup() {
    document.querySelectorAll('.notification').forEach((element, index) => {
        element.style.top = (element.offsetHeight + 5) * index + 10 + 'px';
        element.style.left = (screen.availWidth - element.offsetWidth) / 2 + 'px';
    });
}
function removePopup(popup) {
    popup.remove()
    alignFancyPopup();
}
