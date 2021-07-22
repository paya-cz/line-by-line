# line-by-line

Read or parse node.js streams line by line without loading the entire file to memory.
Use async iterator in a `for await` loop, or object-mode stream transform.

# Why not just use the built-in `readline` package?

Because it does not offer `Transform` stream, and because its async iterator [does not propagate stream errors](https://nodejs.org/api/readline.html#readline_rl_symbol_asynciterator). So if you are parsing a file or network stream and an error
happens, you better manually catch `.on('error')` and additionally use that to break from the `for await` iterator loop.

Our package internally uses `readline`, but wraps it in a way to fix the above shortcomings.

# Installation

With [npm](https://www.npmjs.com/) do:

    $ npm install @mangosteen/line-by-line

# Usage (iterator)

```js
import fs from 'fs';
import { lineByLine } from '@mangosteen/line-by-line';

(async () => {
    const inputStream = fs.createReadStream('./shakespeare.txt');

    for await (const line of lineByLine(inputStream)) {
        console.log('Line:', line);
        console.log(typeof line); // 'string'
    }
})();
```

The iterator automatically closes and destroys the input stream, and fully propagates input stream errors.
When you `break`, `return` or `throw` from within the `for await` loop, everything gets cleaned up automatically.
Errors thrown by the stream work the same way.

You cannot reuse the same input stream for multiple `for await` loops or multiple `lineByLine` iterators,
because everything gets cleaned up automatically.

# Usage (transform stream)

```js
import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { createLineByLineStream } from '@mangosteen/line-by-line';

const pipeline = promisify(stream.pipeline);

(async () => {
    await pipeline(
        fs.createReadStream('./shakespeare.txt'),
        createLineByLineStream(),
        createSinkStream(),
    );
})();

function createSinkStream(): stream.Writable {
    return new stream.Writable({
        objectMode: true,
        highWaterMark: 0,
        write(chunk, _encoding, callback): void {
            console.log('Line:', chunk);
            console.log(typeof chunk); // 'string'
            callback();
        },
    });
}
```

The `createLineByLineStream` transform stream `Writable` side expects a standard non-`objectMode` stream.
The `Readable` side runs in an `objectMode`, where each object is a line `string`.