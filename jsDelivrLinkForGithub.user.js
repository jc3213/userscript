// ==UserScript==
// @name         jsDelivr link for Github
// @namespace    https://github.com/jc3213/userscript
// @version      0.8.1
// @description  Add a button to copy jsdelivr link for github files
// @author       jc3213
// @match        https://github.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @run-at       document-idle
// ==/UserScript==

var where;
var whatis;
var components;
var jsdelivr;
var tagName;
var cssText;
var className;

new MutationObserver(mutations => {
    if (where !== location.pathname) {
        where = location.pathname;
        components = where.split('/');
        whatis = components[3];
        jsdelivr ='https://cdn.jsdelivr.net/gh/' + components[1] + '/' + components[2] + '@';
        if (whatis === 'blob') {
            jsdelivr += components.slice(4).join('/');
            document.querySelector('script[src*="react-lib"]') ? newCodeSearchAndCodeView() : oldCodeSearchAndCodeView();
        }
        else if (whatis === 'commit') {
            jsdelivr += components[4] + '/';
            commitView();
        }
    }
}).observe(document.head, {childList: true});

function newCodeSearchAndCodeView() {
    tagName = 'button';
    cssText = 'font-size: 20px; height: 28px;';
    className = 'types__StyledButton-sc-ws60qy-0 kbjJSF';
    newNodeTimeoutObserver('.react-blob-header-edit-and-raw-actions').then(findJSDelivrButton);
}

function oldCodeSearchAndCodeView() {
    tagName = 'remote-clipboard-copy';
    cssText = 'scale: 1.66;';
    className = 'd-inline-block btn-octicon';
    newNodeTimeoutObserver('.BtnGroup + .d-flex > .ml-1 + div').then(createJSDelivrButton);
}

function commitView() {
    tagName = 'clipboard-copy';
    cssText = 'scale: 1.92; top: 9px; left: -8px;';
    className = 'd-inline-block btn-octicon';
    newNodeTimeoutObserver('div.js-diff-progressive-container').then(async files => {
        files.querySelectorAll('span.Truncate').forEach(menu => {
            var button = createJSDelivrButton(menu);
            button.url += button.previousElementSibling.value;
        });
    });
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
