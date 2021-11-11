(function() {
    this.__metalink4 = (i, f, n) => {
        var blob = i.constructor.name === 'Blob' ? i : new Blob([metaMaker(
             i.constructor.name === 'Object' ? metaFile(i) : i.constructor.name === 'Array' ? i.map(metaFile).join('') : metaFile({url: i, filename: f})
        )], {type: 'application/metalink+xml; charset=utf-8'});
        var filename = (n ? n : f) ?? 'new_metalink';
        var saver = document.createElement('a');
        saver.href = URL.createObjectURL(blob);
        saver.download = filename + '-' + new Date().toLocaleString('ja').replace(/[\/\s:]/g, '_') + '.meta4';
        saver.click();
        saver.remove();
    }

    function metaFile({url, filename}) {
        return '<file' + (filename ? ' name="' + filename + '"' : '') + '><url>' + url + '</url></file>';
    }

    function metaMaker(files) {
        return '<?xml version="1.0" encoding="UTF-8"?><metalink xmlns="urn:ietf:params:xml:ns:metalink">' + files + '</metalink>';
    }
})();
