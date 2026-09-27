"""Prove each check in mapping.validate() actually fires.

  python build/selftest.py

Every case below reintroduces a real defect that shipped to a user's ears before the
corresponding check existed, in the Isaac Miyamo Voices mod (2026-09-08/10). Each one
was cheap to write and none was written until after the user complained.

Keeping these here means a check cannot quietly stop working. When the user states a
new constraint, add the check to mapping.validate() AND a case here that fails without
it -- that is what stops the constraint from evaporating a second time.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import mapping

# A minimal well-formed world the cases can bend one at a time.
BASE_SOURCES = ["clip-a", "clip-b", "clip-c", "clip-d", "speech-1", "famous-1"]
BASE_TARGETS = ["hurt-1", "hurt-2", "hurt-3", "boss-roar", "pickup", "death"]
BASE_ASSIGNMENT = {
    "hurt-1": ["clip-a"],
    "hurt-2": ["clip-b"],
    "hurt-3": ["clip-c"],
    "boss-roar": ["clip-d"],
    "pickup": ["famous-1"],
    "death": ["speech-1"],
}
BASE_ROLE = {t: ("creature" if t == "boss-roar" else "player") for t in BASE_TARGETS}
BASE_GROUP = {"hurt-1": "hurt", "hurt-2": "hurt", "hurt-3": "hurt"}

CASES = []


def case(name, complaint, **overrides):
    """Register a case. `overrides` are module attributes to patch for this run."""
    CASES.append((name, complaint, overrides))


# --- the five real ones ----------------------------------------------------

case("per-source budget",
     'user, 2026-09-09 23:48: "减少 once upon a time in america 的使用率，只容许两处使用"',
     BUDGETS={"famous-1": 2},
     ASSIGNMENT={**BASE_ASSIGNMENT, "hurt-2": ["famous-1"], "hurt-3": ["famous-1"]})

case("material barred from a role",
     'user, 2026-09-09 00:14: "所有的这些音效都不要用明确有说话的，比如 baga、wusodaro"',
     NEVER_IN={"creature": ["speech-1"]},
     ASSIGNMENT={**BASE_ASSIGNMENT, "boss-roar": ["speech-1"]})

case("repeat inside a rapid group",
     'user, 2026-09-09 23:58: "不要把同一个音铺在会短时间内多次重复出现的音效上"',
     RAPID={"hurt"},
     ASSIGNMENT={**BASE_ASSIGNMENT, "hurt-2": ["clip-a"]})

case("one source taking everything",
     'user, 2026-09-10 00:02: "为什么一个 laugh 用了那么多次呢，其他的 laugh 和其他的 Long 呢"',
     ASSIGNMENT={t: ["clip-a"] for t in BASE_TARGETS})

case("chained fragments",
     'user, 2026-09-10 00:03: "不可以让串联的片段听感更碎，甚至于要避免串联的片段太多"',
     MAX_CHAIN=1,
     ASSIGNMENT={**BASE_ASSIGNMENT, "death": ["clip-a", "clip-b", "clip-c"]})

# --- structural ones -------------------------------------------------------

case("unassigned target falls back silently",
     "a target with no entry plays the original, and nothing says so",
     ASSIGNMENT={k: v for k, v in BASE_ASSIGNMENT.items() if k != "death"})

case("unknown source id",
     "a typo in a source id fails silently at build time",
     ASSIGNMENT={**BASE_ASSIGNMENT, "death": ["clip-typo"]})


def run() -> int:
    saved = {k: getattr(mapping, k) for k in (
        "SOURCES", "TARGETS", "GOOD", "FORBIDDEN", "BUDGETS", "NEVER_IN",
        "RAPID", "MAX_CHAIN", "MAX_SHARE", "ASSIGNMENT", "ROLE_OF", "GROUP_OF")}
    failures = 0
    try:
        for name, complaint, overrides in CASES:
            mapping.SOURCES = list(BASE_SOURCES)
            mapping.TARGETS = list(BASE_TARGETS)
            mapping.GOOD = ["placeholder so the skeleton check passes"]
            mapping.FORBIDDEN = ["placeholder so the skeleton check passes"]
            mapping.BUDGETS = {}
            mapping.NEVER_IN = {}
            mapping.RAPID = set()
            mapping.MAX_CHAIN = 1
            mapping.MAX_SHARE = 0.15
            mapping.ROLE_OF = dict(BASE_ROLE)
            mapping.GROUP_OF = dict(BASE_GROUP)
            mapping.ASSIGNMENT = dict(BASE_ASSIGNMENT)
            for k, v in overrides.items():
                setattr(mapping, k, v)

            problems = mapping.validate()
            if problems:
                print(f"  ok    {name}")
                print(f"          caught: {problems[0]}")
            else:
                failures += 1
                print(f"  MISS  {name}  -- the check did not fire")
                print(f"          {complaint}")

        # And the clean world must pass, or the checks are simply always-on.
        mapping.SOURCES = list(BASE_SOURCES)
        mapping.TARGETS = list(BASE_TARGETS)
        mapping.GOOD = ["placeholder"]
        mapping.FORBIDDEN = ["placeholder"]
        mapping.BUDGETS = {}
        mapping.NEVER_IN = {}
        mapping.RAPID = set()
        mapping.MAX_CHAIN = 1
        mapping.MAX_SHARE = 0.20
        mapping.ROLE_OF = dict(BASE_ROLE)
        mapping.GROUP_OF = dict(BASE_GROUP)
        mapping.ASSIGNMENT = dict(BASE_ASSIGNMENT)
        clean = mapping.validate()
        if clean:
            failures += 1
            print("  MISS  clean assignment rejected -- checks are firing on everything")
            for p in clean:
                print(f"          {p}")
        else:
            print("  ok    clean assignment passes")
    finally:
        for k, v in saved.items():
            setattr(mapping, k, v)

    print()
    if failures:
        print(f"FAIL  {failures} check(s) do not do what they claim")
        return 1
    print(f"OK    {len(CASES)} defects caught, clean case passes")
    return 0


if __name__ == "__main__":
    sys.exit(run())
