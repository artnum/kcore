var KREQUEST = {}
function krequest (url, options = {}) {
    return new Promise((resolve, reject) => {
        if (!KREQUEST._queries) {
            const krequest_blob = new Blob([`self.onmessage = function (message) {
                const request = message.data
                const xreqid = request.options.headers['X-Request-Id']
                if (request.options.body) {
                    if (typeof request.options.body === 'object') {
                        request.options.body = JSON.stringify(request.options.body)
                    }
                }
                fetch (request.url, request.options)
                .then(response => {
                    return new Promise((resolve, reject) => {
                        const headers = {}
                        if (response.headers instanceof Headers) {
                            for (const [k, v] of response.headers.entries()) {
                                headers[k] = v
                            }
                        }
            
                        if (!response.ok) {
                            return reject({message: response.statusText, name: response.status, headers, http: true})
                        }
            
                        response.json()
                        .then(body => {
                            return resolve([body, headers, response.status, response.statusText])
                        })
                        .catch(error => {
                            length = parseInt(headers['content-length'] === undefined ? headers['Content-Length'] : headers['content-length'])
                            if (!isNaN(length) && length === 0) {
                                return resolve([{}, headers, response.status, response.statusText])
                            }
                            return reject(error)
                        })
                    })
                })
                .then(([body, headers, status, text]) => {
                    self.postMessage({xreqid, body, headers, status, text})
                })
                .catch(error => {
                    self.postMessage({xreqid, error: {name: error.name, message: error.message, headers: error.headers ? error.headers : [], isHTTP: error.http ? true : false}})
                })
            }`], {type: 'application/javascript'})
            KREQUEST._id = 0
            KREQUEST._queries = new Map()
            KREQUEST._worker = new Worker(URL.createObjectURL(krequest_blob))
            KREQUEST._worker.onmessage = function (message) {
                const response = message.data
                if (!response.xreqid) { return }
                if (!this._queries.has(response.xreqid)) { return }
                const [resolve, reject] = this._queries.get(response.xreqid)
                this._queries.delete(response.xreqid)
                if (response.error) { return reject(response.error) }
                return resolve(response)
            }.bind(KREQUEST)
        }

        let xreqid = ''
        /* always set a X-Request-Id */
        if (options.headers === undefined) {
            options.headers = {}
        } else {
            /* Headers can't be sent to worker */
            if (options.headers instanceof Headers) {
                const headers = options.headers
                options.headers = {}
                for (const [key, content] of headers.entries()) {
                    options.headers[key] = content
                }
            }
        }
        if (options.headers['X-Request-Id'] === undefined) {
            xreqid = ++KREQUEST._id
            options.headers['X-Request-Id'] = xreqid
        } else {
            xreqid = options.headers['X-Request-Id']
        }

        KREQUEST._queries.set(xreqid, [resolve, reject])
        KREQUEST._worker.postMessage({
            url: url instanceof URL ? url.toString() : url,
            options: options
        })
    })
}