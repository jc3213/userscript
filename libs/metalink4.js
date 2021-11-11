(function() {
    this.__metalink4 = (i, f, n) => {
        var blob = i.constructor.name === 'Blob' ? i : n ? __b(i, f) : __b(i);
        var filename = (n ? n : f) ?? 'new_metalink';
        var saver = document.createElement('a');
        saver.href = URL.createObjectURL(blob);
        saver.download = filename + '-' + new Date().toLocaleString('ja').replace(/[\/\s:]/g, '_') + '.meta4';
        saver.click();
        saver.remove();
    }

    function __m(i, f) {
        return '<file' + (f ? ' name="' + f + '"' : '') + '><url>' + i + '</url></file>';
    }

    function __b(i, f) {
        var file = f ? __m(i, f) : i.constructor.name === 'Array' ? i.map(e => __m(e.url, e.filename)).join('') : __m(i.url, i.filename);
        var meta = '<?xml version="1.0" encoding="UTF-8"?><metalink xmlns="urn:ietf:params:xml:ns:metalink">' + file + '</metalink>';
        return new Blob([meta], {type: 'application/metalink+xml; charset=utf-8'});
    }
})();
