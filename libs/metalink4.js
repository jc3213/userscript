(function() {
    this.toMetalink4 = i => {
        var a = ['<?xml version="1.0" encoding="UTF-8"?>', '<metalink xmlns="urn:ietf:params:xml:ns:metalink">', ...i.map(m), '</metalink>'];
        var b = new Blob(a, {type: 'application/metalink+xml; charset=utf-8'});
        return { binary: a, text: a.join(''), blob: b, saveAs: n => s(b, n) };
    }

    function s(b, n = 'metalink') {
        var s = document.createElement('a');
        s.href = URL.createObjectURL(b);
        s.download = n + '-' + new Date().toJSON().slice(0, -2).replace(/[T:\.\-]/g, '') + '.meta4';
        s.click();
        s.remove();
    }

    function m({name, size, version, locale, hash, url, metaurl}) {
        var f = name ? '<file name="' + name + '">' : '<file>';
        if (size) { f += '<size>' + size + '</size>'; }
        if (version) { f += '<version>' + version + '</version>'; }
        if (locale) { f += '<language>' + locale + '</language>'; }
        if (hash) { hash.forEach(h => { f += '<hash type="' + h[0] + '">' + h[1] + '</hash>'; }); }
        url.forEach(u => { f += Array.isArray(u) ? '<url location="' + u[0] + '">' + u[1] + '</url>' : '<url>' + u + '</url>'; });
        if (metaurl) { metaurl.forEach(m => { f += '<metaurl metatype="' + m[0] + '">' + m[1] + '</metaurl>'; }); }
        return f += '</file>';
    }
})();
