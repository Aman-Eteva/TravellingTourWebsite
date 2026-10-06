import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const db = new PrismaClient();
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85`;
const places = [
  [
    "Bali",
    "Indonesia",
    "Island mornings, emerald rice terraces and a slower kind of living.",
    "photo-1537996194471-e657df975ab4",
  ],
  [
    "Spiti Valley",
    "India",
    "High-altitude villages, ancient monasteries and endless Himalayan skies.",
    "photo-1464822759023-fed622ff2c3b",
  ],
  [
    "Kerala",
    "India",
    "Palm-fringed backwaters, fragrant spice gardens and quiet coastal villages.",
    "photo-1602216056096-3b40cc0c9944",
  ],
  [
    "Goa",
    "India",
    "Golden beaches, Portuguese lanes and long, sun-soaked afternoons.",
    "photo-1512343879784-a960bf40e7f2",
  ],
  [
    "Rajasthan",
    "India",
    "Sandstone forts, desert sunsets and royal stories around every corner.",
    "photo-1599661046827-dacff0c0f09a",
  ],
  [
    "Kyoto",
    "Japan",
    "Temple gardens, lantern-lit lanes and thoughtful Japanese hospitality.",
    "photo-1493976040374-85c8e12f0c0e",
  ],
  [
    "Ladakh",
    "India",
    "Turquoise lakes and remote mountain passes in the land of high adventure.",
    "photo-1506905925346-21bda4d32df4",
  ],
  [
    "Vietnam",
    "Vietnam",
    "Limestone islands, vibrant street food and the warmth of local life.",
    "photo-1528127269322-539801943592",
  ],
];
const tours = [
  [
    "Bali, a little closer to paradise",
    "bali-island-escape",
    0,
    "Beach escapes",
    32900,
    6,
    "Rice terraces, hidden waterfalls and barefoot sunsets.",
  ],
  [
    "The great Spiti escape",
    "spiti-valley-expedition",
    1,
    "Adventure",
    24900,
    8,
    "A road less traveled, through the heart of the Himalayas.",
  ],
  [
    "Slow days in Kerala",
    "kerala-backwater-retreat",
    2,
    "Nature & wildlife",
    18900,
    5,
    "Trade your to-do list for backwaters and tea-covered hills.",
  ],
  [
    "Goa beyond the beaches",
    "goa-coastal-discovery",
    3,
    "Beach escapes",
    12900,
    4,
    "Secret coves, colorful streets and a taste of coastal life.",
  ],
  [
    "A royal Rajasthan trail",
    "rajasthan-royal-trail",
    4,
    "Culture & heritage",
    28900,
    7,
    "Wander through living history, from Jaipur to the desert.",
  ],
  [
    "Kyoto in a different light",
    "kyoto-cultural-journey",
    5,
    "Culture & heritage",
    74900,
    6,
    "Quiet temples, tea ceremonies and lantern-lit evenings.",
  ],
  [
    "Ladakh, above it all",
    "ladakh-high-altitude",
    6,
    "Adventure",
    36900,
    8,
    "Find your perspective among lakes and mountain passes.",
  ],
  [
    "Vietnam from north to south",
    "vietnam-discovery",
    7,
    "Culture & heritage",
    48900,
    9,
    "Hanoi alleys, Ha Long waters and unforgettable flavors.",
  ],
  [
    "Kerala wild & wonderful",
    "kerala-wildlife-trail",
    2,
    "Nature & wildlife",
    21900,
    6,
    "Forest walks, birdlife and mornings in the mist.",
  ],
  [
    "Bali for the soul",
    "bali-wellness-retreat",
    0,
    "Wellness",
    41900,
    7,
    "A restorative week of yoga, nature and mindful living.",
  ],
  [
    "Desert nights in Jaisalmer",
    "jaisalmer-desert-nights",
    4,
    "Adventure",
    15900,
    4,
    "Golden dunes, starlit skies and desert hospitality.",
  ],
  [
    "Goa, take it slow",
    "goa-slow-weekend",
    3,
    "Wellness",
    16900,
    5,
    "Sunrise yoga and easy days by the Arabian Sea.",
  ],
] as const;
async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!adminPassword || !customerPassword)
    throw new Error(
      "Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD before seeding.",
    );
  const admin = await db.user.upsert({
    where: { email: "aman@admin.com" },
    update: {},
    create: {
      name: "Aman Admin",
      email: "aman@admin.com",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });
  const customers = [];
  for (const [name, email] of [
    ["Aarav Sharma", "aarav@roamly.local"],
    ["Maya Patel", "maya@roamly.local"],
    ["Priya Kapoor", "priya@roamly.local"],
  ])
    customers.push(
      await db.user.upsert({
        where: { email },
        update: {},
        create: {
          name,
          email,
          passwordHash: await bcrypt.hash(customerPassword, 12),
          wishlist: { create: {} },
        },
      }),
    );
  const categories = [];
  for (const name of [
    "Adventure",
    "Beach escapes",
    "Nature & wildlife",
    "Culture & heritage",
    "Wellness",
  ])
    categories.push(
      await db.tourCategory.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `Thoughtfully curated ${name.toLowerCase()} experiences.`,
        },
      }),
    );
  const destinations = [];
  for (const [name, country, description, image] of places)
    destinations.push(
      await db.destination.upsert({
        where: { name },
        update: {},
        create: { name, country, description, image: photo(image) },
      }),
    );
  for (const [index, t] of tours.entries()) {
    const [
      title,
      slug,
      destinationIndex,
      category,
      rupees,
      duration,
      shortDescription,
    ] = t;
    const destination = destinations[destinationIndex];
    const tour = await db.tour.upsert({
      where: { slug },
      update: {},
      create: {
        title,
        slug,
        shortDescription,
        description: `${shortDescription} Discover ${destination.name} with a small group and a knowledgeable local host. This ${duration}-day journey brings together the places we love most, welcoming stays and enough space to make the trip your own. ${destination.description} Every departure includes thoughtfully planned experiences, local transfers and personal support from arrival to farewell.`,
        destinationId: destination.id,
        categoryId: categories.find((c) => c.name === category)!.id,
        price: rupees * 100,
        duration,
        featured: index < 3,
        difficulty: category === "Adventure" ? "Moderate" : "Easy",
        meetingPoint: `${destination.name} arrival terminal, 10:00 AM`,
        included: [
          "Boutique accommodation",
          "Daily breakfast",
          "Local guide & experiences",
          "All scheduled transfers",
        ],
        excluded: [
          "Flights to destination",
          "Travel insurance",
          "Personal expenses",
        ],
        cancellationPolicy:
          "Cancel at least 7 days before departure for a 100% mock refund. Later cancellations are not eligible.",
        images: {
          create: [
            {
              url: destination.image,
              alt: `Scenery in ${destination.name}`,
              position: 0,
            },
          ],
        },
        itinerary: {
          create: Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            title:
              i === 0
                ? "Arrive & settle into the rhythm"
                : i === duration - 1
                  ? "One last sunrise & farewell"
                  : [
                      "Explore with a local",
                      "A day in nature",
                      "Flavors & hidden corners",
                      "Make it your own",
                    ][i % 4],
            description:
              i === 0
                ? `Meet your host at ${destination.name} arrival terminal. Transfer to your hotel, enjoy a welcome drink and meet your fellow travelers.`
                : i === duration - 1
                  ? "Enjoy a relaxed breakfast before your included departure transfer. Take home memories and a few new friends."
                  : `Explore ${destination.name} with your local guide. Discover neighborhood landmarks, enjoy time for independent exploration and gather for an evening recap.`,
            meals: "Breakfast included",
          })),
        },
        hotels: {
          create: {
            name: `${destination.name} Garden Retreat`,
            address: `Central ${destination.name}, ${destination.country}`,
            stars: 4,
          },
        },
        activities: {
          create: [
            {
              name: "Local discovery walk",
              description: "A guided neighborhood walk with a local expert.",
            },
            {
              name: "Regional tasting experience",
              description: "A hosted introduction to local flavors.",
            },
          ],
        },
      },
    });
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 14 + i * 7);
      date.setUTCHours(0, 0, 0, 0);
      await db.tourAvailability.upsert({
        where: { tourId_date: { tourId: tour.id, date } },
        update: {},
        create: { tourId: tour.id, date, capacity: 12 },
      });
    }
    if (
      !(await db.rAGDocument.findFirst({
        where: { title: `${title} — tour guide` },
      }))
    )
      await db.rAGDocument.create({
        data: {
          title: `${title} — tour guide`,
          type: "TOUR_INFORMATION",
          content: `${title}. ${shortDescription} Destination: ${destination.name}, ${destination.country}. Duration: ${duration} days. Price: INR ${rupees} per person. Included: boutique accommodation, daily breakfast, local guide and scheduled transfers. Excluded: flights, insurance and personal expenses. Cancellation: at least 7 days before departure for 100% mock refund.`,
        },
      });
  }
  for (const [i, user] of customers.entries()) {
    const tour = await db.tour.findUniqueOrThrow({
      where: { slug: tours[i][1] },
      include: { availability: true },
    });
    const reference = `TRV-DEMO-${i + 1}`;
    if (!(await db.booking.findUnique({ where: { reference } }))) {
      const slot = tour.availability[0];
      await db.$transaction([
        db.tourAvailability.update({
          where: { id: slot.id },
          data: { reserved: { increment: 1 } },
        }),
        db.booking.create({
          data: {
            reference,
            userId: user.id,
            tourId: tour.id,
            availabilityId: slot.id,
            travelDate: slot.date,
            count: 1,
            subtotal: tour.price,
            total: tour.price,
            status: "CONFIRMED",
            paymentStatus: "SUCCESS",
            travelers: { create: { name: user.name, age: 29 } },
            payments: {
              create: {
                amount: tour.price,
                status: "SUCCESS",
                idempotencyKey: crypto.randomUUID(),
              },
            },
          },
        }),
      ]);
    }
    const pastDate = new Date();
    pastDate.setUTCDate(pastDate.getUTCDate() - 40);
    pastDate.setUTCHours(0, 0, 0, 0);
    const slot = await db.tourAvailability.upsert({
      where: { tourId_date: { tourId: tour.id, date: pastDate } },
      update: {},
      create: { tourId: tour.id, date: pastDate, capacity: 12, reserved: 1 },
    });
    await db.booking.upsert({
      where: { reference: `TRV-PAST-${i + 1}` },
      update: {},
      create: {
        reference: `TRV-PAST-${i + 1}`,
        userId: user.id,
        tourId: tour.id,
        availabilityId: slot.id,
        travelDate: pastDate,
        count: 1,
        subtotal: tour.price,
        total: tour.price,
        status: "COMPLETED",
        paymentStatus: "SUCCESS",
        travelers: { create: { name: user.name, age: 29 } },
        payments: {
          create: {
            amount: tour.price,
            status: "SUCCESS",
            idempotencyKey: crypto.randomUUID(),
          },
        },
        review: {
          create: {
            userId: user.id,
            tourId: tour.id,
            rating: 5,
            title: [
              "The kind of trip you remember",
              "Every detail felt thoughtful",
              "Already planning my next one",
            ][i],
            comment:
              "A wonderful small-group experience. Our local guide made every day feel special, and the itinerary gave us the perfect mix of adventure and downtime.",
          },
        },
      },
    });
    await db.notification.upsert({
      where: { dedupeKey: `welcome:${user.id}` },
      update: {},
      create: {
        userId: user.id,
        dedupeKey: `welcome:${user.id}`,
        title: "Welcome to a world of possibilities",
        message:
          "Your next great story starts here. Explore our handpicked journeys.",
        type: "WELCOME",
        link: "/tours",
      },
    });
  }
  for (const [title, content] of [
    [
      "Packing for your adventure",
      "Pack light, breathable layers, comfortable walking shoes, a reusable water bottle, sun protection, a small first-aid kit and your travel documents. For mountain tours, include warm layers and a waterproof jacket.",
    ],
    [
      "Before you visit Goa",
      "Goa offers beaches, heritage neighborhoods and coastal food. Pack lightweight clothing, sunscreen and a reusable water bottle. Dress respectfully at religious sites. Use your included local guide for neighborhood recommendations.",
    ],
    [
      "Our cancellation policy",
      "Cancel at least 7 days before your scheduled departure for a 100% mock refund. Bookings inside this deadline are not eligible. All payments and refunds on this platform are simulated; no real money changes hands.",
    ],
  ])
    if (!(await db.rAGDocument.findFirst({ where: { title } })))
      await db.rAGDocument.create({ data: { title, content } });
  await db.auditLog.create({
    data: { userId: admin.id, action: "SEED", entity: "Platform" },
  });
  console.log(
    "Seed complete: 12 tours, 8 destinations, 4 accounts, itineraries, stays, bookings, reviews and travel knowledge.",
  );
}
seed().finally(() => db.$disconnect());
