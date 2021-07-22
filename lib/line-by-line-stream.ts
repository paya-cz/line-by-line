import EventEmitter, { once } from 'events';
import stream from 'stream';
import { lineByLine } from './line-by-line-iterator';

/**
 * Creates a transform stream:
 * - `Writable` side: standard non-`objectMode` stream.
 * - `Readable` side: object mode, returns a `string` for each line.
 * @returns Transform stream that converts a stream of bytes into line strings.
 */
export function createLineByLineStream(): stream.Transform {
    // Used to signal when the iterator requested more data to process
    const readableEvents = new EventEmitter();

    // Readable stream used to feed the iterator
    const readable = new stream.Readable({
        autoDestroy: true,
        objectMode: false,
        highWaterMark: 0,
        read(_size): void {
            readableEvents.emit('resume');
        },
    });

    const transform = new stream.Transform({
        writableObjectMode: false,
        readableObjectMode: true,
        autoDestroy: true,
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
            whenDone.then(() => callback());
        },
        destroy(error, callback): void {
            readable.destroy();
            callback(error);
        },
    });

    const whenDone = new Promise<void>(async resolve => {
        try {
            for await (const line of lineByLine(readable)) {
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