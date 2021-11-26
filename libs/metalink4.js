(function() {
    this.saveAsMetalink = (i, f, n) => fileSaver(i.constructor.name === 'Blob' ? i : n ? makeBlob(i, f) : __b(i), n ? n : f ? f : 'new_metalink');

    function fileSaver(b, n) {
        var saver = document.createElement('a');
        saver.href = URL.createObjectURL(b);
        saver.download = n + '-' + new Date().toLocaleString('ja').replace(/[\/\s:]/g, '_') + '.meta4';
        saver.click();
        saver.remove();
    }

    function metalink(i, f) {
        return '<file' + (f ? ' name="' + f + '"' : '') + '><url>' + i + '</url></file>';
    }

    function makeBlob(i, f) {
        return new Blob(['<?xml version="1.0" encoding="UTF-8"?><metalink xmlns="urn:ietf:params:xml:ns:metalink">', (f ? metalink(i, f) : i.constructor.name === 'Array' ? i.map(e => metalink(e.url, e.filename)).join('') : metalink(i.url, i.filename)), '</metalink>'], {type: 'application/metalink+xml; charset=utf-8'});
    }
})();
