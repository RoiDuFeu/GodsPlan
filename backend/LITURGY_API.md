# Liturgy API - Frontend Integration Guide

## 📖 Overview

The Liturgy API provides daily Catholic Mass readings automatically synced from [catholic-readings-api](https://github.com/cpbjr/catholic-readings-api).

- **No API key required**
- **Auto-syncs daily** at 3 AM (next 7 days)
- **Cached in database** for fast access
- **USCCB verification links** included

---

## 🚀 API Endpoints

### Base URL
```
http://localhost:3001/api/v1/liturgy
```

### 1. Get Today's Readings
```http
GET /liturgy/today
```

**Response:**
```json
{
  "id": "uuid",
  "date": "2026-03-30T00:00:00.000Z",
  "liturgicalDay": "Holy Week",
  "liturgicalColor": "purple",
  "readings": [
    {
      "title": "First Reading",
      "reference": "Isaiah 42:1-7",
      "text": ""
    },
    {
      "title": "Psalm",
      "reference": "Psalm 27:1, 2, 3, 13-14",
      "text": ""
    },
    {
      "title": "Gospel",
      "reference": "John 12:1-11",
      "text": ""
    }
  ],
  "psalm": {
    "reference": "Psalm 27:1, 2, 3, 13-14",
    "refrain": "",
    "text": ""
  },
  "usccbLink": "https://bible.usccb.org/bible/readings/033026.cfm",
  "createdAt": "2026-03-30T03:30:00.000Z",
  "updatedAt": "2026-03-30T03:30:00.000Z"
}
```

---

### 2. Get Sunday's Readings
```http
GET /liturgy/sunday
```

Returns current Sunday if today is Sunday, otherwise next Sunday.

**Same response format as `/today`**

---

### 3. Get Specific Date
```http
GET /liturgy/:date
```

**Example:**
```
GET /liturgy/2026-04-05
```

**Date format:** `YYYY-MM-DD`

---

### 4. Manually Refresh (Admin)
```http
POST /liturgy/refresh
```

**Body (optional):**
```json
{
  "date": "2026-04-05",  // Refresh specific date
  "days": 7              // Or refresh next N days
}
```

**Response:**
```json
{
  "message": "Refreshed 7 days",
  "dates": [
    "2026-03-30",
    "2026-03-31",
    "2026-04-01",
    ...
  ]
}
```

---

## 💻 Frontend Examples

### React Component
```tsx
import { useState, useEffect } from 'react';

interface Liturgy {
  date: string;
  liturgicalDay: string;
  liturgicalColor: string;
  readings: Array<{
    title: string;
    reference: string;
    text: string;
  }>;
  usccbLink: string;
}

export function DailyReadings() {
  const [liturgy, setLiturgy] = useState<Liturgy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/liturgy/today')
      .then(res => res.json())
      .then(data => {
        setLiturgy(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load liturgy:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading today's readings...</div>;
  if (!liturgy) return <div>No readings available</div>;

  return (
    <div className="daily-readings">
      <h2>{liturgy.liturgicalDay}</h2>
      <div className="readings-list">
        {liturgy.readings.map((reading, i) => (
          <div key={i} className="reading">
            <h3>{reading.title}</h3>
            <p className="reference">{reading.reference}</p>
          </div>
        ))}
      </div>
      <a 
        href={liturgy.usccbLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="usccb-link"
      >
        Read full text on USCCB →
      </a>
    </div>
  );
}
```

---

### Simple JavaScript
```javascript
// Fetch today's readings
async function loadReadings() {
  const response = await fetch('http://localhost:3001/api/v1/liturgy/today');
  const liturgy = await response.json();
  
  document.getElementById('liturgical-day').textContent = liturgy.liturgicalDay;
  document.getElementById('first-reading').textContent = liturgy.readings[0].reference;
  document.getElementById('gospel').textContent = liturgy.readings.find(r => r.title === 'Gospel').reference;
}

loadReadings();
```

---

### Sunday Readings Widget
```tsx
export function SundayWidget() {
  const [sunday, setSunday] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/liturgy/sunday')
      .then(res => res.json())
      .then(setSunday);
  }, []);

  if (!sunday) return null;

  return (
    <div className="sunday-widget">
      <h3>This Sunday: {sunday.liturgicalDay}</h3>
      <ul>
        {sunday.readings.map((r, i) => (
          <li key={i}>
            <strong>{r.title}:</strong> {r.reference}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎨 Liturgical Colors

The API returns liturgical colors for styling:

```tsx
const colorMap = {
  purple: '#9333EA',   // Advent, Lent
  white: '#FFFFFF',    // Christmas, Easter
  green: '#22C55E',    // Ordinary Time
  red: '#EF4444',      // Pentecost, Martyrs
  rose: '#F472B6',     // 3rd Sunday Advent, 4th Sunday Lent
  black: '#000000'     // Good Friday, All Souls
};

<div style={{ backgroundColor: colorMap[liturgy.liturgicalColor] }}>
  {liturgy.liturgicalDay}
</div>
```

---

## 🔄 Auto-Sync

The backend automatically fetches next 7 days of readings:
- **On server startup** (immediate)
- **Daily at 3:00 AM UTC** (scheduled)

You don't need to trigger syncs manually. Just fetch from the API.

---

## 📝 Data Notes

### Text vs References
The GitHub API provides **references only** (e.g., "Isaiah 42:1-7"), not full text.

To get full text:
1. Use the `usccbLink` field to redirect users to official source
2. Or implement a secondary scraper for USCCB full text (future enhancement)

### Coverage
- **2025-2026** fully supported by source API
- Will require update/migration when 2027 data is released

---

## 🚀 Production Checklist

- [ ] Update `API_BASE` in frontend to production URL
- [ ] Verify CORS is enabled on backend
- [ ] Test auto-sync job runs correctly
- [ ] Add error handling for 404 (date out of range)
- [ ] Cache readings on frontend to reduce API calls
- [ ] Add loading states and error messages
- [ ] Test on mobile devices

---

## 📚 Resources

- Source API: [catholic-readings-api](https://cpbjr.github.io/catholic-readings-api/)
- GitHub Repo: [cpbjr/catholic-readings-api](https://github.com/cpbjr/catholic-readings-api)
- USCCB Official: [bible.usccb.org](https://bible.usccb.org/)

---

## 🐛 Troubleshooting

**No readings returned for today:**
- Check date is 2025-2026 (API coverage)
- Run manual refresh: `POST /liturgy/refresh`
- Check backend logs for sync errors

**404 errors:**
- Source API may not have data for requested date
- Verify date format is `YYYY-MM-DD`

**Stale data:**
- Auto-sync runs at 3 AM
- For immediate update: `POST /liturgy/refresh`

---

Built with ❤️ for God's Plan
