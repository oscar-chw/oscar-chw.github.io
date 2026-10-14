"""Bounded digital byte/DNA mapping; integrity detection, no biological model."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

SCHEMA = "dna-bytes/v1"
MAX_BYTES = 1024 * 1024
MAX_RECORD_BYTES = 4 * MAX_BYTES + 4096
FIELDS = {"schema", "byte_length", "sha256", "strand"}
BASES = "ACGT"
ENCODE = tuple(
    "".join(BASES[(byte >> shift) & 3] for shift in (6, 4, 2, 0)) for byte in range(256)
)
DECODE = {base: index for index, base in enumerate(BASES)}


class CodecError(ValueError):
    """A payload or record cannot be admitted without changing its meaning."""


def encode_record(data: bytes) -> dict[str, object]:
    """Map up to1MiB of exact bytes to a versioned, checksummed DNA record."""
    if not isinstance(data, bytes):
        raise CodecError("payload must be bytes; encode text with UTF-8 explicitly")
    if len(data) > MAX_BYTES:
        raise CodecError("payload exceeds the1MiB limit")
    return {
        "schema": SCHEMA,
        "byte_length": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "strand": "".join(ENCODE[byte] for byte in data),
    }


def decode_record(record: object) -> bytes:
    """Recover exact bytes only after schema, length, alphabet and digest checks."""
    if not isinstance(record, dict) or set(record) != FIELDS:
        raise CodecError(
            "record must have exactly schema, byte_length, sha256 and strand"
        )
    if record["schema"] != SCHEMA:
        raise CodecError(f"unsupported schema; expected {SCHEMA}")
    length = record["byte_length"]
    if type(length) is not int or length < 0:
        raise CodecError("byte_length must be a nonnegative integer, not a boolean")
    if length > MAX_BYTES:
        raise CodecError("byte_length exceeds the1MiB limit")
    strand, digest = record["strand"], record["sha256"]
    if not isinstance(strand, str):
        raise CodecError("strand must be an uppercase A/C/G/T string")
    if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
        raise CodecError("sha256 must be64 lowercase hexadecimal characters")
    if len(strand) != 4 * length:
        raise CodecError(f"strand length must equal4 × byte_length ({4 * length})")
    for index, base in enumerate(strand):
        if base not in DECODE:
            raise CodecError(
                f"invalid base at position {index}; expected uppercase A/C/G/T"
            )
    data = bytes(
        (DECODE[strand[index]] << 6)
        | (DECODE[strand[index + 1]] << 4)
        | (DECODE[strand[index + 2]] << 2)
        | DECODE[strand[index + 3]]
        for index in range(0, len(strand), 4)
    )
    if hashlib.sha256(data).hexdigest() != digest:
        raise CodecError(
            "checksum mismatch; payload is damaged or metadata does not match"
        )
    return data


def _unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise CodecError("duplicate record field")
        result[key] = value
    return result


def load_record(data: bytes) -> object:
    """Parse bounded UTF-8 JSON without admitting duplicate field names."""
    if len(data) > MAX_RECORD_BYTES:
        raise CodecError("record exceeds the4MiB+4096-byte input limit")
    try:
        return json.loads(data.decode("utf-8"), object_pairs_hook=_unique_object)
    except CodecError:
        raise
    except (ValueError, RecursionError) as error:
        raise CodecError(
            "record must be valid UTF-8 JSON with a bounded nesting depth"
        ) from error


def _read(path: str, limit: int) -> bytes:
    if path == "-":
        data = sys.stdin.buffer.read(limit + 1)
    else:
        with Path(path).open("rb") as source:
            data = source.read(limit + 1)
    if len(data) > limit:
        raise CodecError(f"input {path} exceeds the {limit}-byte limit")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    encode = commands.add_parser(
        "encode", help="encode bytes or UTF-8 text to a DNA JSON record"
    )
    source = encode.add_mutually_exclusive_group()
    source.add_argument(
        "--text", help="UTF-8 message; otherwise read bytes from --input or stdin"
    )
    source.add_argument(
        "--input", default="-", help="binary input path; '-' means stdin"
    )
    encode.add_argument(
        "--output", help="new JSON output file; default stdout; existing files refused"
    )
    decode = commands.add_parser(
        "decode", help="validate a DNA JSON record and recover its bytes"
    )
    decode.add_argument("--input", default="-", help="record path; '-' means stdin")
    decode.add_argument(
        "--output", help="new output file; default stdout; existing files refused"
    )
    decode.add_argument(
        "--text", action="store_true", help="require decoded payload to be valid UTF-8"
    )
    args = parser.parse_args(argv)
    try:
        if args.command == "encode":
            payload = (
                args.text.encode("utf-8")
                if args.text is not None
                else _read(args.input, MAX_BYTES)
            )
            output = (
                json.dumps(
                    encode_record(payload), sort_keys=True, separators=(",", ":")
                )
                + "\n"
            ).encode("utf-8")
        else:
            output = decode_record(load_record(_read(args.input, MAX_RECORD_BYTES)))
            if args.text:
                output.decode("utf-8")
        # Validate the record and optional UTF-8 check before opening/emitting output.
        if args.output:
            with Path(args.output).open("xb") as destination:
                destination.write(output)
        else:
            sys.stdout.buffer.write(output)
    except UnicodeError:
        print(
            "dna codec: text must be valid UTF-8; "
            "use byte mode for arbitrary binary data",
            file=sys.stderr,
        )
        return 2
    except (CodecError, OSError) as error:
        print(f"dna codec: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
