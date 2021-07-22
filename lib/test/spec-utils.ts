import stream from 'stream';

export function createSinkStream(withError: boolean): stream.Writable {
    let chunkIndex = 0;

    return new stream.Writable({
        objectMode: true,
        highWaterMark: 0,
        write(_chunk, _encoding, callback): void {
            if (withError && chunkIndex++ >= 5) {
                callback(new Error('Sink Error!'));
            } else {
                callback();
            }
        }
    });
}

export function createLineCountingStream(): {
    stream: stream.Transform,
    getCount: () => number,
} {
    let count = 0;

    return {
        stream: new stream.Transform({
            transform(chunk, _encoding, callback): void {
                count++;
                callback(null, chunk);
            },
        }),
        getCount: () => count,
    };
}

export function createGeneratorStream(withError: boolean): stream.Readable {
    return stream.Readable.from(generate(withError), {
        highWaterMark: 0,
        objectMode: false,
        autoDestroy: true,
    });
}

function throwGenerateError(): void {
    throw new Error('Generate Error!');
}

async function* generate(withError: boolean): AsyncGenerator<Buffer, void, void> {
    for (let i = 0; i < 4096; i++) {
        yield Buffer.from(`line ${i}\n`, 'ascii');
    }

    if (withError) {
        yield Buffer.from('line just before error\n', 'ascii');
        throwGenerateError();
        yield Buffer.from('this should never return\n', 'ascii');
    }
}