window.addEventListener('load', event => {
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
    for (const file of sFiles) {
        if (file.src.endsWith('kcore/index.js')) {
            const parts = file.src.split('/')
            parts.pop()
            url = parts.join('/')
            break
        }
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
        window.dispatchEvent(new CustomEvent('kcore-loaded'))
    })
})