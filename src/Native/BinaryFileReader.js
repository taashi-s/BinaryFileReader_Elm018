var _user$project$Native_BinaryFileReader = function () {

    var scheduler = _elm_lang$core$Native_Scheduler;
    var res

    function useReader(method, fileObjectToRead) {
        return scheduler.nativeBinding(function (callback) {

            /*
             * Test for existence of FileRader using
             * if(window.FileReader) { ...
             * http://caniuse.com/#search=filereader
             * main gap is IE10 and 11 which do not support readAsBinaryFile
             * but we do not use this API either as it is deprecated
             */
            var reader = new FileReader();

            reader.onload = function (evt) {
                /*
                var arr = reader.result.split(',')
                var mime = arr[0].match(/:(.*?);/)[1]
                var bstr = atob(arr[1])
                var n = bstr.length
                var u8arr = new Uint8Array(n);
                while (n--) { u8arr[n] = bstr.charCodeAt(n); }
                var file = new Blob([u8arr], { type: mime });
                //*/

                if (method == "readAsArrayBuffer") {
                    res = reader.result
                }
                ///*
                return callback(
                    scheduler.succeed(
                        _elm_lang$core$Native_Utils.Tuple2(fileObjectToRead.lastModifiedDate,
                            //evt.target.result)
                            //file)
                            reader.result)
                    )
                );
                //*/

                // scheduler.succeed(evt.target.result));
            };

            reader.onerror = function () {
                return callback(scheduler.fail({ ctor: 'ReadFail' }));
            };

            // Error if not passed an objectToRead or if it is not a Blob
            if (!fileObjectToRead || !(fileObjectToRead instanceof Blob)) {
                return callback(scheduler.fail({ ctor: 'NoValidBlob' }));
            }

            return reader[method](fileObjectToRead);
        });
    }

    // readAsTextFile : Value -> Task error String
    var readAsTextFile = function (fileObjectToRead) {
        return useReader("readAsText", fileObjectToRead);
    };

    // readAsArrayBuffer : Value -> Task error String
    var readAsArrayBuffer = function (fileObjectToRead) {
        return useReader("readAsArrayBuffer", fileObjectToRead);
    };

    // readAsDataUrl : Value -> Task error String
    var readAsDataUrl = function (fileObjectToRead) {
        return useReader("readAsDataURL", fileObjectToRead);
    };

    var readAsBinaryString = function (fileObjectToRead) {
        return useReader("readAsBinaryString", fileObjectToRead);
    };

    var filePart = function (name, blob) {
        return {
            _0: name,
            _1: blob
        }
    };

    var fileBody = function (type, blob) {
        return {
            //ctor: "FormDataBody",
            //_0: type,
            _0: blob
        }
    };

    /*
    var postImageFile = function () {
        console.log("AAA")
        console.log(res)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://hzuuws5e9e.execute-api.ap-northeast-1.amazonaws.com/demo/', false);
        xhr.setRequestHeader('Content-Type', 'image/png');
        xhr.send(res);
        xhr.abort();
        return res
    }*/

    function postImageFileTask(request, maybeProgress) {
        return _elm_lang$core$Native_Scheduler.nativeBinding(function (callback) {
            var xhr = new XMLHttpRequest();

            configureProgress(xhr, maybeProgress);

            xhr.addEventListener('error', function () {
                callback(_elm_lang$core$Native_Scheduler.fail({ ctor: 'NetworkError' }));
            });
            xhr.addEventListener('timeout', function () {
                callback(_elm_lang$core$Native_Scheduler.fail({ ctor: 'Timeout' }));
            });
            xhr.addEventListener('load', function () {
                callback(handleResponse(xhr, request.expect.responseToResult));
            });

            try {
                xhr.open(request.method, request.url, true);
            }
            catch (e) {
                return callback(_elm_lang$core$Native_Scheduler.fail({ ctor: 'BadUrl', _0: request.url }));
            }

            configureRequest(xhr, request);
            send(xhr, request.body);

            return function () { xhr.abort(); };
        });
    }

    function send(xhr, body) {
        console.log("BBBB")
        console.log(res)
        switch (body.ctor) {
            case 'EmptyBody':
                xhr.setRequestHeader('Content-Type', "image/png");
                xhr.send(res);
                return;

            case 'StringBody':
                xhr.setRequestHeader('Content-Type', "image/png");
                xhr.send(res);
                return;

            case 'FormDataBody':
                xhr.setRequestHeader('Content-Type', "image/png");
                xhr.send(res);
                return;
        }
    }

    function configureProgress(xhr, maybeProgress) {
        if (maybeProgress.ctor === 'Nothing') {
            return;
        }

        xhr.addEventListener('progress', function (event) {
            if (!event.lengthComputable) {
                return;
            }
            _elm_lang$core$Native_Scheduler.rawSpawn(maybeProgress._0({
                bytes: event.loaded,
                bytesExpected: event.total
            }));
        });
    }

    function configureRequest(xhr, request) {
        function setHeader(pair) {
            xhr.setRequestHeader(pair._0, pair._1);
        }

        //A2(_elm_lang$core$List$map, setHeader, request.headers);
        xhr.responseType = request.expect.responseType;
        xhr.withCredentials = request.withCredentials;

        if (request.timeout.ctor === 'Just') {
            xhr.timeout = request.timeout._0;
        }
    }

    // RESPONSES

    function handleResponse(xhr, responseToResult) {
        var response = toResponse(xhr);

        if (xhr.status < 200 || 300 <= xhr.status) {
            response.body = xhr.responseText;
            return _elm_lang$core$Native_Scheduler.fail({
                ctor: 'BadStatus',
                _0: response
            });
        }

        var result = responseToResult(response);

        if (result.ctor === 'Ok') {
            return _elm_lang$core$Native_Scheduler.succeed(result._0);
        }
        else {
            response.body = xhr.responseText;
            return _elm_lang$core$Native_Scheduler.fail({
                ctor: 'BadPayload',
                _0: result._0,
                _1: response
            });
        }
    }

    function toResponse(xhr) {
        return {
            status: { code: xhr.status, message: xhr.statusText },
            headers: parseHeaders(xhr.getAllResponseHeaders()),
            url: xhr.responseURL,
            body: xhr.response
        };
    }

    function parseHeaders(rawHeaders) {
        var headers = _elm_lang$core$Dict$empty;

        if (!rawHeaders) {
            return headers;
        }

        var headerPairs = rawHeaders.split('\u000d\u000a');
        for (var i = headerPairs.length; i--;) {
            var headerPair = headerPairs[i];
            var index = headerPair.indexOf('\u003a\u0020');
            if (index > 0) {
                var key = headerPair.substring(0, index);
                var value = headerPair.substring(index + 2);

                headers = A3(_elm_lang$core$Dict$update, key, function (oldValue) {
                    if (oldValue.ctor === 'Just') {
                        return _elm_lang$core$Maybe$Just(value + ', ' + oldValue._0);
                    }
                    return _elm_lang$core$Maybe$Just(value);
                }, headers);
            }
        }

        return headers;
    }

    return {
        readAsTextFile: readAsTextFile,
        readAsArrayBuffer: readAsArrayBuffer,
        readAsDataUrl: readAsDataUrl,
        readAsBinaryString: readAsBinaryString,
        filePart: F2(filePart),
        fileBody: F2(fileBody), // tmp :: if fix 3 to 2 ...
        postImageFileTask: F2(postImageFileTask),
    };
}();
