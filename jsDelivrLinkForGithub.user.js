// ==UserScript==
// @name         jsDelivr link for Github
// @namespace    https://github.com/jc3213/userscript
// @version      0.6.0
// @description  Add a button to copy jsdelivr link for github files
// @author       jc3213
// @match        https://github.com/*
// @require      https://cdn.jsdelivr.net/gh/jc3213/jslib@ceaca1a2060344909a408a1e157e3cd23e4dbfe0/js/nodeobserver.js#sha256-R3ptp1LZaBZu70+IAJ9KX1CJ7BN4wyrANtHb48wlROc=
// @run-at       document-idle
// ==/UserScript==

var where;
var whatis;
var components;
var className;
var cssText;
var jsdelivr;

new MutationObserver(mutations => {
    if (where !== location.pathname) {
        where = location.pathname;
        components = where.split('/');
        whatis = components[3];
        if (whatis === 'blob') {
            jsdelivr = 'https://cdn.jsdelivr.net/gh/' + components[1] + '/' + components[2] + '@' + components.slice(4).join('/');
            document.querySelector('react-app') ? newCodeSearchAndCodeView() : oldCodeSearchAndCodeView();
        }
        else if (whatis === 'commit') {
            commitView();
        }
    }
}).observe(document.head, {childList: true});

function newCodeSearchAndCodeView() {
    cssText = 'font-size: 20px; height: 28px; width: 28px;';
    className = 'types__StyledButton-sc-ws60qy-0 dCpkrR';
    newNodeTimeoutObserver('div.Box-sc-g0xbh4-0.kSGBPx').then(createJSDelivrButton);
}

function oldCodeSearchAndCodeView() {
    cssText = 'scale: 1.66;';
    className = 'd-inline-block btn-octicon';
    newNodeTimeoutObserver('[data-target="readme-toc.content"] .BtnGroup + .d-flex > :nth-child(2)').then(createJSDelivrButton);
}

function commitView() {
    jsdelivr = 'https://cdn.jsdelivr.net/gh/' + components[1] + '/' + components[2] + '@' + components[4] + '/';
    cssText = 'scale: 1.92; top: 9px; left: -8px;';
    className = 'd-inline-block btn-octicon';
    newNodeTimeoutObserver('div.js-diff-progressive-container').then(async files => {
        files.querySelectorAll('span.Truncate').forEach(createJSDelivrButton);
    });
}

function createJSDelivrButton(menu) {
    var copy = document.createElement('div');
    if (whatis === 'blob') {
        copy.url = jsdelivr;
    }
    else if (whatis === 'commit') {
        copy.url = jsdelivr + menu.querySelector('a').title;
    }
    copy.className = className;
    copy.innerText = '🖹';
    copy.title = 'Copy jsdelivr link'
    copy.style.cssText = 'position: relative; user-select: none; cursor: pointer; ' + cssText;
    copy.addEventListener('mousedown', ({button}) => {
        if (button === 0) {
            navigator.clipboard.writeText(copy.url);
        }
        else if (button === 1) {
            open(copy.url);
        }
    });
    menu.appendChild(copy)
}
