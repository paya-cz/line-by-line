import EventEmitter, { once } from 'events';
import stream from 'stream';
import { iterateStreamLines } from './line-by-line-iterator';

/**
 * Creates a transform stream:
 * - `Writable` side: standard non-`objectMode` stream.
 * - `Readable` side: object mode, returns a `string` for each line.
 * 
 * @param encoding Optional encoding to use when decoding the stream into text. Default: `utf8`
 * @returns Transform stream that converts a stream of bytes into line strings.
 */
export function createLineByLineStream(encoding?: BufferEncoding): stream.Transform {
    // Used to signal when the iterator requested more data to process
    const readableEvents = new EventEmitter();

    // Readable stream used to feed the iterator
    const readable = new stream.Readable({
        highWaterMark: 0,
        encoding,
        read(_size): void {
            readableEvents.emit('resume');
        },
    });

    const transform = new stream.Transform({
        writableObjectMode: false,
        readableObjectMode: true,
        autoDestroy: true,
        decodeStrings: false,
        transform(chunk, encoding, callback): void {
            (async () => {
                try {
                    if (!readable.push(chunk, encoding)) {
                        await once(readableEvents, 'resume');
                    }
                    callback();
                } catch (error) {
                    callback(error);
                }
            })();
        },
        flush(callback): void {
            readable.push(null);
            whenDone.then(() => callback(), callback);
        },
        destroy(error, callback): void {
            readable.destroy();
            callback(error);
        },
    });

    const whenDone = new Promise<void>(async resolve => {
        try {
            for await (const line of iterateStreamLines(readable, encoding)) {
                if (transform.destroyed) {
                    break;
                } else {
                    transform.push(line);
                }
            }
        } catch (error) {
            transform.destroy(error);
        } finally {
            resolve();
        }
    });

    return transform;
}