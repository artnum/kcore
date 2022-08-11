/* forward throttle, cancel previous timeout for auto-completion stuff :
 * user type, stop to remember and get autocompletion
 */
function kfwthrottle (fn, delay) {
    let timeout = null
    return function(...args) {
        if (timeout) { clearTimeout(timeout) }
        timeout = setTimeout(() => {
            fn.call(this, ...args)
            timeout = null
        }, delay)    
    }
}

function kthrottle (fn, delay) {
    let timeout = null
    return function(...args) {
        if (timeout) { return }
        timeout = setTimeout(() => {
            fn.call(this, ...args)
            timeout = null
        }, delay)
    }
}