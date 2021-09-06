# line-by-line

Read or parse node.js streams line by line without loading the entire file to memory.
Use async iterator in a `for await` loop, or object-mode stream transform.

Initially, `line-by-line` used `readline` package internally, but because of its shortcomings
(inability to specify encoding), it now implements a custom line-reading algorithm.

# Why not just use the built-in `readline` package?

Because it does not offer `Transform` stream, and because its async iterator [does not propagate stream errors](https://nodejs.org/api/readline.html#readline_rl_symbol_asynciterator). So if you are parsing a file or network stream and an error
happens, you better manually catch `.on('error')` and additionally use that to break from the `for await` iterator loop.

Additionally, `readline` is hard-coded to `utf8` encoding, so you cannot use it with other encodings.

# Installation

With [npm](https://www.npmjs.com/) do:

    $ npm install @mangosteen/line-by-line

# Usage (string array)

```ts
import fs from 'fs/promises';
import { splitStringLines } from '@mangosteen/line-by-line';

(async () => {
    const fileBuffer: Buffer = await fs.readFile('./shakespeare.txt');
    const text: string = fileBuffer.toString('utf8');
    const lines: string[] = splitStringLines(text);

    for (const line of lines) {
        console.log('Line:', line);
    }
})();
```

`splitStringLines` splits the text into lines array.

This may potentially consume a lot of memory, because at one point you need to hold both
the entire input string and the entire output array of lines. Thus, we generally recommend
using below functions instead.

# Usage (string iterator)

```ts
import fs from 'fs/promises';
import { iterateStringLines } from '@mangosteen/line-by-line';

(async () => {
    const fileBuffer: Buffer = await fs.readFile('./shakespeare.txt');
    const text: string = fileBuffer.toString('utf8');
    const iterator: Iterable<string> = iterateStringLines(text);

    for (const line of iterator) {
        console.log('Line:', line);
    }
})();
```

`iterateStringLines` is a generator function that lazily yields lines one by one.

You still need to hold the entire input string in memory, but the output lines can
be processed efficiently.

# Usage (stream iterator)

```ts
import fs from 'fs';
import { iterateStreamLines } from '@mangosteen/line-by-line';

(async () => {
    const inputStream = fs.createReadStream('./shakespeare.txt');
    const iterator: AsyncIterable<string> = iterateStreamLines(inputStream, 'utf8');

    for await (const line of iterator) {
        console.log('Line:', line);
    }
})();
```

`iterateStreamLines` is async generator function that lazily yields lines one by one.

This is the most efficient method of reading lines. The input is a stream and can be
processed on-demand. The output is generated on-demand as well, one line at a time.

When the stream iterator returned by `iterateStreamLines` is consumed (via `for await`),
it will automatically close and destroy the input stream, and fully propagate input stream
errors. You won't need to do anything more to clean up the input stream.

When you `break`, `return` or `throw` from within the `for await` loop, everything gets
cleaned up automatically. Errors thrown by the stream work the same way.

You cannot reuse the same input stream for multiple `for await` loops or multiple `lineByLine`
iterators, because everything gets cleaned up automatically.

# Usage (transform stream)

```ts
import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { createLineByLineStream } from '@mangosteen/line-by-line';

const pipeline = promisify(stream.pipeline);

(async () => {
    await pipeline(
        fs.createReadStream('./shakespeare.txt'),
        createLineByLineStream('utf8'),
        createSinkStream(),
    );
})();

function createSinkStream(): stream.Writable {
    return new stream.Writable({
        objectMode: true,
        highWaterMark: 0,
        write(line: string, _encoding, callback): void {
            console.log('Line:', line);
            callback();
        },
    });
}
```

The `createLineByLineStream` transform stream's `Writable` side expects a standard non-`objectMode` stream.
The `Readable` side runs in an `objectMode`, where each object is a line `string`.
You can specify an `encoding` to decode any `Buffer`s the transform stream receives.