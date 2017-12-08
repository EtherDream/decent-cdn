const $path = require('path')
const $fs = require('fs')

const TIMESTAMP = Date.now()

function include(file) {
    let js = $fs.readFileSync(file, 'utf-8')

    // "@include path"
    js = js.replace(/"@include (.+?)"\n/g, (s, path) => {
        path = $path.join($path.dirname(file), path)
        return include(path)
    })

    // <@embed path>
    js = js.replace(/<@embed (.+?)>/g, (s, path) => {
        path = $path.join($path.dirname(file), path)
        return include(path)
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\"/g, '\\"')
    })

    js = js.replace(/__TIMESTAMP__/g, TIMESTAMP)

    return js
}

function main(args) {
    let s = include(args[0])
    $fs.writeFileSync(args[1], s)
}

main(['sw/boot.js', '../dst/x.js'])
// main(process.argv.slice(2))
