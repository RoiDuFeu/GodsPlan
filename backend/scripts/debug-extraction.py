#!/usr/bin/env python3
"""Debug extraction to see what's happening"""

import sys
from pathlib import Path

sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

import importlib.util
spec = importlib.util.spec_from_file_location("ml_extractor", Path(__file__).parent / "ml-extractor.py")
ml_extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ml_extractor)
MLChurchExtractor = ml_extractor.MLChurchExtractor

html = """
<html>
    <body>
        <h2>Horaires des messes</h2>
        <p>Du lundi au vendredi: 18h30</p>
        <p>Samedi: 19h00</p>
        <p>Dimanche: 9h00 et 11h00</p>
    </body>
</html>
"""

extractor = MLChurchExtractor()

# Step 1: Clean HTML
text = extractor.clean_text(html)
print("=" * 80)
print("CLEANED TEXT:")
print("=" * 80)
print(repr(text))
print()

# Step 2: Check pattern matches
print("=" * 80)
print("PATTERN MATCHES:")
print("=" * 80)

# Mass keyword
mass_matches = list(extractor.PATTERNS['mass_keyword'].finditer(text))
print(f"Mass keywords: {len(mass_matches)} found")
for m in mass_matches:
    print(f"  - '{m.group()}' at position {m.start()}")

# Day range
day_range_matches = list(extractor.PATTERNS['day_range'].finditer(text))
print(f"\nDay ranges: {len(day_range_matches)} found")
for m in day_range_matches:
    print(f"  - '{m.group()}' → groups: {m.groups()}")

# Individual days
day_matches = list(extractor.PATTERNS['day'].finditer(text))
print(f"\nIndividual days: {len(day_matches)} found")
for m in day_matches:
    print(f"  - '{m.group()}' at position {m.start()}")

# Times
time_matches = list(extractor.PATTERNS['time'].finditer(text))
print(f"\nTimes: {len(time_matches)} found")
for m in time_matches:
    print(f"  - '{m.group()}' → groups: {m.groups()}")

print()

# Step 3: Extract mass times
print("=" * 80)
print("MASS TIMES EXTRACTION:")
print("=" * 80)
mass_times = extractor.extract_mass_times(text)
print(f"Extracted {len(mass_times)} mass times:")
for mt in mass_times:
    print(f"  - {mt}")
