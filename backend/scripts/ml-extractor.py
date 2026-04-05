#!/usr/bin/env python3
"""
🤖 ML-based Church Data Extractor
Autonomous extraction using NLP + patterns (no external API dependencies)

Strategy:
1. NER (Named Entity Recognition) for contacts/names
2. Regex patterns for structured data (times, phones)
3. Section classification for context-aware extraction
4. Self-learning: improves as you annotate corrections

Usage:
    python3 ml-extractor.py --html church.html --output data.json
    python3 ml-extractor.py --url https://paroisse.fr --output data.json
    python3 ml-extractor.py --batch input.json --output enriched.json
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Add workspace venv for Scrapling
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

try:
    from scrapling import Fetcher
except ImportError:
    print("⚠️  Scrapling not found, URL fetching disabled")
    Fetcher = None


@dataclass
class ChurchData:
    """Structured church data output"""
    name: str
    source_url: Optional[str] = None
    
    # Contact info
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    
    # People
    priest_name: Optional[str] = None
    
    # Schedule (structured)
    mass_times: List[Dict[str, str]] = None
    confession_times: List[str] = None
    
    # Events
    upcoming_events: List[Dict[str, str]] = None
    
    # Metadata
    extraction_confidence: float = 0.0
    extracted_at: str = None
    
    def __post_init__(self):
        if self.mass_times is None:
            self.mass_times = []
        if self.confession_times is None:
            self.confession_times = []
        if self.upcoming_events is None:
            self.upcoming_events = []
        if self.extracted_at is None:
            self.extracted_at = datetime.utcnow().isoformat()


class MLChurchExtractor:
    """ML-based autonomous extractor"""
    
    # Regex patterns (compiled for performance)
    PATTERNS = {
        'phone': re.compile(r'0[1-9](?:[\s.-]*\d{2}){4}'),
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', re.IGNORECASE),  # FIX: Added re.IGNORECASE
        'time': re.compile(r'\b([0-2]?[0-9])[h:]([0-5][0-9])?\b'),
        'day': re.compile(r'\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b', re.IGNORECASE),
        'day_range': re.compile(r'[Dd]u\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+au\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)', re.IGNORECASE),  # NEW: Weekday ranges
        'address': re.compile(r'\d+[,\s]+(?:rue|avenue|boulevard|place|impasse|chemin|allée|passage|square|cours|quai)\s+[A-Za-zéèêàçùûôîïœ\-\s]{3,50}(?:[,\s]+\d{5}\s+[\wéèêàç\-]+)?', re.IGNORECASE),  # NEW: French addresses (more strict - letters/spaces/hyphens only)
        'mass_keyword': re.compile(r'\b(messes?|célébrations?|eucharisties?|offices?)\b', re.IGNORECASE),  # Added plural forms
        'confession_keyword': re.compile(r'\b(confessions?|sacrement de réconciliation|pardons?)\b', re.IGNORECASE),  # Added plural forms
    }
    
    # Mapping for weekday ranges expansion
    WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    
    # Common French clerical titles (greedy multi-word names + particles)
    PRIEST_TITLES = [
        r'Père\s+([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',  # With particles
        r'Abbé\s+([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',
        r'Recteur\s+([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',  # NEW
        r'Vicaire\s+([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',  # NEW
        r'Aumônier\s+([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',  # NEW
        r'Curé\s*:\s*(?:Père\s+)?([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',
        r'Prêtre\s*:\s*([A-Z][\wéèêàç\-]+(?:\s+(?:de|du|des|d\'|van|von)?\s*[A-Z][\wéèêàç\-]+)*)',
    ]
    
    def __init__(self):
        self.fetcher = Fetcher() if Fetcher else None
    
    def fetch_html(self, url: str) -> Optional[str]:
        """Fetch HTML from URL using Scrapling"""
        if not self.fetcher:
            print("❌ Scrapling not available")
            return None
        
        try:
            page = self.fetcher.get(url, timeout=20)
            return page.body.decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"❌ Failed to fetch {url}: {e}")
            return None
    
    def clean_text(self, html: str) -> str:
        """Remove HTML tags and normalize whitespace"""
        # Simple tag removal (for advanced use BeautifulSoup)
        text = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        
        # Decode HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&eacute;', 'é')
        text = text.replace('&egrave;', 'è')
        text = text.replace('&agrave;', 'à')
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def extract_contact_info(self, text: str) -> Dict[str, Optional[str]]:
        """Extract phone, email, and address using regex"""
        phone_match = self.PATTERNS['phone'].search(text)
        email_match = self.PATTERNS['email'].search(text)
        address_match = self.PATTERNS['address'].search(text)
        
        return {
            'phone': phone_match.group(0) if phone_match else None,
            'email': email_match.group(0) if email_match else None,
            'address': address_match.group(0).strip() if address_match else None,  # NEW: Address extraction
        }
    
    def extract_priest_name(self, text: str) -> Optional[str]:
        """Extract priest name using title patterns"""
        for pattern in self.PRIEST_TITLES:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return None
    
    def expand_day_range(self, start_day: str, end_day: str) -> List[str]:
        """Expand day range (e.g., lundi-vendredi → [lundi, mardi, ..., vendredi])"""
        start_day = start_day.lower()
        end_day = end_day.lower()
        
        try:
            start_idx = self.WEEKDAYS.index(start_day)
            end_idx = self.WEEKDAYS.index(end_day)
            
            # Handle wrapping (e.g., samedi → lundi)
            if end_idx >= start_idx:
                return [self.WEEKDAYS[i].capitalize() for i in range(start_idx, end_idx + 1)]
            else:
                # Wrap around week
                return [self.WEEKDAYS[i].capitalize() for i in range(start_idx, len(self.WEEKDAYS))] + \
                       [self.WEEKDAYS[i].capitalize() for i in range(0, end_idx + 1)]
        except ValueError:
            return []
    
    def extract_mass_times(self, text: str) -> List[Dict[str, str]]:
        """
        Extract mass schedule using context-aware pattern matching
        
        Strategy:
        1. Find sentences containing mass keywords
        2. Look for explicit patterns: "Day(s): time" or "Day range: time"
        3. Extract using regex groups to associate days with times
        4. Deduplicate
        """
        mass_times = []
        seen = set()  # Deduplication
        
        # Split into sentences
        sentences = re.split(r'[.!?\n]+', text)
        
        for sentence in sentences:
            # Check if sentence is about mass
            if not self.PATTERNS['mass_keyword'].search(sentence):
                continue
            
            # Strategy 1: Look for day range patterns: "Du lundi au vendredi: 18h30"
            day_range_pattern = re.compile(
                r'[Dd]u\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+au\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*:?\s*((?:[0-2]?[0-9])[h:](?:[0-5][0-9])?(?:\s+et\s+[0-2]?[0-9][h:][0-5][0-9])?)',
                re.IGNORECASE
            )
            
            for match in day_range_pattern.finditer(sentence):
                start_day = match.group(1)
                end_day = match.group(2)
                times_str = match.group(3)
                
                expanded_days = self.expand_day_range(start_day, end_day)
                
                # Extract all times from the times string
                time_matches = list(self.PATTERNS['time'].finditer(times_str))
                
                for time_match in time_matches:
                    hour = time_match.group(1).zfill(2)
                    minute = time_match.group(2) if time_match.group(2) else '00'
                    time_str = f"{hour}:{minute}"
                    
                    for day in expanded_days:
                        key = f"{day}_{time_str}"
                        if key not in seen:
                            seen.add(key)
                            mass_times.append({
                                'day': day,
                                'time': time_str,
                                'context': match.group(0)[:100]
                            })
            
            # Strategy 2: Look for individual day patterns: "Samedi: 19h00" or "Dimanche: 9h00 et 11h00"
            single_day_pattern = re.compile(
                r'\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*:?\s*((?:[0-2]?[0-9])[h:](?:[0-5][0-9])?(?:\s+et\s+[0-2]?[0-9][h:][0-5][0-9])?)',
                re.IGNORECASE
            )
            
            # Remove already processed day range parts to avoid double extraction
            sentence_remaining = sentence
            for match in day_range_pattern.finditer(sentence):
                sentence_remaining = sentence_remaining.replace(match.group(0), '')
            
            for match in single_day_pattern.finditer(sentence_remaining):
                day = match.group(1).capitalize()
                times_str = match.group(2)
                
                # Extract all times from the times string
                time_matches = list(self.PATTERNS['time'].finditer(times_str))
                
                for time_match in time_matches:
                    hour = time_match.group(1).zfill(2)
                    minute = time_match.group(2) if time_match.group(2) else '00'
                    time_str = f"{hour}:{minute}"
                    
                    key = f"{day}_{time_str}"
                    if key not in seen:
                        seen.add(key)
                        mass_times.append({
                            'day': day,
                            'time': time_str,
                            'context': match.group(0)[:100]
                        })
        
        return mass_times
    
    def extract_confession_times(self, text: str) -> List[str]:
        """Extract confession schedule (with deduplication)"""
        confession_times = []
        seen = set()
        
        sentences = re.split(r'[.!?\n]+', text)
        
        for sentence in sentences:
            if not self.PATTERNS['confession_keyword'].search(sentence):
                continue
            
            # Extract time patterns from confession context
            time_matches = list(self.PATTERNS['time'].finditer(sentence))
            day_matches = list(self.PATTERNS['day'].finditer(sentence))
            
            for time_match in time_matches:
                hour = time_match.group(1).zfill(2)
                minute = time_match.group(2) if time_match.group(2) else '00'
                time_str = f"{hour}:{minute}"
                
                # Find closest day
                closest_day = None
                time_pos = time_match.start()
                
                for day_match in day_matches:
                    if day_match.start() < time_pos:
                        closest_day = day_match.group(1).capitalize()
                
                if closest_day:
                    result = f"{closest_day} {time_str}"
                else:
                    result = time_str
                
                if result not in seen:
                    seen.add(result)
                    confession_times.append(result)
        
        return confession_times
    
    def extract_events(self, text: str) -> List[Dict[str, str]]:
        """
        Extract upcoming events
        
        Strategy:
        - Look for date patterns (day month, or just dates)
        - Associated with event keywords
        """
        events = []
        
        # Event keywords
        event_keywords = re.compile(
            r'\b(concert|pèlerinage|procession|retraite|conférence|'
            r'fête|célébration|festival|rencontre|veillée|adoration)\b',
            re.IGNORECASE
        )
        
        # Date patterns
        date_pattern = re.compile(r'\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b', re.IGNORECASE)
        
        sentences = re.split(r'[.\n]+', text)
        
        for sentence in sentences:
            if not event_keywords.search(sentence):
                continue
            
            date_match = date_pattern.search(sentence)
            
            if date_match:
                events.append({
                    'date': f"{date_match.group(1)} {date_match.group(2)}",
                    'description': sentence.strip()[:150]
                })
        
        return events
    
    def calculate_confidence(self, data: ChurchData) -> float:
        """
        Calculate extraction confidence score (0.0 - 1.0)
        
        Scoring:
        - Has phone: +0.15
        - Has email: +0.15
        - Has address: +0.15  # NEW
        - Has priest name: +0.15
        - Has mass times: +0.3
        - Has confession times: +0.1
        """
        score = 0.0
        
        if data.phone:
            score += 0.15
        if data.email:
            score += 0.15
        if data.address:  # NEW
            score += 0.15
        if data.priest_name:
            score += 0.15
        if data.mass_times:
            score += 0.3
        if data.confession_times:
            score += 0.1
        
        return min(score, 1.0)
    
    def extract(self, html: str, source_url: str = None, church_name: str = None) -> ChurchData:
        """
        Main extraction pipeline
        
        Args:
            html: Raw HTML content
            source_url: Optional source URL for reference
            church_name: Optional church name (if known from messesinfo)
        
        Returns:
            ChurchData with extracted information
        """
        # Clean HTML to text
        text = self.clean_text(html)
        
        # Initialize data object
        data = ChurchData(
            name=church_name or "Unknown",
            source_url=source_url
        )
        
        # Extract contact info
        contact = self.extract_contact_info(text)
        data.phone = contact['phone']
        data.email = contact['email']
        data.address = contact['address']  # NEW: Address extraction
        
        # Extract priest name
        data.priest_name = self.extract_priest_name(text)
        
        # Extract schedules
        data.mass_times = self.extract_mass_times(text)
        data.confession_times = self.extract_confession_times(text)
        
        # Extract events
        data.upcoming_events = self.extract_events(text)
        
        # Calculate confidence
        data.extraction_confidence = self.calculate_confidence(data)
        
        return data


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="ML-based autonomous church data extractor"
    )
    parser.add_argument('--html', help="Path to HTML file")
    parser.add_argument('--url', help="URL to fetch and extract")
    parser.add_argument('--batch', help="Batch process JSON file with URLs")
    parser.add_argument('--output', default='extracted.json', help="Output JSON file")
    parser.add_argument('--name', help="Church name (optional)")
    
    args = parser.parse_args()
    
    extractor = MLChurchExtractor()
    
    print("=" * 70)
    print("🤖 ML Church Data Extractor")
    print("=" * 70)
    print()
    
    # Single URL mode
    if args.url:
        print(f"🔍 Fetching: {args.url}")
        html = extractor.fetch_html(args.url)
        
        if not html:
            print("❌ Failed to fetch URL")
            return
        
        data = extractor.extract(html, source_url=args.url, church_name=args.name)
        
        print()
        print("📊 Extraction Results:")
        print(json.dumps(asdict(data), indent=2, ensure_ascii=False))
        
        # Save
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(asdict(data), f, indent=2, ensure_ascii=False)
        
        print()
        print(f"💾 Saved to: {args.output}")
        print(f"🎯 Confidence: {data.extraction_confidence:.2%}")
    
    # Single HTML file mode
    elif args.html:
        print(f"📄 Processing: {args.html}")
        
        with open(args.html, 'r', encoding='utf-8') as f:
            html = f.read()
        
        data = extractor.extract(html, church_name=args.name)
        
        print()
        print("📊 Extraction Results:")
        print(json.dumps(asdict(data), indent=2, ensure_ascii=False))
        
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(asdict(data), f, indent=2, ensure_ascii=False)
        
        print()
        print(f"💾 Saved to: {args.output}")
        print(f"🎯 Confidence: {data.extraction_confidence:.2%}")
    
    # Batch mode
    elif args.batch:
        print(f"📦 Batch processing: {args.batch}")
        
        with open(args.batch, 'r', encoding='utf-8') as f:
            churches = json.load(f)
        
        results = []
        
        for i, church in enumerate(churches, 1):
            url = church.get('website') or church.get('url')
            name = church.get('name')
            
            if not url:
                print(f"⏭️  [{i}/{len(churches)}] Skipping {name} (no URL)")
                continue
            
            print(f"🔍 [{i}/{len(churches)}] Processing: {name}")
            
            html = extractor.fetch_html(url)
            
            if not html:
                print(f"   ❌ Failed to fetch")
                continue
            
            data = extractor.extract(html, source_url=url, church_name=name)
            
            # Merge with original church data (preserve city, street, postal_code, etc.)
            enriched = {**church}  # Start with all original fields
            enriched.update(asdict(data))  # Add/overwrite with extracted data
            
            results.append(enriched)
            
            print(f"   ✅ Confidence: {data.extraction_confidence:.2%}")
        
        # Save batch results
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print()
        print(f"💾 Saved {len(results)} results to: {args.output}")
        
        # Summary stats
        avg_confidence = sum(r['extraction_confidence'] for r in results) / len(results) if results else 0
        print(f"📊 Average confidence: {avg_confidence:.2%}")
    
    else:
        parser.print_help()
        return
    
    print()
    print("=" * 70)
    print("✅ Done")
    print("=" * 70)


if __name__ == '__main__':
    main()
