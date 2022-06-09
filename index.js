window.addEventListener('load', event => {
    KCORELoad()
    .then(_ => {
        window.dispatchEvent(new CustomEvent('kcore-loaded'))
    })
})

function KCORELoad () {
    return new Promise(resolve => {
        const scripts = [
            'https://unpkg.com/@popperjs/core@2',
            'net/krequest.js',
            'ui/kselect.js',
            'ui/kclosable.js',
            'ui/kz.js',
            'ui/kcolor.js',
            'css/index.css'
        ]

        let url = `${location.origin}`
        const sFiles = document.getElementsByTagName('SCRIPT')
        for (let file of sFiles) {
            file = file.src
            if (file.indexOf('?') !== -1) {
                file = file.substring(0, file.indexOf('?'))
            }
            if (file.endsWith('kcore/index.js')) {
                const parts = file.split('/')
                parts.pop()
                url = parts.join('/')
                break
            }
        }

        if (window.KCORE?.NoPopper) {
            scripts.shift()
        }

        const promises = []
        for (const script of scripts) {
            promises.push(new Promise(resolve => {
                let isScript = !script.endsWith('.css')
                
                const node = isScript ? document.createElement('SCRIPT') : document.createElement('LINK')
                if (script.startsWith('http://') || script.startsWith('https://')) {
                    isScript ? node.src = script : node.href = script
                } else {
                    isScript ? node.src = `${url}/${script}`: node.href = `${url}/${script}`
                }
                isScript ? node.type = 'text/javascript' : node.rel = 'stylesheet'
                document.head.appendChild(node)
                node.addEventListener('load', event => { resolve() })
            }))
        }
        Promise.all(promises)
        .then(_ => {
            resolve()
        })
    })
}