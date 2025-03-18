import { execSync } from 'child_process'
import { readFileSync } from 'fs'

main()

async function main() {
    for (let i = 0; i < 45; i++) {
        execSync(`dd if=/dev/random of=random${i}.bin bs=128k count=1`)
    }
    for (let i = 0; i < 45; i++) {
        const data = readFileSync(`random${i}.bin`)
        const response = await fetch('http://localhost:3000/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            body: data
        })
        console.log(await response.text())
    }
}
