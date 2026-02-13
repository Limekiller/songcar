import lib from './src/lib.js'
import { readFileSync } from 'fs'

let data = readFileSync(process.argv.slice(2)[0]).toString()
data = JSON.parse(data)
const release = lib.getBestRelease(data, "The Who")
console.log(release)
