(function() {
    this.__metalink4 = {
        make: (url, filename) => {
            var file = metaFile({url, filename});
            return metaMaker(file);
        },
        fromJSON: (json) => {
            var files = Array.isArray(json) ? json.map(metaFile).join('') : metaFile(json);
            return metaMaker(files);
        },
        save: (meta) => {
            var blob = new Blob([meta], {type: 'application/metalink+xml; charset=utf-8'});
            var saver = document.createElement('a');
            saver.href = URL.createObjectURL(blob);
            saver.download = 'new_metalink-' + new Date().toLocaleString('ja').replace(/[\/\s:]/g, '_') + '.meta4';
            saver.click();
            saver.remove();
        }
    }

    function metaFile({url, filename}) {
        return '<file name="' + filename + '"><url>' + url + '</url></file>';
    }

    function metaMaker(files) {
        return '<?xml version="1.0" encoding="UTF-8"?><metalink xmlns="urn:ietf:params:xml:ns:metalink">' + files + '</metalink>';
    }
})();
