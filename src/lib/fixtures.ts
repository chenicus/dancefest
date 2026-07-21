import type { FestivalEvent } from "./types";

/** Hardcoded sample event used for UI work until import lands. */
export const FIXTURE_EVENT: FestivalEvent = {
  "id": "fixture-hello-dance-fest",
  "name": "Hello! Dance Fest 2026",
  "slug": "hello-dance-fest-2026",
  "dates": {
    "start": "2026-07-24",
    "end": "2026-07-26"
  },
  "rooms": [
    "Peninsula D or E-F-G",
    "Peninsula A-B",
    "Harbour",
    "Regency",
    "Peninsula C",
    "Sandpebble A-B-C",
    "Sandpebble D-E"
  ],
  "days": [
    "2026-07-24",
    "2026-07-25",
    "2026-07-26"
  ],
  "artists": [
    {
      "id": "art-simon-lola",
      "eventId": "fixture-hello-dance-fest",
      "name": "Simon & Lolahontas",
      "style": "bachata",
      "bioUrl": "https://hellodancefest.com/bachata/simon-lolahontas",
      "photoUrl": "https://hellodancefest.com/images/lineup-bachata/2026/simon-lolahontas1.jpg",
      "socialsFetchedAt": "2026-07-20T00:00:00.000Z",
      "igLinks": [
        { "label": "Joint account", "url": "https://instagram.com/simonandlolahontas", "kind": "joint" },
        { "label": "Simon", "url": "https://instagram.com/simon.bachata", "kind": "individual" },
        { "label": "Lolahontas", "url": "https://instagram.com/lolahontas", "kind": "individual" }
      ]
    },
    {
      "id": "art-leo-becca",
      "eventId": "fixture-hello-dance-fest",
      "name": "Leo & Becca",
      "style": "zouk"
    },
    {
      "id": "art-leandro-nayara",
      "eventId": "fixture-hello-dance-fest",
      "name": "Leandro & Nayara",
      "style": "zouk"
    },
    {
      "id": "art-fadi",
      "eventId": "fixture-hello-dance-fest",
      "name": "Fadi Fusion",
      "style": "salsa"
    },
    {
      "id": "art-mikael-ana",
      "eventId": "fixture-hello-dance-fest",
      "name": "Mikael & Ana",
      "style": "zouk"
    },
    {
      "id": "art-walter-larissa",
      "eventId": "fixture-hello-dance-fest",
      "name": "Walter & Larissa",
      "style": "zouk"
    }
  ],
  "sessions": [
    {
      "id": "fri-0-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Dominican Vibes Footworks",
      "instructors": [
        "Maurico & Serena"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "12:00",
      "end": "13:00"
    },
    {
      "id": "fri-1-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Fuze - Improvisation",
      "instructors": [
        "Patrick & Johanna"
      ],
      "style": "bachata",
      "level": "Int–Adv",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "fri-1-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Sensual Flow",
      "instructors": [
        "Vanessa & Guillermo"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "fri-1-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Intro to Kizomba",
      "instructors": [
        "Tyler Crandall"
      ],
      "style": "kizomba",
      "level": "Beginner",
      "room": "Harbour",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "fri-1-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "Body Movement",
      "instructors": [
        "Yolena Kapoli"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Regency",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "fri-1-4",
      "eventId": "fixture-hello-dance-fest",
      "title": "Salsa On2 Partnerwork",
      "instructors": [
        "Luis Aguilar"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Peninsula C",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "fri-1-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "The Edge of Movement",
      "instructors": [
        "Mikael & Ana"
      ],
      "style": "zouk",
      "level": "Open",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-24",
      "start": "13:00",
      "end": "14:00",
      "artistIds": [
        "art-mikael-ana"
      ]
    },
    {
      "id": "fri-2-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Fusion",
      "instructors": [
        "Luismi & Mariangela"
      ],
      "style": "bachata",
      "level": "Int–Adv",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "fri-2-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Modern Bachata Fusion",
      "instructors": [
        "Carlitos & Cece"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "fri-2-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Tarraxo Connection",
      "instructors": [
        "Joe & Mariah"
      ],
      "style": "kizomba",
      "level": "Beginner",
      "room": "Harbour",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "fri-2-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "Fadi's Signature: Chacha Musicality",
      "instructors": [
        "Fadi Fusion"
      ],
      "style": "salsa",
      "level": "Int–Adv",
      "room": "Regency",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00",
      "artistIds": [
        "art-fadi"
      ]
    },
    {
      "id": "fri-2-4",
      "eventId": "fixture-hello-dance-fest",
      "title": "Salsa On2 Partnerwork",
      "instructors": [
        "SF Salsa Academy"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Peninsula C",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "fri-2-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "Head Movement Found. & Var.",
      "instructors": [
        "Leandro & Nayara"
      ],
      "style": "zouk",
      "level": "Open",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-24",
      "start": "14:00",
      "end": "15:00",
      "artistIds": [
        "art-leandro-nayara"
      ]
    },
    {
      "id": "fri-3-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Fusion with Zouk",
      "instructors": [
        "Melonito"
      ],
      "style": "bachata",
      "level": "Int–Adv",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Sensual Flow - Partnerwork",
      "instructors": [
        "Alexander & Laisinha"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Challenge Your Fundamentals",
      "instructors": [
        "Hovsep & Laura"
      ],
      "style": "kizomba",
      "level": "Open",
      "room": "Harbour",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "J & L's style on2 Shines",
      "instructors": [
        "Jacopo & Linda"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Regency",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-4",
      "eventId": "fixture-hello-dance-fest",
      "title": "Salsa On2 Fundamentals",
      "instructors": [
        "Nav & Kat"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Peninsula C",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "6 Must-Have Fund. Moves",
      "instructors": [
        "Atom Cee"
      ],
      "style": "zouk",
      "level": "Open",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "fri-3-6",
      "eventId": "fixture-hello-dance-fest",
      "title": "3 Cambre Variations",
      "instructors": [
        "Walter & Larissa"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble D-E",
      "day": "2026-07-24",
      "start": "15:00",
      "end": "16:00",
      "artistIds": [
        "art-walter-larissa"
      ]
    },
    {
      "id": "fri-4-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Traditional Swag",
      "instructors": [
        "Bryon & Sammantha"
      ],
      "style": "bachata",
      "level": "Int–Adv",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Modern Bachata Shines",
      "instructors": [
        "Ngoc Knockout"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Urban Kiz Connection",
      "instructors": [
        "Pamelita & Mike"
      ],
      "style": "kizomba",
      "level": "Open",
      "room": "Harbour",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "Footwork",
      "instructors": [
        "Cristian Vergari"
      ],
      "style": "salsa",
      "level": "Int–Adv",
      "room": "Regency",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-4",
      "eventId": "fixture-hello-dance-fest",
      "title": "Mambo Footwork",
      "instructors": [
        "Oscar Castaneda"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Peninsula C",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "Simple Turn & Soltinho Variat.",
      "instructors": [
        "Gabriel de CB"
      ],
      "style": "zouk",
      "level": "Open",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-4-6",
      "eventId": "fixture-hello-dance-fest",
      "title": "The CODE: M&M Mastery",
      "instructors": [
        "Marck & Melyssa"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble D-E",
      "day": "2026-07-24",
      "start": "16:00",
      "end": "17:00"
    },
    {
      "id": "fri-5-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Flow Connection",
      "instructors": [
        "Jeff & Mayra"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00"
    },
    {
      "id": "fri-5-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "NV Style Bachata Fusion",
      "instructors": [
        "Nick & Vivi"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00"
    },
    {
      "id": "fri-5-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Urban Kiz Foundation",
      "instructors": [
        "Sink & Masha"
      ],
      "style": "kizomba",
      "level": "Open",
      "room": "Harbour",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00"
    },
    {
      "id": "fri-5-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "Mambo Shines & Footwork",
      "instructors": [
        "Hector & Analiza"
      ],
      "style": "salsa",
      "level": "Intermediate",
      "room": "Regency",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00"
    },
    {
      "id": "fri-5-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "Zouk Flavor & Turn Variations",
      "instructors": [
        "Nelly Caldeira"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00"
    },
    {
      "id": "fri-5-6",
      "eventId": "fixture-hello-dance-fest",
      "title": "Circularity: Flow & Rotation",
      "instructors": [
        "Leandro & Nayara"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble D-E",
      "day": "2026-07-24",
      "start": "17:00",
      "end": "18:00",
      "artistIds": [
        "art-leandro-nayara"
      ]
    },
    {
      "id": "fri-6-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Lady Styling",
      "instructors": [
        "Johanna Pellerin"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-24",
      "start": "18:00",
      "end": "19:00"
    },
    {
      "id": "fri-6-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "The Convo, Not the Combo",
      "instructors": [
        "Jim & Jess"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-24",
      "start": "18:00",
      "end": "19:00"
    },
    {
      "id": "2026-07-25-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Musicality in Bachata",
      "instructors": [
        "Simon & Lolahontas"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-25",
      "start": "13:00",
      "end": "14:00",
      "artistIds": [
        "art-simon-lola"
      ]
    },
    {
      "id": "2026-07-25-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "On2 Timing Lab",
      "instructors": [
        "Fadi Fusion"
      ],
      "style": "salsa",
      "level": "Int–Adv",
      "room": "Regency",
      "day": "2026-07-25",
      "start": "13:00",
      "end": "14:00",
      "artistIds": [
        "art-fadi"
      ]
    },
    {
      "id": "2026-07-25-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Zouk Fundamentals",
      "instructors": [
        "Leo & Becca"
      ],
      "style": "zouk",
      "level": "Beginner",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-25",
      "start": "13:00",
      "end": "14:00",
      "artistIds": [
        "art-leo-becca"
      ]
    },
    {
      "id": "2026-07-25-3",
      "eventId": "fixture-hello-dance-fest",
      "title": "Bachata Body Rolls",
      "instructors": [
        "Carlitos & Cece"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula A-B",
      "day": "2026-07-25",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "2026-07-25-4",
      "eventId": "fixture-hello-dance-fest",
      "title": "Mambo Shines",
      "instructors": [
        "Nav & Kat"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Peninsula C",
      "day": "2026-07-25",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "2026-07-25-5",
      "eventId": "fixture-hello-dance-fest",
      "title": "Cambré Flow",
      "instructors": [
        "Walter & Larissa"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble D-E",
      "day": "2026-07-25",
      "start": "14:00",
      "end": "15:00",
      "artistIds": [
        "art-walter-larissa"
      ]
    },
    {
      "id": "2026-07-25-6",
      "eventId": "fixture-hello-dance-fest",
      "title": "Kizomba Saída",
      "instructors": [
        "Tyler Crandall"
      ],
      "style": "kizomba",
      "level": "Beginner",
      "room": "Harbour",
      "day": "2026-07-25",
      "start": "15:00",
      "end": "16:00"
    },
    {
      "id": "2026-07-26-0",
      "eventId": "fixture-hello-dance-fest",
      "title": "Sensual Waves",
      "instructors": [
        "Patrick & Johanna"
      ],
      "style": "bachata",
      "level": "Open",
      "room": "Peninsula D or E-F-G",
      "day": "2026-07-26",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "2026-07-26-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Partnerwork Recap",
      "instructors": [
        "Luis Aguilar"
      ],
      "style": "salsa",
      "level": "Open",
      "room": "Regency",
      "day": "2026-07-26",
      "start": "13:00",
      "end": "14:00"
    },
    {
      "id": "2026-07-26-2",
      "eventId": "fixture-hello-dance-fest",
      "title": "Zouk Turn Patterns",
      "instructors": [
        "Nelly Caldeira"
      ],
      "style": "zouk",
      "level": "Int–Adv",
      "room": "Sandpebble A-B-C",
      "day": "2026-07-26",
      "start": "14:00",
      "end": "15:00"
    },
    {
      "id": "fri-perf-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Performance Showcase",
      "instructors": [
        "Featured Artists"
      ],
      "style": "other",
      "room": "Main Ballroom",
      "day": "2026-07-24",
      "start": "21:00",
      "end": "23:00",
      "type": "performance"
    },
    {
      "id": "sat-perf-1",
      "eventId": "fixture-hello-dance-fest",
      "title": "Live Performance",
      "instructors": [
        "Simon & Lolahontas"
      ],
      "style": "bachata",
      "room": "Main Stage",
      "day": "2026-07-25",
      "start": "20:00",
      "end": "21:00",
      "type": "performance",
      "artistIds": ["art-simon-lola"]
    }
  ],
  "theme": {
    "accent": "#D85A30",
    "background": "#ffffff",
    "eventName": "Hello! Dance Fest 2026"
  },
  "sourceUrl": "https://hellodancefest.com/event-program",
  "createdAt": "2026-07-18T00:00:00.000Z",
  "createdBy": null
};
