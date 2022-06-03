function krequest (url, options = {}) {
    return new Promise((resolve, reject) => {
        fetch(url, options)
        .then(response => {
            if (!response.ok) { return {length: 0, data: [], success: false}}
            return response.json()
        })
        .then(results => {
            if (results.length === 0) { return resolve([]) }
            if (results.data === null) { return resolve([]) }
            if (!Array.isArray(results.data)) { results.data = [results.data] }
            return resolve(results.data)
        })
        .catch(error => {
            return reject(error)
        })
    })
}