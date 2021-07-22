import fs from 'fs';
import { lineByLine } from '../line-by-line-iterator';

(async () => {
    const inputStream = fs.createReadStream('./shakespeare.txt');

    for await (const line of lineByLine(inputStream)) {
        console.log('Line:', line);
        console.log(typeof line); // 'string'
    }
})();