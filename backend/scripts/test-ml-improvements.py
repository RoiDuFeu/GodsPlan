#!/usr/bin/env python3
"""
Test script for ML extractor improvements

Tests the following enhancements:
1. Email pattern (case-insensitive)
2. Address extraction
3. Weekday range parsing
4. Improved priest name extraction (Recteur, Vicaire, Aumônier + particles)
"""

import sys
import json
from pathlib import Path

# Add workspace venv for Scrapling
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

# Import the extractor (load directly from file)
import importlib.util
spec = importlib.util.spec_from_file_location("ml_extractor", Path(__file__).parent / "ml-extractor.py")
ml_extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ml_extractor)
MLChurchExtractor = ml_extractor.MLChurchExtractor

# Test cases
TEST_CASES = [
    {
        "name": "Email detection (case-insensitive)",
        "html": """
        <html>
            <body>
                <p>Contact: PAROISSE@EXAMPLE.COM ou contact@church.FR</p>
                <p>Autre email: Info@Notre-Dame.Org</p>
            </body>
        </html>
        """,
        "expected": {
            "email": True,
            "count": "at least 1"
        }
    },
    {
        "name": "Address extraction (basic)",
        "html": """
        <html>
            <body>
                <p>Adresse: 5 rue de la Paix, 75002 Paris</p>
                <p>Horaires: Lundi 9h-12h</p>
            </body>
        </html>
        """,
        "expected": {
            "address": True,
            "contains": "rue de la Paix"
        }
    },
    {
        "name": "Address extraction (various types)",
        "html": """
        <html>
            <body>
                <p>Église située au 12 avenue Victor Hugo, 75016 Paris</p>
                <p>Téléphone: 01 23 45 67 89</p>
            </body>
        </html>
        """,
        "expected": {
            "address": True,
            "contains": "avenue"
        }
    },
    {
        "name": "Weekday range parsing (lundi-vendredi)",
        "html": """
        <html>
            <body>
                <h2>Horaires des messes</h2>
                <p>Du lundi au vendredi: 18h30</p>
                <p>Samedi: 19h00</p>
                <p>Dimanche: 9h00 et 11h00</p>
            </body>
        </html>
        """,
        "expected": {
            "mass_times": True,
            "days": ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
            "min_count": 5  # Should have at least 5 entries (lundi-vendredi)
        }
    },
    {
        "name": "Weekday range (samedi-dimanche)",
        "html": """
        <html>
            <body>
                <p>Messes du samedi au dimanche: 10h00</p>
            </body>
        </html>
        """,
        "expected": {
            "mass_times": True,
            "days": ["Samedi", "Dimanche"],
            "min_count": 2
        }
    },
    {
        "name": "Priest name (Recteur)",
        "html": """
        <html>
            <body>
                <p>Recteur Jean-Paul Dupont</p>
                <p>Contacts disponibles sur demande</p>
            </body>
        </html>
        """,
        "expected": {
            "priest_name": True,
            "contains": "Dupont"
        }
    },
    {
        "name": "Priest name (Vicaire)",
        "html": """
        <html>
            <body>
                <p>Vicaire Pierre de La Fontaine assure les confessions</p>
            </body>
        </html>
        """,
        "expected": {
            "priest_name": True,
            "contains": "de La Fontaine"
        }
    },
    {
        "name": "Priest name (Aumônier with particle)",
        "html": """
        <html>
            <body>
                <p>Aumônier: Père Michel du Pont</p>
            </body>
        </html>
        """,
        "expected": {
            "priest_name": True,
            "contains": "du Pont"
        }
    },
    {
        "name": "Complete church example",
        "html": """
        <html>
            <body>
                <h1>Paroisse Notre-Dame de la Gare</h1>
                <p>Adresse: 22 rue de la Gare, 75013 Paris</p>
                <p>Contact: paroisse.notredame@diocese.fr</p>
                <p>Téléphone: 01 45 67 89 10</p>
                
                <h2>Équipe</h2>
                <p>Curé: Père François de Saint-Martin</p>
                <p>Vicaire: Abbé Thomas Leroy</p>
                
                <h2>Horaires des messes</h2>
                <p>Du lundi au vendredi: 18h30</p>
                <p>Samedi: 18h00</p>
                <p>Dimanche: 9h30, 11h00 et 18h30</p>
                
                <h2>Confessions</h2>
                <p>Samedi: 17h00-18h00</p>
            </body>
        </html>
        """,
        "expected": {
            "email": True,
            "phone": True,
            "address": True,
            "priest_name": True,
            "mass_times": True,
            "confession_times": True,
            "mass_count": 8  # 5 weekdays + 1 saturday + 2 sunday
        }
    }
]


def run_tests():
    """Run all test cases"""
    extractor = MLChurchExtractor()
    
    print("=" * 80)
    print("🧪 ML Extractor Improvements - Test Suite")
    print("=" * 80)
    print()
    
    results = {
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    for i, test_case in enumerate(TEST_CASES, 1):
        test_name = test_case["name"]
        html = test_case["html"]
        expected = test_case["expected"]
        
        print(f"[{i}/{len(TEST_CASES)}] Testing: {test_name}")
        
        # Extract data
        data = extractor.extract(html, church_name=f"Test_{i}")
        
        # Validate expectations
        passed = True
        errors = []
        
        # Check email
        if "email" in expected:
            if expected["email"] and not data.email:
                passed = False
                errors.append("❌ Email not extracted")
            elif expected["email"] and data.email:
                print(f"   ✅ Email detected: {data.email}")
        
        # Check phone
        if "phone" in expected:
            if expected["phone"] and not data.phone:
                passed = False
                errors.append("❌ Phone not extracted")
            elif expected["phone"] and data.phone:
                print(f"   ✅ Phone detected: {data.phone}")
        
        # Check address
        if "address" in expected:
            if expected["address"] and not data.address:
                passed = False
                errors.append("❌ Address not extracted")
            elif expected["address"] and data.address:
                print(f"   ✅ Address detected: {data.address}")
                
                # Check contains
                if "contains" in expected:
                    if isinstance(expected["contains"], list):
                        for keyword in expected["contains"]:
                            if keyword not in data.address:
                                passed = False
                                errors.append(f"❌ Address missing keyword: {keyword}")
                    elif expected["contains"] not in data.address:
                        passed = False
                        errors.append(f"❌ Address missing keyword: {expected['contains']}")
        
        # Check priest name
        if "priest_name" in expected:
            if expected["priest_name"] and not data.priest_name:
                passed = False
                errors.append("❌ Priest name not extracted")
            elif expected["priest_name"] and data.priest_name:
                print(f"   ✅ Priest name detected: {data.priest_name}")
                
                # Check contains
                if "contains" in expected and expected["contains"] not in data.priest_name:
                    passed = False
                    errors.append(f"❌ Priest name doesn't contain: {expected['contains']}")
        
        # Check mass times
        if "mass_times" in expected:
            if expected["mass_times"] and not data.mass_times:
                passed = False
                errors.append("❌ Mass times not extracted")
            elif expected["mass_times"] and data.mass_times:
                count = len(data.mass_times)
                print(f"   ✅ Mass times detected: {count} entries")
                
                # Check min count
                if "min_count" in expected and count < expected["min_count"]:
                    passed = False
                    errors.append(f"❌ Mass times count too low: {count} < {expected['min_count']}")
                
                # Check specific days
                if "days" in expected:
                    extracted_days = [mt['day'] for mt in data.mass_times if mt['day']]
                    for day in expected["days"]:
                        if day not in extracted_days:
                            passed = False
                            errors.append(f"❌ Missing day: {day}")
                
                # Check exact count
                if "mass_count" in expected and count != expected["mass_count"]:
                    passed = False
                    errors.append(f"❌ Mass count mismatch: {count} != {expected['mass_count']}")
                
                # Show extracted times
                for mt in data.mass_times[:5]:  # Show first 5
                    print(f"      - {mt['day']}: {mt['time']}")
                if count > 5:
                    print(f"      ... and {count - 5} more")
        
        # Check confession times
        if "confession_times" in expected:
            if expected["confession_times"] and not data.confession_times:
                passed = False
                errors.append("❌ Confession times not extracted")
            elif expected["confession_times"] and data.confession_times:
                print(f"   ✅ Confession times detected: {len(data.confession_times)} entries")
        
        # Print errors
        for error in errors:
            print(f"   {error}")
        
        # Result
        if passed:
            print(f"   ✅ PASSED")
            results["passed"] += 1
        else:
            print(f"   ❌ FAILED")
            results["failed"] += 1
        
        results["tests"].append({
            "name": test_name,
            "passed": passed,
            "errors": errors
        })
        
        print()
    
    # Summary
    print("=" * 80)
    print("📊 Test Summary")
    print("=" * 80)
    print(f"✅ Passed: {results['passed']}/{len(TEST_CASES)}")
    print(f"❌ Failed: {results['failed']}/{len(TEST_CASES)}")
    print(f"📈 Success rate: {results['passed'] / len(TEST_CASES) * 100:.1f}%")
    print()
    
    # Save results
    output_file = Path(__file__).parent / "test-results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Results saved to: {output_file}")
    print()
    
    return results["failed"] == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
