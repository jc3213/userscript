(function() {
    this.__metalink4 = {
        make: (url, filename) {
            return metaMaker(metaFile({url, filename}));
            
        },
        fromJSON: (json) => {
            var files = Array.isArray(json) ? json.forEach(fileMarker).join('') : fileMarker(json);
            return metaMaker(files);
        }
    }

    function metaFile(filename, url) {
        return '<file name=' + filename + '"><url>' + url + '</url></file>';
    }

    function metaMaker(files) {
        return '<?xml version="1.0" encoding="UTF-8"?><metalink xmlns="urn:ietf:params:xml:ns:metalink">' + files + '</metalink>';
    }
})();
