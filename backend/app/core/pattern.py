"""
Utility for compiling voyage creation rule patterns and extracting dates from
external trip IDs.

Supported tokens:
  {YYYY}  - 4-digit year  (named group: year)
  {MM}    - 2-digit month (named group: month)
  {DD}    - 2-digit day   (named group: day)
  {*}     - Wildcard: matches any run of characters that are not a common
            separator (dash, underscore, forward-slash).  Useful for segments
            whose value does not matter for matching (e.g. customer codes,
            ship identifiers).

Example pattern:
  HEL-TLL-{YYYY}-{MM}-{DD}  matches  HEL-TLL-2026-04-10
  {*}-{YYYY}{MM}{DD}         matches  NL123-20260410
"""

import re
from datetime import date
from typing import Optional

# Map each token to the regex fragment it expands to.
# Order matters: more specific tokens must come before {*}.
_TOKEN_MAP = {
    "{YYYY}": r"(?P<year>\d{4})",
    "{MM}":   r"(?P<month>\d{2})",
    "{DD}":   r"(?P<day>\d{2})",
    "{*}":    r"[^\\-_/]+",
}


def compile_pattern(pattern: str) -> re.Pattern:
    """
    Compile a voyage creation rule pattern string into a regular expression.

    Each recognised token is replaced with the appropriate regex fragment;
    all other characters are escaped so they are treated as literals.

    Raises ValueError if the pattern contains an unrecognised {…} placeholder.
    """
    # Split on recognised tokens so we can escape the non-token parts.
    # We'll build the regex incrementally.
    remaining = pattern
    regex_parts: list[str] = []

    # Recognised token strings in the order we want to try them.
    tokens = list(_TOKEN_MAP.keys())

    # Check for unknown {…} placeholders before proceeding.
    unknown = re.findall(r"\{[^}]+\}", pattern)
    unrecognised = [t for t in unknown if t not in _TOKEN_MAP]
    if unrecognised:
        raise ValueError(
            f"Unrecognised pattern token(s): {', '.join(unrecognised)}. "
            f"Supported tokens: {', '.join(tokens)}"
        )

    while remaining:
        # Find the earliest token occurrence.
        earliest_pos = len(remaining)
        earliest_token = None
        for token in tokens:
            pos = remaining.find(token)
            if pos != -1 and pos < earliest_pos:
                earliest_pos = pos
                earliest_token = token

        if earliest_token is None:
            # No more tokens — escape the rest as a literal.
            regex_parts.append(re.escape(remaining))
            break

        # Escape the literal prefix before the token.
        if earliest_pos > 0:
            regex_parts.append(re.escape(remaining[:earliest_pos]))

        # Append the token's regex fragment.
        regex_parts.append(_TOKEN_MAP[earliest_token])

        # Advance past the token.
        remaining = remaining[earliest_pos + len(earliest_token):]

    full_regex = "^" + "".join(regex_parts) + "$"
    return re.compile(full_regex)


def extract_departure_date(pattern: str, external_trip_id: str) -> Optional[date]:
    """
    Try to match *external_trip_id* against *pattern* and extract a
    departure date from the {YYYY}, {MM}, {DD} tokens.

    Returns a :class:`datetime.date` if the pattern matches and all three
    date tokens are present, otherwise returns None.
    """
    try:
        compiled = compile_pattern(pattern)
    except ValueError:
        return None

    match = compiled.match(external_trip_id)
    if not match:
        return None

    groups = match.groupdict()
    if not all(k in groups for k in ("year", "month", "day")):
        # Pattern matched but does not contain all three date tokens.
        return None

    try:
        return date(int(groups["year"]), int(groups["month"]), int(groups["day"]))
    except ValueError:
        # e.g. month=13 or day=32 — invalid calendar date.
        return None
