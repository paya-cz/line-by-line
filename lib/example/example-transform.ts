import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { createLineByLineStream } from '../line-by-line-stream';

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