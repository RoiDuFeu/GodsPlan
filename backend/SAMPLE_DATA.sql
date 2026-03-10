-- Sample churches data for testing
-- Paris churches with real coordinates

INSERT INTO churches (name, description, address, location, latitude, longitude, contact, "massSchedules", rites, languages, "reliabilityScore", "isActive")
VALUES 
(
    'Notre-Dame de Paris',
    'Cathédrale emblématique de Paris, chef-d''œuvre de l''architecture gothique.',
    '{"street": "6 Parvis Notre-Dame - Pl. Jean-Paul II", "postalCode": "75004", "city": "Paris", "district": "4e arrondissement"}'::jsonb,
    ST_GeogFromText('POINT(2.3499 48.8530)'),
    48.8530,
    2.3499,
    '{"phone": "+33 1 42 34 56 10", "website": "https://www.notredamedeparis.fr"}'::jsonb,
    '[
        {"dayOfWeek": 0, "time": "08:30", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "10:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "11:30", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "18:30", "rite": "french_paul_vi", "language": "French"}
    ]'::jsonb,
    ARRAY['french_paul_vi']::text[],
    ARRAY['French', 'English']::text[],
    85,
    true
),
(
    'Sacré-Cœur de Montmartre',
    'Basilique du Sacré-Cœur au sommet de la butte Montmartre.',
    '{"street": "35 Rue du Chevalier de la Barre", "postalCode": "75018", "city": "Paris", "district": "18e arrondissement"}'::jsonb,
    ST_GeogFromText('POINT(2.3431 48.8867)'),
    48.8867,
    2.3431,
    '{"phone": "+33 1 53 41 89 00", "website": "https://www.sacre-coeur-montmartre.com"}'::jsonb,
    '[
        {"dayOfWeek": 0, "time": "07:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "11:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "18:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "22:00", "rite": "french_paul_vi", "language": "French"}
    ]'::jsonb,
    ARRAY['french_paul_vi']::text[],
    ARRAY['French', 'English', 'Italian']::text[],
    90,
    true
),
(
    'Saint-Sulpice',
    'Église majestueuse du quartier Latin, l''une des plus grandes églises de Paris.',
    '{"street": "2 Rue Palatine", "postalCode": "75006", "city": "Paris", "district": "6e arrondissement"}'::jsonb,
    ST_GeogFromText('POINT(2.3347 48.8509)'),
    48.8509,
    2.3347,
    '{"phone": "+33 1 42 34 59 98", "website": "https://www.paroisse-saint-sulpice-paris.fr"}'::jsonb,
    '[
        {"dayOfWeek": 0, "time": "09:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "11:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "19:00", "rite": "french_paul_vi", "language": "French"}
    ]'::jsonb,
    ARRAY['french_paul_vi']::text[],
    ARRAY['French']::text[],
    80,
    true
),
(
    'Sainte-Chapelle',
    'Joyau de l''architecture gothique rayonnante, connue pour ses vitraux exceptionnels.',
    '{"street": "8 Boulevard du Palais", "postalCode": "75001", "city": "Paris", "district": "1er arrondissement"}'::jsonb,
    ST_GeogFromText('POINT(2.3450 48.8555)'),
    48.8555,
    2.3450,
    '{"website": "https://www.sainte-chapelle.fr"}'::jsonb,
    '[]'::jsonb,
    ARRAY['french_paul_vi']::text[],
    ARRAY['French']::text[],
    75,
    true
),
(
    'Saint-Eustache',
    'Église Renaissance dans le quartier des Halles, célèbre pour son architecture et son orgue.',
    '{"street": "2 Impasse Saint-Eustache", "postalCode": "75001", "city": "Paris", "district": "1er arrondissement"}'::jsonb,
    ST_GeogFromText('POINT(2.3458 48.8634)'),
    48.8634,
    2.3458,
    '{"phone": "+33 1 42 36 31 05", "website": "https://www.saint-eustache.org"}'::jsonb,
    '[
        {"dayOfWeek": 0, "time": "09:30", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "11:00", "rite": "french_paul_vi", "language": "French"},
        {"dayOfWeek": 0, "time": "18:00", "rite": "french_paul_vi", "language": "French"}
    ]'::jsonb,
    ARRAY['french_paul_vi']::text[],
    ARRAY['French']::text[],
    85,
    true
);

-- Run this script with:
-- docker exec -i godsplan-db psql -U godsplan -d godsplan < SAMPLE_DATA.sql
