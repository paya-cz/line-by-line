import { StringDecoder } from 'string_decoder';

/**
 * Split a string at new-line boundaries. Returns an array of lines.
 * 
 * @param text String to split into lines.
 * @returns An array of lines.
 */
export function splitStringLines(text: string): string[] {
    return text.split(/\r\n|\n|\r/);
}

/**
 * Iterate over a string line by line. Each iterated value is a line found within the `text`.
 * This generator always yields at least one value.
 * 
 * Use this generator to reduce memory pressure in your code.
 * 
 * @param text String to iterate over line by line.
 * @returns Iterator that yields individual lines.
 */
export function* iterateStringLines(text: string): Generator<string, void, void> {
    const newLinePattern = /\r\n|\n|\r/g;
    let match: RegExpExecArray | null;
    let prevMatchIndex = 0;

    while ((match = newLinePattern.exec(text)) !== null) {
        yield text.slice(prevMatchIndex, match.index);
        prevMatchIndex = newLinePattern.lastIndex;
    }

    yield text.slice(prevMatchIndex);
}

/**
 * Reads a stream line by line. Iterate over the iterator using `for await` loop.
 * @param stream Readable stream to read line by line.
 * @param encoding Optional encoding to use when decoding the stream into text. Default: `utf8`
 * @returns Iterator that yields individual lines.
 */
export async function* iterateStreamLines(
    stream: NodeJS.ReadableStream,
    encoding?: BufferEncoding,
): AsyncGenerator<string, void, void> {
    // Nullable because stream could emit only strings, or alternate between strings and buffers!
    let decoder: StringDecoder | undefined;
    
    // Nullable because the stream might be empty and not yield a single chunk!
    let buffer: string | undefined;

    for await (const chunk of stream) {
        // Initialize buffer for the first chunk
        if (buffer == null) {
            buffer = '';
        }

        // Add chunk to the buffer
        if (typeof chunk === 'string') {
            if (decoder) {
                buffer += decoder.end();
                decoder = undefined;
            }

            buffer += chunk;
        } else if (Buffer.isBuffer(chunk)) {
            if (!decoder) {
                decoder = new StringDecoder(encoding);
            }

            buffer += decoder.write(chunk);
        } else {
            throw new Error(`Unsupported chunk type: ${typeof chunk}`);
        }

        // If the buffered text ends with \r, make sure to NOT process that character because it might
        // be part of the \r\n pair, and we might get \n in the next chunk!
        const endsWithCR = buffer.endsWith('\r');

        if (buffer.length > (endsWithCR ? 1 : 0)) {
            if (endsWithCR) {
                buffer = buffer.slice(0, -1);
            }

            let lastLine: string | undefined = undefined;

            // The iterate function always yields at least one value
            for (const line of iterateStringLines(buffer)) {
                if (lastLine != null) {
                    yield lastLine;
                }

                lastLine = line;
            }

            // Last line might be incomplete, so we need to continue adding chunks to it
            buffer = lastLine!;

            // Put back the \r we took
            if (endsWithCR) {
                buffer += '\r';
            }
        }
    }
    
    // Decode final bytes
    if (decoder) {
        buffer! += decoder.end();
        decoder = undefined;
    }

    if (buffer != null) {
        yield* iterateStringLines(buffer);
    }
}
