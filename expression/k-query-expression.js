/* K Query Language
 * ----------------
 * 
 * Build query to be translated into LDAP or SQL filter or condition. For example :
 *  
 *  '#or' : {
 *     name: "etienne"
 *     name: "bagnoud"
 *   }
 * 
 * would result in WHERE name = "etienne" OR name = "bagnoud" or (|(name=etienne)(name=bagnoud)) AND and OR can be nested.
 * 
 * KQueryExpr.fromString turn a single string into a query. Rules have been inspired from Goodle Search Operators with :
 *   [-] AND / ET / & => logical and
 *   [-] OR / OU / | => logical or
 *   [-] -term negate a term
 *   [-] +term or "term" want exact term search, + is for one term without space, "" is form "multiple terms"
 *   [-] * wildcard 
 *
 * By default term becomes *term* and with no logical it would be term1 AND term2 AND termX ...
 * It has no grouping.
 * It tries to detect phone numbers and associate them with attributes related to phone numbers searching :
 *                             <attr name>  <attr type>
 *    options = {attribute: [['phonenumber', 'phone'], 'name']}
 * 
 * and search them by removing country calling code or leading 0 and matching with * instead of spaces :
 *       +41 56 556 78 98 (not real phone, random number ... I hop)
 *   become
 *          *56*556*78*98*
 * 
 * Seems to work alright for querying as user types.
 *
 */
function KQueryExpr (query) {
    this.query = query
}

KQueryExpr.fromString = function (string, options = {}) {
    /* list of country calling code */
    const CCODE = ["+93", "+358", "+355", "+213", "+1684", "+376", "+244", "+1264", "+672", "+1268", "+54", "+374", "+297", "+61", "+43", "+994", "+1242", "+973", "+880", "+1246", "+375", "+32", "+501", "+229", "+1441", "+975", "+591", "+387", "+267", "+55", "+246", "+673", "+359", "+226", "+257", "+855", "+237", "+1", "+238", "+354", "+236", "+235", "+56", "+86", "+61", "+61", "+57", "+269", "+242", "+243", "+682", "+506", "+225", "+385", "+53", "+357", "+420", "+45", "+253", "+1767", "+1849", "+593", "+20", "+503", "+240", "+291", "+372", "+251", "+500", "+298", "+679", "+358", "+33", "+594", "+689", "+241", "+220", "+995", "+49", "+233", "+350", "+30", "+299", "+1473", "+590", "+1671", "+502", "+44", "+224", "+245", "+595", "+509", "+379", "+504", "+852", "+36", "+354", "+91", "+62", "+98", "+964", "+353", "+44", "+972", "+39", "+1876", "+81", "+44", "+962", "+77", "+254", "+686", "+850", "+82", "+965", "+996", "+856", "+371", "+961", "+266", "+231", "+218", "+423", "+370", "+352", "+853", "+389", "+261", "+265", "+60", "+960", "+223", "+356", "+692", "+596", "+222", "+230", "+262", "+52", "+691", "+373", "+377", "+976", "+382", "+1664", "+212", "+258", "+95", "+264", "+674", "+977", "+31", "+599", "+687", "+64", "+505", "+227", "+234", "+683", "+672", "+1670", "+47", "+968", "+92", "+680", "+970", "+507", "+675", "+595", "+51", "+63", "+872", "+48", "+351", "+1939", "+974", "+40", "+7", "+250", "+262", "+590", "+290", "+1869", "+1758", "+590", "+508", "+1784", "+685", "+378", "+239", "+966", "+221", "+381", "+248", "+232", "+65", "+421", "+386", "+677", "+252", "+27", "+211", "+500", "+34", "+94", "+249", "+597", "+47", "+268", "+46", "+41", "+963", "+886", "+992", "+255", "+66", "+670", "+228", "+690", "+676", "+1868", "+216", "+90", "+993", "+1649", "+688", "+256", "+380", "+971", "+44", "+1", "+598", "+998", "+678", "+58", "+84", "+1284", "+1340", "+681", "+967", "+260", "+263"]
    options = Object.assign({attribute: 'name'}, options)

    const regExp = new RegExp(/(:?[\+|0]?\s*[0-9\.\-\(\)\s]+|[a-zA-Z0-9+-_%+\-.~]+(?<=\@)[A-Za-z0-9.\-]+(?<=\.)[A-Za-z]+|[^\s]+)/, 'g')
    const values = Array.from(string.matchAll(regExp))
        .map(e => e[0])
        .map(e => {
            let neg = false
            e = e.trim()
            if (/[\+|0]?\s*[0-9\.\-\(\)\s]+/.test(e)) {
                for(const code of CCODE) {
                    if (e.indexOf(code) === 0) {
                        e = e.substring(code.length)
                        break
                    }
                }
                while (e.length > 0 && e.startsWith('0')) {
                    e = e.substring(1)
                }
                e = e.replaceAll(/\s/g, '*')
                return [e, 'phone']
            }
            if (/[a-zA-Z0-9+-_%+\-.~]+(?<=\@)[A-Za-z0-9.]+(?<=\.)[A-Za-z0-9]+/.test(e)) {
                return [e, 'mail']
            }
            
            const x = [e, '']
            return x
        })
        .filter(e => e[0] !== '')



    const state = {
        inexact: false, // "in exact search term" 
        negation: false,
        type: ''
    }
    const expression = []
    const pushToExpression = (value, type, neg = false) => {
        if (neg) {
            expression.push(['!=', value, type])
            return
        }
        expression.push(['=', value, type])
    }

    let buffer = ''
    for (let value of values) {
        state.type = value[1]
        value = value[0]
        switch (value) {
            case '&':
            case 'ET':
            case 'AND': expression.splice(expression.length - 1, 0, '&&'); continue
            case '|':
            case 'OU':
            case 'OR': expression.splice(expression.length - 1, 0, '||'); continue
        }

        if (value.startsWith('-')) {
            state.negation = true
            if (value === '-') { continue }
            value = value.substring(1)
        }
        if (value.startsWith('+')) {
            value = `"${value.substring(1)}"`
        }
        if (value.startsWith('"') || value === '"' || value.endsWith('"')) {
            if (value === '"') {
                state.inexact = !state.inexact
                continue
            }

            // immediatly end inexact if "word"
            if (value.startsWith('"') && value.endsWith('"')) {
                state.inexact = true
            }
        
            if (value.startsWith('"')) { value = value.substring(1) }
            if (value.endsWith('"')) { value = value.substring(0, value.length - 1)}

            if (state.inexact) {
                if (buffer === '') { pushToExpression(value, state.type, state.negation) }
                else { pushToExpression(`${buffer} ${value}`, state.type, state.negation) }
                state.negation = false
                buffer = ''
                state.inexact = false
                continue
            }

            state.inexact = true
            buffer = value
            continue
        }

        if (state.inexact) {
            buffer = `${buffer} ${value}`
            continue
        }
        pushToExpression(`*${value}*`, state.type, state.negation)
        state.negation = false
    }

    if (state.inexact) {
        pushToExpression(buffer, state.type, state.negation)
        state.negation = false
    }

    const request = {}
    let orcount = 0
    let andcount = 0
    let currentSub = ''
    let subcount = 0
    let subattrcount = 0
    let attrcount = 0
    let notcount = 0

    /* if any is set as "phone" attribute, set values only to "phone" value
     * and any that is not phone as others value ... if that make sense
     */
    const setAttribute = (where, count, expr) => {
        /* one attribute search */
        if (!Array.isArray(options.attribute)) {
            where[`${options.attribute}:${count}`] = expr.slice(0, 2)
            return
        }

        /* typed search */
        if (expr[2] !== '') {
            const typed = options.attribute.filter(e => {
                if (Array.isArray(e) && e[1] === expr[2]) {
                    return e
                }
            })
            if (typed.length > 0) {
                if (typed.length === 1) {
                    where[`${typed[0][0]}:${count}`] = expr.slice(0, 2)
                    return 
                }
                /* in case of negative expression, we want to AND all of them */
                if (expr[0] === '!=') {
                    expr[0] = '='
                    where[`#not:${++notcount}`] = {}
                    where[`#not:${notcount}`][`#or:${++orcount}`] = {}
                    for (const t of typed) {
                        where[`#not:${notcount}`][`#or:${orcount}`][`${t[0]}:${count}`] = expr.slice(0, 2)
                    }
                    return
                }
                where[`#or:${++orcount}`] = {}
                for (const t of typed) {
                    where[`#or:${orcount}`][`${t[0]}:${count}`] = expr.slice(0, 2)
                }
                return 
            }
        }

        const notphones = options.attribute.filter(e => {
            if (!Array.isArray(e)) { return e}
            if (Array.isArray(e) && e[1] === '') {
                return e
            }
        })

        if (notphones.length > 0) {
            if (notphones.length === 1) {
                if (Array.isArray(notphones[0])) {
                    where[`${notphones[0][0]}:${count}`] = expr.slice(0, 2)
                    return 
                }
                where[`${notphones[0]}:${count}`] = expr.slice(0, 2)
                return
            }
            if (expr[0] === '!=') {
                expr[0] = '='
                where[`#not:${++notcount}`] = {}
                where[`#not:${notcount}`][`#or:${++orcount}`] = {}
                for (const notphone of notphones) {
                    if (Array.isArray(notphone)) {
                        where[`#not:${notcount}`][`#or:${orcount}`][`${notphone[0]}:${count}`] = expr.slice(0, 2)
                        continue
                    }
                    where[`#not:${notcount}`][`#or:${orcount}`][`${notphone}:${count}`] = expr.slice(0, 2)
                }        
                return 
            }
            where[`#or:${++orcount}`] = {}
            for (const notphone of notphones) {
                if (Array.isArray(notphone)) {
                    where[`#or:${orcount}`][`${notphone[0]}:${count}`] = expr.slice(0, 2)
                    continue
                }
                where[`#or:${orcount}`][`${notphone}:${count}`] = expr.slice(0, 2)
            }
            return
        }
    }

    for (const expr of expression) {
        switch (expr) {
            case '&&':
                if (currentSub !== '') {
                    /* sequence of AND : x AND y AND z */
                    subcount--
                    continue
                }
                currentSub = `#and:${++andcount}`
                request[currentSub] = {}
                continue
            case '||':
                if (currentSub !== '') {
                    subcount--
                    continue
                }
                currentSub = `#or:${++orcount}`
                request[currentSub] = {}
                continue
            default:
                if (currentSub !== '' && subcount < 2) {
                    setAttribute(request[currentSub], ++subattrcount, expr)
                    subcount++
                    continue
                }
                if (currentSub !== '') { currentSub = ''; subcount = 0; subattrcount = 0 }
                setAttribute(request, ++attrcount, expr)
        }
    }

    if (Object.keys(request).length === 1) {
        return new KQueryExpr(request)
    }
    return new KQueryExpr({'#and': request })
}


/* filter attribute out of an expression (those not set in function arguments) */
KQueryExpr.prototype.filter = function (attributes) {
    const obj = function (object, attributes, parent = null, myKey = null) {
        for (const _key of Object.keys(object)) {
            const [key, index] = _key.split(':', 2)
            if (key.startsWith('#')) { obj(object[_key], attributes, object, _key); continue }
            if (attributes.indexOf(key) === -1) { 
                delete object[_key]
                if (Object.keys(object).length === 1 && parent !== null) {
                    const key = Object.keys(object)[0]
                    if (parent[key]) {
                        parent[`${key}:1`] = parent[key]
                        parent[`${key}:2`] = object[key]
                        delete parent[key]
                    } else {
                        let max = -1
                        for (const k of Object.keys(parent)) {
                            
                            const [_k, i] = k.split(':', 2)
                            if (_k === key) {
                                if (parseInt(i) > max) { max = parseInt(i) }
                            }
                        }
                        if (max > -1) {
                            parent[`${key}:${max+1}`] = object[key]
                        } else {
                            parent[key] = object[key]
                        }
                    }
                    delete parent[myKey]
                } else if (Object.keys(object).length < 1 && parent !== null) {
                    delete parent[Object.keys(object)[0]]
                }
            }
        }
    }
    if (typeof attributes === 'string') { attributes = [attributes]}
    if (!Array.isArray(attributes)) { return false }
    obj(this.query, attributes)
    return true
}

/* clone the expression */
KQueryExpr.prototype.clone = function () {
    if (typeof structuredClone === 'function') {
        return new KQueryExpr(structuredClone(this.query))
    } else {
        const arr = (src) => {
            const copy = []
            for (const k in src) {
                copy[k] = src[k]
            }
            return copy
        }
        const obj = (src) => {
            const dest = {}
            for (const key of Object.keys(src)) {
                if (Array.isArray(src[key])) {
                    dest[key] = arr(src[key])
                } else if (typeof src[key] === 'object') {
                    dest[key] = obj(src[key])
                } else {
                    dest[key] = src[key]
                }
            }
            return dest
        }
        const x = obj(this.query)
        return new KQueryExpr(x)
    }
}


/* merge a query into another one */
KQueryExpr.prototype.merge = function (query) {
    const originalQuery = this.query
    newQuery = {'#and': {

    }}
    for (const k of Object.keys(originalQuery)) {
        newQuery['#and'][k] = originalQuery[k]
    }
    for (const k of Object.keys(query)) {
        newQuery['#and'][k] = query[k]
    }
    
    this.query = newQuery
}

KQueryExpr.prototype.toJson = function () {
    return JSON.stringify(this.query)
}

KQueryExpr.prototype.object = function () {
    return this.query
}