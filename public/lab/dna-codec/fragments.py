"""Recover checksummed digital DNA fragments with one XOR parity block per group."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

from .codec import (
    MAX_BYTES,
    CodecError,
    _read,
    _unique_object,
    decode_record,
    encode_record,
)

SCHEMA = "dna-fragments/v1"
CHUNK_BYTES = 1024
GROUP_SIZE = 4
MAX_BUNDLE_BYTES = 8 * MAX_BYTES
MANIFEST_FIELDS = {
    "byte_length",
    "sha256",
    "chunk_bytes",
    "group_size",
    "chunks",
    "parity",
}


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _manifest_sha(manifest: dict[str, object]) -> str:
    return _sha(json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode())


def _digest(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None


def xor_blocks(blocks: list[bytes]) -> bytes:
    """Right-zero-pad blocks to a fixed size; XOR is its own inverse."""
    result = bytearray(CHUNK_BYTES)
    for block in blocks:
        if not isinstance(block, bytes) or len(block) > CHUNK_BYTES:
            raise CodecError("XOR blocks must be bytes of at most1024 bytes")
        for index, value in enumerate(block):
            result[index] ^= value
    return bytes(result)


def encode_bundle(data: bytes) -> dict[str, object]:
    """Encode a bounded payload as indexed data records plus grouped XOR parity."""
    if not isinstance(data, bytes) or len(data) > MAX_BYTES:
        raise CodecError("payload must be bytes within the1MiB limit")
    blocks = [data[i : i + CHUNK_BYTES] for i in range(0, len(data), CHUNK_BYTES)]
    parity = [
        xor_blocks(blocks[i : i + GROUP_SIZE])
        for i in range(0, len(blocks), GROUP_SIZE)
    ]
    manifest = {
        "byte_length": len(data),
        "sha256": _sha(data),
        "chunk_bytes": CHUNK_BYTES,
        "group_size": GROUP_SIZE,
        "chunks": [
            {"byte_length": len(block), "sha256": _sha(block)} for block in blocks
        ],
        "parity": [_sha(block) for block in parity],
    }
    fragments = [
        {"kind": "data", "index": i, "record": encode_record(block)}
        for i, block in enumerate(blocks)
    ]
    fragments += [
        {"kind": "parity", "index": i, "record": encode_record(block)}
        for i, block in enumerate(parity)
    ]
    return {
        "schema": SCHEMA,
        "manifest": manifest,
        "manifest_sha256": _manifest_sha(manifest),
        "fragments": fragments,
    }


def _validate_manifest(manifest: object, digest: object) -> dict:
    if not isinstance(manifest, dict) or set(manifest) != MANIFEST_FIELDS:
        raise CodecError("manifest fields are missing or unknown")
    length = manifest["byte_length"]
    if type(length) is not int or not 0 <= length <= MAX_BYTES:
        raise CodecError("manifest byte_length must be an integer within the1MiB limit")
    for name, expected in (("chunk_bytes", CHUNK_BYTES), ("group_size", GROUP_SIZE)):
        if type(manifest[name]) is not int or manifest[name] != expected:
            raise CodecError(f"manifest {name} must be {expected}")
    count = (length + CHUNK_BYTES - 1) // CHUNK_BYTES
    parity_count = (count + GROUP_SIZE - 1) // GROUP_SIZE
    chunks, parity = manifest["chunks"], manifest["parity"]
    if not isinstance(chunks, list) or len(chunks) != count:
        raise CodecError("manifest chunk count does not match byte_length")
    if (
        not isinstance(parity, list)
        or len(parity) != parity_count
        or not all(map(_digest, parity))
    ):
        raise CodecError("manifest parity descriptors do not match the groups")
    for index, descriptor in enumerate(chunks):
        expected = min(CHUNK_BYTES, length - index * CHUNK_BYTES)
        if (
            not isinstance(descriptor, dict)
            or set(descriptor) != {"byte_length", "sha256"}
            or type(descriptor["byte_length"]) is not int
            or descriptor["byte_length"] != expected
            or not _digest(descriptor["sha256"])
        ):
            raise CodecError(f"manifest data descriptor {index} is invalid")
    if (
        not _digest(manifest["sha256"])
        or not _digest(digest)
        or _manifest_sha(manifest) != digest
    ):
        raise CodecError("manifest checksum or digest is invalid")
    return manifest


def recover_bundle(bundle: object) -> tuple[bytes, dict[str, object]]:
    """Reconstruct at most one erased data block per group, then verify the file."""
    if (
        not isinstance(bundle, dict)
        or set(bundle) != {"schema", "manifest", "manifest_sha256", "fragments"}
        or bundle["schema"] != SCHEMA
    ):
        raise CodecError(
            "bundle must have the exact dna-fragments/v1 fields and schema"
        )
    manifest = _validate_manifest(bundle["manifest"], bundle["manifest_sha256"])
    chunks, parity_descriptors = manifest["chunks"], manifest["parity"]
    fragments = bundle["fragments"]
    if not isinstance(fragments, list) or len(fragments) > len(chunks) + len(
        parity_descriptors
    ):
        raise CodecError("fragment list exceeds the manifest's bounded count")
    seen: set[tuple[str, int]] = set()
    data: dict[int, bytes] = {}
    parity: dict[int, bytes] = {}
    invalid: list[dict[str, object]] = []
    for fragment in fragments:
        if not isinstance(fragment, dict) or set(fragment) != {
            "kind",
            "index",
            "record",
        }:
            raise CodecError("fragment must have exactly kind, index and record")
        kind, index = fragment["kind"], fragment["index"]
        if kind not in ("data", "parity") or type(index) is not int:
            raise CodecError("fragment kind/index is invalid")
        count = len(chunks) if kind == "data" else len(parity_descriptors)
        if not 0 <= index < count:
            raise CodecError("fragment index is outside the manifest")
        identity = (kind, index)
        if identity in seen:
            raise CodecError(f"duplicate fragment {kind}:{index}")
        seen.add(identity)
        expected_length = (
            chunks[index]["byte_length"] if kind == "data" else CHUNK_BYTES
        )
        expected_sha = (
            chunks[index]["sha256"] if kind == "data" else parity_descriptors[index]
        )
        try:
            record = fragment["record"]
            # Check size before decoding to prevent a full-file record in one fragment.
            if (
                not isinstance(record, dict)
                or record.get("byte_length") != expected_length
            ):
                raise CodecError("record length does not match fragment manifest")
            block = decode_record(record)
            if _sha(block) != expected_sha:
                raise CodecError("fragment checksum does not match manifest")
        except CodecError as error:
            invalid.append({"kind": kind, "index": index, "reason": str(error)})
            continue
        (data if kind == "data" else parity)[index] = block
    missing_parity = [i for i in range(len(parity_descriptors)) if i not in parity]
    erasure_reasons = list(invalid)
    for kind, count in (("data", len(chunks)), ("parity", len(parity_descriptors))):
        erasure_reasons.extend(
            {"kind": kind, "index": i, "reason": "missing"}
            for i in range(count)
            if (kind, i) not in seen
        )
    erasure_reasons.sort(key=lambda value: (value["kind"], value["index"]))
    reasons = {
        (item["kind"], item["index"]): item["reason"] for item in erasure_reasons
    }
    steps: list[dict[str, object]] = []
    for group in range(len(parity_descriptors)):
        indices = list(
            range(group * GROUP_SIZE, min((group + 1) * GROUP_SIZE, len(chunks)))
        )
        missing = [index for index in indices if index not in data]
        if not missing:
            continue
        if len(missing) > 1:
            raise CodecError(
                f"group {group} unrecoverable: data fragments unavailable {missing}"
            )
        if group not in parity:
            raise CodecError(
                f"group {group} needs valid parity for data fragment {missing[0]}"
            )
        index = missing[0]
        known = [i for i in indices if i != index]
        padded = xor_blocks([parity[group], *(data[i] for i in known)])
        length = chunks[index]["byte_length"]
        if any(padded[length:]):
            raise CodecError(f"recovery of fragment {index} has nonzero padding")
        block = padded[:length]
        if _sha(block) != chunks[index]["sha256"]:
            raise CodecError(f"recovery checksum mismatch for data fragment {index}")
        data[index] = block
        steps.append(
            {
                "index": index,
                "parity_index": group,
                "used_data_indices": known,
                "verified_sha256": _sha(block),
                "erasure_reason": reasons[("data", index)],
            }
        )
    output = b"".join(data[i] for i in range(len(chunks)))
    if len(output) != manifest["byte_length"] or _sha(output) != manifest["sha256"]:
        raise CodecError("whole-file length or checksum mismatch")
    invalid.sort(key=lambda value: (value["kind"], value["index"]))
    report = {
        "byte_length": len(output),
        "sha256": _sha(output),
        "verified": True,
        "received_fragments": len(fragments),
        "data_fragments": len(chunks),
        "recovered_indices": [step["index"] for step in steps],
        "missing_parity_indices": missing_parity,
        "invalid_fragments": invalid,
        "erasure_reasons": erasure_reasons,
        "recovery_steps": steps,
    }
    return output, report


def load_bundle(data: bytes) -> object:
    if len(data) > MAX_BUNDLE_BYTES:
        raise CodecError("bundle document exceeds the8MiB limit")
    try:
        return json.loads(data.decode("utf-8"), object_pairs_hook=_unique_object)
    except CodecError:
        raise
    except (ValueError, RecursionError) as error:
        raise CodecError(
            "bundle must be valid UTF-8 JSON with bounded nesting"
        ) from error


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    encode = commands.add_parser("encode", help="create indexed data/parity records")
    source = encode.add_mutually_exclusive_group()
    source.add_argument("--text", help="encode UTF-8 text instead of input bytes")
    source.add_argument("--input", default="-", help="input file; '-' is stdin")
    encode.add_argument("--output", help="new bundle file; default stdout")
    decode = commands.add_parser(
        "decode", help="recover verified bytes; JSON recovery report goes to stderr"
    )
    decode.add_argument("--input", default="-", help="bundle file; '-' is stdin")
    decode.add_argument("--output", help="new binary output file; default stdout")
    args = parser.parse_args(argv)
    try:
        report = None
        if args.command == "encode":
            data = (
                args.text.encode("utf-8")
                if args.text is not None
                else _read(args.input, MAX_BYTES)
            )
            output = (
                json.dumps(encode_bundle(data), sort_keys=True, separators=(",", ":"))
                + "\n"
            ).encode()
        else:
            output, report = recover_bundle(
                load_bundle(_read(args.input, MAX_BUNDLE_BYTES))
            )
        if args.output:
            with Path(args.output).open("xb") as destination:
                destination.write(output)
        else:
            sys.stdout.buffer.write(output)
        if report is not None:
            print(json.dumps(report, sort_keys=True), file=sys.stderr)
    except UnicodeError:
        print("DNA fragments: text must be valid UTF-8", file=sys.stderr)
        return 2
    except (CodecError, OSError) as error:
        print(f"DNA fragments: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
