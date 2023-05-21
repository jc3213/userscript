// ==UserScript==
// @name         jsDelivr link for Github
// @namespace    https://github.com/jc3213/userscript
// @version      0.9
// @description  Add a button to copy jsdelivr link for github files
// @author       jc3213
// @match        https://github.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@7609e22d5506c10182773660667136e9b96fe744/js/nodeobserver.js#sha256-xG7yfLlwtkpejTuRCKVeI7LJPUtx+SvAtnjMhsqnHbM=
// @run-at       document-idle
// ==/UserScript==

var where;
var whatis;
var components;
var jsdelivr;
var button = {};
var observer = new NodeObserver();

new MutationObserver(mutations => {
    if (where !== location.pathname) {
        where = location.pathname;
        components = where.split('/');
        whatis = components[3];
        jsdelivr ='https://cdn.jsdelivr.net/gh/' + components[1] + '/' + components[2] + '@';
        if (whatis === 'blob') {
            jsdelivr += components.slice(4).join('/');
            document.querySelector('script[src*="react-lib"]') ? newCodeView() : oldCodeView();
        }
        else if (whatis === 'commit') {
            jsdelivr += components[4] + '/';
            commitView();
        }
    }
}).observe(document.head, {childList: true});

function newCodeView() {
    button.tagName = 'button';
    button.cssText = 'font-size: 20px; height: 28px;';
    button.className = 'types__StyledButton-sc-ws60qy-0 kbjJSF';
    observer.timeout('.react-blob-header-edit-and-raw-actions').then(findJSDelivrButton);
}

function oldCodeView() {
    button.tagName = 'remote-clipboard-copy';
    button.cssText = 'scale: 1.66;';
    button.className = 'd-inline-block btn-octicon';
    observer.timeout('.BtnGroup + .d-flex > .ml-1 + div').then(createJSDelivrButton);
}

async function commitView() {
    button.tagName = 'clipboard-copy';
    button.cssText = 'scale: 1.92; top: 9px; left: -8px;';
    button.className = 'd-inline-block btn-octicon';
    var files = await observer.timeout('#files');
    files.querySelectorAll('span.Truncate').forEach(commitMenu);
    observer.mutation(files, {tagName: 'DIV'}, file => {
        var menu = file.querySelector('span.Truncate');
        commitMenu(menu);
    });
}

function commitMenu(menu) {
    var button = createJSDelivrButton(menu);
    button.url += button.previousElementSibling.value;
}

function findJSDelivrButton(menu) {
    var copy = menu.querySelector('#copy_jsdelivr');
    if (copy) {
        copy.url = jsdelivr;
    }
    else {
        createJSDelivrButton(menu);
    }
}

function createJSDelivrButton(menu) {
    var {tagName, className, cssText} = button;
    var copy = document.createElement(tagName);
    copy.url = jsdelivr;
    copy.className = className;
    copy.innerText = '🖹';
    copy.id = 'copy_jsdelivr';
    copy.title = 'Copy jsdelivr link';
    copy.style.cssText = 'position: relative; user-select: none; cursor: pointer; ' + cssText;
    copy.addEventListener('mousedown', ({button}) => {
        if (button === 0) {
            navigator.clipboard.writeText(copy.url);
        }
        else if (button === 1) {
            open(copy.url);
        }
    });
    menu.appendChild(copy);
    return copy;
}
