/**
 * TravelPilot - Curated Destination Dataset for India
 * Authentic places with GPS coordinates, estimated costs (₹), time slots, transit options, and disruption contingency data.
 */

const DESTINATIONS_DATA = {
  jaipur: {
    name: "Jaipur",
    state: "Rajasthan",
    tagline: "The Pink City of Royal Forts, Palaces & Vibrant Bazaars",
    coverGradient: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
    bestTime: "October to March",
    avgDailyTransport: 600,
    centerCoords: [26.9124, 75.7873],
    highlights: ["Amber Fort", "Hawa Mahal", "Nahargarh Sunset", "Chokhi Dhani"],
    transitInfo: {
      airport: "Jaipur International Airport (JAI) - 12 km from city center",
      railway: "Jaipur Junction (JP) & Gandhinagar Jaipur (GADJ) - Vande Bharat & Shatabdi",
      localTransport: [
        { type: "Private Sightseeing Cab (8 hrs/80 km)", avgCost: 1800, bookingPartner: "Uber / Ola / Local Tour Taxi", tip: "Best for visiting Amber Fort & Nahargarh hill together" },
        { type: "Auto-Rickshaws (Tuk-Tuk)", avgCost: 500, bookingPartner: "Rapido / Metered Auto", tip: "Ideal for hopping between Old City bazaars and Hawa Mahal" },
        { type: "Jaipur Metro (Mansarovar to Badi Chaupar)", avgCost: 40, bookingPartner: "JMRC Station Counter", tip: "Fastest way to reach the walled Pink City without traffic" },
        { type: "Scooter / Bike Rental", avgCost: 450, bookingPartner: "OnnBikes / Royal Brothers", tip: "Great for solo travelers; carry a valid driving license" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.uber.com/in/en/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Monsoon / Waterlogging Contingency",
        desc: "Hilltop forts and outdoor bazaars replaced with indoor royal museums, covered havelis, and heritage culinary workshops.",
        replacements: [
          {
            id: "jpr-alt-1",
            name: "Albert Hall Museum & Royal Armor Gallery (Indoor)",
            timeSlot: "Morning (10:00 AM)",
            category: "culture",
            cost: 300,
            duration: "2.5 hours",
            description: "Explore Rajasthan's oldest museum with 16 indoor galleries, Egyptian mummies, miniature paintings, and royal artifacts.",
            tip: "Completely sheltered from rain; audio guides available at the entrance.",
            coords: [26.9116, 75.8194]
          },
          {
            id: "jpr-alt-2",
            name: "Traditional Block Printing Workshop at Anokhi Museum",
            timeSlot: "Afternoon (02:00 PM)",
            category: "culture",
            cost: 450,
            duration: "2 hours",
            description: "Hands-on indoor heritage textile block-printing session inside a restored 16th-century stone mansion.",
            tip: "You get to take home your own hand-printed cotton scarf.",
            coords: [26.9855, 75.8507]
          },
          {
            id: "jpr-alt-3",
            name: "Indoor Royal Cooking Masterclass & LMB Dining",
            timeSlot: "Evening (06:00 PM)",
            category: "food",
            cost: 850,
            duration: "2 hours",
            description: "Learn the secrets of Laal Maas, Ker Sangri, and Ghewar followed by sheltered luxury dining.",
            tip: "Advance reservation recommended for masterclass.",
            coords: [26.9205, 75.8267]
          }
        ]
      },
      timeDelay: {
        title: "Flight Delay / Traffic Jam Expressway Mode",
        desc: "Condensed 2-stop priority route hitting the crown jewels of Jaipur without rushing.",
        keepIds: ["jpr-1", "jpr-4"]
      },
      lowEnergy: {
        title: "Relaxed Leisure & Palace High Tea Mode",
        desc: "Swap uphill fort hikes with leisurely palace garden strolls and royal high-tea at Taj Rambagh.",
        replacements: [
          {
            id: "jpr-alt-4",
            name: "Royal Afternoon High Tea at Taj Rambagh Palace",
            timeSlot: "Afternoon (03:30 PM)",
            category: "food",
            cost: 1600,
            duration: "2 hours",
            description: "Sip fine Darjeeling teas with scones, pastries, and peacock garden views at the former Maharaja residence.",
            tip: "Smart casual dress code required.",
            coords: [26.8974, 75.8078]
          }
        ]
      }
    },
    places: [
      {
        id: "jpr-1",
        name: "Amber Fort & Palace Tour",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 500,
        duration: "3 hours",
        description: "Explore the hilltop majestic Rajput fort, Sheesh Mahal (Mirror Palace), and Maota Lake views.",
        tip: "Reach before 10 AM to beat the crowd and heat.",
        coords: [26.9855, 75.8513]
      },
      {
        id: "jpr-2",
        name: "Panna Meena ka Kund Stepwell",
        timeSlot: "Morning (11:30 AM)",
        category: "culture",
        cost: 0,
        duration: "45 mins",
        description: "Marvel at the 16th-century geometric symmetrical stepwell near Amer.",
        tip: "Great photo spot with clean symmetrical stairs.",
        coords: [26.9893, 75.8541]
      },
      {
        id: "jpr-3",
        name: "Authentic Rajasthani Thali at LMB / Rawat",
        timeSlot: "Afternoon (01:00 PM)",
        category: "food",
        cost: 650,
        duration: "1.5 hours",
        description: "Indulge in Dal Baati Churma, Gatte ki Sabzi, Pyaaz Kachori, and Ghewar.",
        tip: "Try the iconic Pyaaz Kachori at Rawat Mishtan Bhandar.",
        coords: [26.9205, 75.8267]
      },
      {
        id: "jpr-4",
        name: "Hawa Mahal & City Palace Walk",
        timeSlot: "Afternoon (03:30 PM)",
        category: "culture",
        cost: 400,
        duration: "2.5 hours",
        description: "The 953-window Palace of Winds and royal museums inside City Palace.",
        tip: "Sip chai at Wind View Cafe directly opposite Hawa Mahal.",
        coords: [26.9239, 75.8267]
      },
      {
        id: "jpr-5",
        name: "Shopping in Bapu Bazaar & Johari Bazaar",
        timeSlot: "Evening (05:30 PM)",
        category: "shopping",
        cost: 1200,
        duration: "2 hours",
        description: "Shop for handcrafted Jaipuri quilts, mojris (juttis), blue pottery, and silver jewelry.",
        tip: "Friendly bargaining is expected and customary.",
        coords: [26.9192, 75.8239]
      },
      {
        id: "jpr-6",
        name: "Sunset at Nahargarh Fort (Padao Cafe)",
        timeSlot: "Evening (06:30 PM)",
        category: "nature",
        cost: 300,
        duration: "2 hours",
        description: "Witness the sun setting over the entire glowing pink city from the Aravalli hilltop.",
        tip: "Take a prepaid cab or auto that agrees to wait for the return trip.",
        coords: [26.9372, 75.8155]
      },
      {
        id: "jpr-7",
        name: "Cultural Village Experience at Chokhi Dhani",
        timeSlot: "Night (07:30 PM)",
        category: "culture",
        cost: 1100,
        duration: "3.5 hours",
        description: "Traditional folk dance, puppet shows, camel rides, and unlimited royal dining.",
        tip: "Come on an empty stomach for the grand dinner.",
        coords: [26.7667, 75.8385]
      },
      {
        id: "jpr-8",
        name: "Jantar Mantar Astronomical Observatory",
        timeSlot: "Morning (10:00 AM)",
        category: "culture",
        cost: 200,
        duration: "1.5 hours",
        description: "UNESCO World Heritage site featuring the world's largest stone sundial.",
        tip: "Hiring a registered guide brings the astronomical instruments to life.",
        coords: [26.9248, 75.8246]
      },
      {
        id: "jpr-9",
        name: "Jal Mahal (Water Palace) Promenade Walk",
        timeSlot: "Evening (05:00 PM)",
        category: "nature",
        cost: 0,
        duration: "45 mins",
        description: "Scenic evening walk along Man Sagar Lake with the floating palace in the center.",
        tip: "Street vendors sell delicious roasted corn and kulhad chai.",
        coords: [26.9535, 75.8462]
      },
      {
        id: "jpr-10",
        name: "Albert Hall Museum Light Show",
        timeSlot: "Night (08:00 PM)",
        category: "culture",
        cost: 150,
        duration: "1 hour",
        description: "Indo-Saracenic architectural masterpiece illuminated with dynamic night lighting.",
        tip: "Watch hundreds of pigeons outside in the morning, or the lights at night.",
        coords: [26.9116, 75.8194]
      },
      {
        id: "jpr-11",
        name: "Patrika Gate & Jawahar Circle Garden",
        timeSlot: "Morning (08:30 AM)",
        category: "culture",
        cost: 0,
        duration: "1 hour",
        description: "Stunning hand-painted pastel arches representing Rajasthani culture and history.",
        tip: "Best lighting for colorful photos before 9:30 AM.",
        coords: [26.8378, 75.8078]
      }
    ]
  },

  goa: {
    name: "Goa",
    state: "Goa",
    tagline: "Sun-Kissed Beaches, Portuguese Heritage & Laidback Coastal Vibes",
    coverGradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    bestTime: "November to March",
    avgDailyTransport: 800,
    centerCoords: [15.4989, 73.8278],
    highlights: ["Baga Beach", "Dudhsagar Falls", "Fontainhas", "Fort Aguada"],
    transitInfo: {
      airport: "Dabolim Airport (GOI) & Manohar International Mopa (GOX)",
      railway: "Madgaon Junction (MAO) & Thivim (THVM) - Vande Bharat from Mumbai/Bangalore",
      localTransport: [
        { type: "Self-Drive Car / Thar Rental", avgCost: 1500, bookingPartner: "Local Verified Operators", tip: "Full freedom to explore North & South Goa at your own pace" },
        { type: "Scooter / Activa Rental", avgCost: 400, bookingPartner: "Beachside rental stalls", tip: "Most popular way to commute; helmets are mandatory" },
        { type: "GoaMiles App Taxi", avgCost: 1100, bookingPartner: "GoaMiles Official App", tip: "Government-approved prepaid taxi app with fixed rates" },
        { type: "Hop-On Hop-Off Sightseeing Bus", avgCost: 350, bookingPartner: "GTDC Tourism Counter", tip: "Connects Panaji, Old Goa churches, and Miramar beach" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.goamiles.com/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Tropical Downpour Contingency",
        desc: "Open beach watersports moved to covered Portuguese havelis, Latin Quarter art galleries, and sheltered spice plantation pavilions.",
        replacements: [
          {
            id: "goa-alt-1",
            name: "Houses of Goa Architectural Museum",
            timeSlot: "Morning (10:00 AM)",
            category: "culture",
            cost: 200,
            duration: "2 hours",
            description: "Unique multi-level ship-shaped museum showcasing the fusion of Portuguese and Hindu domestic architecture.",
            tip: "Indoor and fully protected from rain.",
            coords: [15.5342, 73.8344]
          },
          {
            id: "goa-alt-2",
            name: "Covered Spice Plantation Buffet & Feni Tasting",
            timeSlot: "Afternoon (01:00 PM)",
            category: "food",
            cost: 700,
            duration: "2.5 hours",
            description: "Sheltered traditional Goan dining with organic spices, warm fish curry, and heritage cashew feni distillation demo.",
            tip: "Relaxing rain sounds amidst the tropical foliage.",
            coords: [15.4294, 74.0242]
          }
        ]
      },
      timeDelay: {
        title: "Late Flight / Delay Quick Route",
        desc: "Streamlined coastal sunset and dining itinerary in North Goa.",
        keepIds: ["goa-1", "goa-6"]
      },
      lowEnergy: {
        title: "South Goa Silent Retreat Mode",
        desc: "Calm beachfront lounging at Palolem with gentle Ayurvedic massage and coconut smoothies.",
        replacements: [
          {
            id: "goa-alt-3",
            name: "Ayurvedic Beachside Spa & Yoga at Palolem",
            timeSlot: "Afternoon (03:00 PM)",
            category: "wellness",
            cost: 1500,
            duration: "2 hours",
            description: "Warm herbal oil relaxation massage right next to the gentle ocean waves.",
            tip: "Best for post-flight muscle relaxation.",
            coords: [15.0100, 74.0232]
          }
        ]
      }
    },
    places: [
      {
        id: "goa-1",
        name: "Fontainhas Latin Quarter Heritage Walk",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 150,
        duration: "2 hours",
        description: "Stroll along vibrant pastel Portuguese villas, tiled roofs, and quaint wooden balconies in Panjim.",
        tip: "Grab fresh poi bread and pastel de nata at 31st January Bakery.",
        coords: [15.4989, 73.8312]
      },
      {
        id: "goa-2",
        name: "Basilica of Bom Jesus & Old Goa Churches",
        timeSlot: "Morning (11:30 AM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "UNESCO World Heritage 16th-century baroque cathedral holding the sacred relics of St. Francis Xavier.",
        tip: "Modest dress required covering shoulders and knees.",
        coords: [15.5009, 73.9116]
      },
      {
        id: "goa-3",
        name: "Authentic Goan Fish Thali at Ritz Classic",
        timeSlot: "Afternoon (01:30 PM)",
        category: "food",
        cost: 450,
        duration: "1 hour",
        description: "Traditional Kingfish fry, prawn curry, kismur, sol kadhi, and rice.",
        tip: "Ask for freshly prepared Sol Kadhi to beat the afternoon heat.",
        coords: [15.4938, 73.8239]
      },
      {
        id: "goa-4",
        name: "Fort Aguada & Lighthouse Viewpoint",
        timeSlot: "Afternoon (04:00 PM)",
        category: "culture",
        cost: 100,
        duration: "1.5 hours",
        description: "17th-century Portuguese fortress offering panoramic views where Mandovi River meets the Arabian Sea.",
        tip: "Visit the lower fort for sunset photography.",
        coords: [15.4925, 73.7736]
      },
      {
        id: "goa-5",
        name: "Water Sports at Baga Beach",
        timeSlot: "Morning (10:00 AM)",
        category: "adventure",
        cost: 1500,
        duration: "2.5 hours",
        description: "Parasailing, Jet Ski rides, Banana Boat, and Bumper rides over azure waves.",
        tip: "Book package combos on the beach directly for discounted rates.",
        coords: [15.5553, 73.7517]
      },
      {
        id: "goa-6",
        name: "Sunset & Dining at Thalassa / Curlies",
        timeSlot: "Evening (06:00 PM)",
        category: "nightlife",
        cost: 1400,
        duration: "2.5 hours",
        description: "Cliffside Greek dining with panoramic Arabian Sea sunset views and chill electronic beats.",
        tip: "Reserve cliffside tables 2-3 days in advance.",
        coords: [15.5898, 73.7385]
      },
      {
        id: "goa-7",
        name: "Dudhsagar Waterfall Jeep Safari Tour",
        timeSlot: "Morning (07:30 AM)",
        category: "adventure",
        cost: 1800,
        duration: "5 hours",
        description: "Thrilling 4x4 jungle jeep safari through Bhagwan Mahavir Sanctuary to India's 4-tiered giant waterfall.",
        tip: "Life jackets are mandatory for swimming in the natural pool.",
        coords: [15.3144, 74.3143]
      }
    ]
  },

  manali: {
    name: "Manali",
    state: "Himachal Pradesh",
    tagline: "Snow-Capped Himalayan Peaks, Pine Valleys & High-Altitude Adventure",
    coverGradient: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
    bestTime: "March to June / Dec to Feb",
    avgDailyTransport: 700,
    centerCoords: [32.2396, 77.1887],
    highlights: ["Solang Valley", "Atal Tunnel & Sissu", "Hadimba Temple", "Old Manali Cafes"],
    transitInfo: {
      airport: "Bhuntar Airport (KUU) - 50 km / Chandigarh (IXC) - 290 km",
      railway: "Chandigarh (CDG) / Kalka (KLK) connected to Volvo AC Sleeper buses",
      localTransport: [
        { type: "Union Sightseeing Taxi (Full Day)", avgCost: 2200, bookingPartner: "Manali Taxi Union Counter", tip: "Fixed government union rates for Solang, Rohtang, and Atal Tunnel" },
        { type: "Royal Enfield Himalayan Rental", avgCost: 1200, bookingPartner: "Mall Road Bike Rentals", tip: "Best for thrilling rides across Atal Tunnel to Sissu waterfall" },
        { type: "Local Green Electric Buses", avgCost: 50, bookingPartner: "HRTC Counter", tip: "Eco-friendly and scenic ride between Manali and Naggar" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.makemytrip.com/cabs/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Mountain Rain & Landslide Contingency",
        desc: "High-altitude passes rerouted to Naggar Castle galleries, indoor heated cafes in Old Manali, and hot sulfur mineral springs in Vashisht.",
        replacements: [
          {
            id: "mnl-alt-1",
            name: "Museum of Himachal Culture & Folk Art",
            timeSlot: "Morning (10:00 AM)",
            category: "culture",
            cost: 100,
            duration: "2 hours",
            description: "Indoor gallery featuring antique Himalayan temples models, traditional attire, and wooden handicraft instruments.",
            tip: "Located right next to Hadimba temple.",
            coords: [32.2490, 77.1700]
          },
          {
            id: "mnl-alt-2",
            name: "Naggar Castle Heritage & Indoor Art Gallery",
            timeSlot: "Afternoon (02:00 PM)",
            category: "culture",
            cost: 200,
            duration: "2.5 hours",
            description: "500-year-old wooden castle with Nicholas Roerich Himalayan painting gallery, sheltered from bad weather.",
            tip: "Enjoy apple pie at the covered courtyard cafe.",
            coords: [32.1158, 77.1717]
          }
        ]
      },
      timeDelay: {
        title: "Express Valley Highlights Route",
        desc: "Optimized route focusing on Hadimba Forest and Old Manali riverside dining.",
        keepIds: ["mnl-1", "mnl-4"]
      },
      lowEnergy: {
        title: "Heated Thermal Springs & Wellness Mode",
        desc: "Natural hot sulfur baths at Vashisht followed by warm herbal tea by the Beas river.",
        replacements: [
          {
            id: "mnl-alt-3",
            name: "Private Hot Sulfur Thermal Mineral Baths (Vashisht)",
            timeSlot: "Morning (10:30 AM)",
            category: "wellness",
            cost: 250,
            duration: "1.5 hours",
            description: "Natural geothermal warm healing springs believed to cure body fatigue and joint aches.",
            tip: "Private clean family baths available near temple.",
            coords: [32.2612, 77.1873]
          }
        ]
      }
    },
    places: [
      {
        id: "mnl-1",
        name: "Hadimba Devi Temple in Cedar Forest",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "Ancient 1553 AD pagoda-style wooden temple nestled inside towering Dhungri deodar forests.",
        tip: "Look out for Himalayan yak photo ops outside the temple complex.",
        coords: [32.2483, 77.1692]
      },
      {
        id: "mnl-2",
        name: "Solang Valley Adventure Sports",
        timeSlot: "Morning (11:00 AM)",
        category: "adventure",
        cost: 2000,
        duration: "3.5 hours",
        description: "Paragliding, Zorbing, ATV quad biking, and ropeway cable car rides with mountain views.",
        tip: "Always check weather conditions before booking paragliding.",
        coords: [32.3166, 77.1578]
      },
      {
        id: "mnl-3",
        name: "Traditional Himachali Siddu & Trout Lunch",
        timeSlot: "Afternoon (02:00 PM)",
        category: "food",
        cost: 450,
        duration: "1 hour",
        description: "Steamed wheat walnut Siddu with desi ghee and fresh river-caught Tandoori Trout fish.",
        tip: "Try local cafes in Old Manali for authentic homemade walnut Siddu.",
        coords: [32.2546, 77.1752]
      },
      {
        id: "mnl-4",
        name: "Old Manali Cafe Hopping & Live Indie Music",
        timeSlot: "Evening (05:00 PM)",
        category: "nightlife",
        cost: 750,
        duration: "2.5 hours",
        description: "Bohemian vibes, wood-fired pizza at Cafe 1947, riverside outdoor seating, and live acoustic music.",
        tip: "Cafe 1947 by the Manalsu River is legendary for river sounds and woodfired pizza.",
        coords: [32.2562, 77.1741]
      },
      {
        id: "mnl-5",
        name: "Atal Tunnel & Sissu Waterfall Day Excursion",
        timeSlot: "Morning (08:30 AM)",
        category: "nature",
        cost: 1200,
        duration: "4.5 hours",
        description: "Drive through the 9.02 km high-altitude engineering marvel into Lahaul Valley's glacial landscapes and Sissu waterfall.",
        tip: "Start early to avoid tunnel checkpoint queues.",
        coords: [32.4764, 77.1235]
      }
    ]
  },

  kerala: {
    name: "Kerala",
    state: "Kerala",
    tagline: "God's Own Country: Emerald Backwaters, Tea Hills & Ayurvedic Bliss",
    coverGradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    bestTime: "September to March",
    avgDailyTransport: 750,
    centerCoords: [9.9312, 76.2673],
    highlights: ["Alleppey Houseboat", "Munnar Tea Gardens", "Fort Kochi", "Kathakali Performance"],
    transitInfo: {
      airport: "Cochin International Airport (COK) - World's 1st 100% solar powered airport",
      railway: "Ernakulam Junction (ERS) & Alappuzha (ALLP) - Superfast trains",
      localTransport: [
        { type: "Private AC Cab for Hills & Backwaters", avgCost: 2400, bookingPartner: "Kerala Tourism Approved Taxis", tip: "Most seamless for 3-day multi-destination tour (Kochi - Munnar - Alleppey)" },
        { type: "Government Backwater Water Bus / Ferry", avgCost: 30, bookingPartner: "SWTD Jetty Counters", tip: "Super scenic and ultra-cheap way to see backwaters like a local" },
        { type: "Auto-Rickshaws (Kochi/Munnar)", avgCost: 400, bookingPartner: "Local Auto Stands", tip: "Fast and breezy for city monument hops in Fort Kochi" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.uber.com/in/en/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Monsoon Serenity Contingency",
        desc: "Open shikaras moved to luxury covered glass-window houseboats, indoor Kathakali makeup demonstrations, and Ayurvedic spa sessions.",
        replacements: [
          {
            id: "ker-alt-1",
            name: "Kerala Folklore Museum (3-Tiered Architectural Jewel)",
            timeSlot: "Morning (10:30 AM)",
            category: "culture",
            cost: 350,
            duration: "2 hours",
            description: "World-class indoor museum with 4,000+ artifacts, wood carvings, and classical musical instruments.",
            tip: "Fully indoor and breathtaking wooden architecture.",
            coords: [9.9333, 76.3055]
          },
          {
            id: "ker-alt-2",
            name: "Abhyanga Full-Body Warm Ayurvedic Herbal Massage",
            timeSlot: "Afternoon (03:00 PM)",
            category: "wellness",
            cost: 1800,
            duration: "1.5 hours",
            description: "Monsoon is traditionally the best season in Ayurveda for herbal rejuvenation and body detox.",
            tip: "Certified therapists and herbal steam bath included.",
            coords: [9.9654, 76.2421]
          }
        ]
      },
      timeDelay: {
        title: "Fort Kochi & Sunset Cruise Express",
        desc: "Relaxed historic harbor stroll and traditional Sadhya dining.",
        keepIds: ["ker-3", "ker-4"]
      },
      lowEnergy: {
        title: "Backwater Hammock & Village Tea Chill",
        desc: "Laze on a shaded houseboat deck sipping fresh tender coconut water.",
        replacements: [
          {
            id: "ker-alt-3",
            name: "Shaded Kettuvallam Day Lounge & Fresh Seafood Lunch",
            timeSlot: "Morning (11:00 AM)",
            category: "nature",
            cost: 1400,
            duration: "3.5 hours",
            description: "Glide silently past paddy fields while onboard chef prepares fresh Karimeen Pollichathu.",
            tip: "Zero walking required; ultimate relaxation.",
            coords: [9.4981, 76.3388]
          }
        ]
      }
    },
    places: [
      {
        id: "ker-1",
        name: "Alleppey Backwater Day Cruise & Canoe Ride",
        timeSlot: "Morning (09:30 AM)",
        category: "nature",
        cost: 1600,
        duration: "4 hours",
        description: "Glide through serene palm-fringed canals, village paddy fields, and lagoons on a traditional Kettuvallam.",
        tip: "Take a narrow shikara or canoe to reach the tiny village inner canals.",
        coords: [9.4981, 76.3388]
      },
      {
        id: "ker-2",
        name: "Munnar Tea Gardens & KDHP Tea Museum Tour",
        timeSlot: "Morning (10:00 AM)",
        category: "nature",
        cost: 250,
        duration: "2.5 hours",
        description: "Endless rolling green tea carpet hills, tea leaf plucking demo, and historic factory processing tour.",
        tip: "Buy authentic freshly ground single-estate black tea at factory rates.",
        coords: [10.0889, 77.0595]
      },
      {
        id: "ker-3",
        name: "Traditional Kerala Sadhya on Banana Leaf",
        timeSlot: "Afternoon (01:00 PM)",
        category: "food",
        cost: 400,
        duration: "1.5 hours",
        description: "Grand vegetarian feast of 24 dishes including Avial, Thoran, Sambar, Payasam, and crispy banana chips.",
        tip: "Eat with clean hands to enjoy the traditional texture and flavor.",
        coords: [9.9654, 76.2421]
      },
      {
        id: "ker-4",
        name: "Fort Kochi Heritage Walk & Chinese Fishing Nets",
        timeSlot: "Evening (04:30 PM)",
        category: "culture",
        cost: 100,
        duration: "2 hours",
        description: "Explore colonial Jewish Town, Santa Cruz Basilica, Mattancherry Palace, and iconic cantilevers at sunset.",
        tip: "Try fresh catch of fish marinated in spices directly at the Kochi pier stalls.",
        coords: [9.9654, 76.2421]
      },
      {
        id: "ker-5",
        name: "Kathakali & Kalaripayattu Live Cultural Show",
        timeSlot: "Evening (06:30 PM)",
        category: "culture",
        cost: 450,
        duration: "2 hours",
        description: "Live classical facial expression dance drama and Kerala's ancient 3000-year-old martial arts demonstration.",
        tip: "Arrive 30 mins early at 6 PM to watch the actors apply organic makeup.",
        coords: [9.9678, 76.2452]
      }
    ]
  },

  rishikesh: {
    name: "Rishikesh",
    state: "Uttarakhand",
    tagline: "Yoga Capital of the World, Sacred Ganga Aarti & River Rafting",
    coverGradient: "linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)",
    bestTime: "September to November / March to May",
    avgDailyTransport: 500,
    centerCoords: [30.0869, 78.2676],
    highlights: ["Triveni Ghat Aarti", "Ganga White Water Rafting", "Beatles Ashram", "Neer Garh Waterfall"],
    transitInfo: {
      airport: "Dehradun Jolly Grant Airport (DED) - 20 km (30 mins drive)",
      railway: "Yog Nagari Rishikesh (YNRK) & Haridwar Junction (HW)",
      localTransport: [
        { type: "Shared Vikram / Electric Auto", avgCost: 250, bookingPartner: "Ghat Route Stand", tip: "Super affordable for trips between Ram Jhula, Laxman Jhula & Triveni Ghat" },
        { type: "Scooter / Royal Enfield Rental", avgCost: 500, bookingPartner: "Tapovan Bike Rentals", tip: "Best way to climb uphill to Neer Garh waterfall or Shivpuri rafting camps" },
        { type: "Private Rafting & Camp Transfer Cabs", avgCost: 900, bookingPartner: "Rafting Agency Fleet", tip: "Included in most Shivpuri river rafting packages" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.uber.com/in/en/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Monsoon River Swell Contingency",
        desc: "Rafting suspended due to river currents; swapped with sheltered Beatles Ashram graffiti domes, sound healing studios, and indoor Ganga cafe viewings.",
        replacements: [
          {
            id: "rsh-alt-1",
            name: "Beatles Ashram Indoor Domes & Photo Gallery",
            timeSlot: "Morning (10:00 AM)",
            category: "culture",
            cost: 200,
            duration: "2.5 hours",
            description: "Explore the sheltered stone meditation caves and the historic 1968 Beatles photo gallery.",
            tip: "Rain makes the surrounding Rajaji forest lush green and fragrant.",
            coords: [30.1147, 78.3142]
          },
          {
            id: "rsh-alt-2",
            name: "Tibetan Singing Bowl Sound Therapy & Meditation",
            timeSlot: "Afternoon (03:30 PM)",
            category: "wellness",
            cost: 500,
            duration: "1.5 hours",
            description: "Indoor deep restorative acoustic frequency meditation session in Tapovan.",
            tip: "Helps calm travel fatigue and re-energize.",
            coords: [30.1312, 78.3214]
          }
        ]
      },
      timeDelay: {
        title: "Tapovan Cafe & Evening Aarti Express",
        desc: "Focused spiritual highlights: treehouse cafe brunch and front-row seats for the Triveni Ghat Aarti.",
        keepIds: ["rsh-3", "rsh-5"]
      },
      lowEnergy: {
        title: "Spiritual Detox & Gentle Pranayama Mode",
        desc: "Gentle sunrise breathing by the river and ayurvedic herbal tea at Little Buddha Cafe.",
        replacements: [
          {
            id: "rsh-alt-3",
            name: "Gentle Sunset Meditation & Ganga Diya Offering",
            timeSlot: "Evening (05:30 PM)",
            category: "wellness",
            cost: 100,
            duration: "1.5 hours",
            description: "Peaceful quiet seating on the steps with a floating floral diya light on the water.",
            tip: "Sit near Parmarth Niketan for tranquil chants.",
            coords: [30.1189, 78.3115]
          }
        ]
      }
    },
    places: [
      {
        id: "rsh-1",
        name: "Sunrise Yoga & Meditation Session by the Ganges",
        timeSlot: "Morning (06:30 AM)",
        category: "wellness",
        cost: 300,
        duration: "1.5 hours",
        description: "Calming morning Pranayama and Hatha yoga session overlooking the flowing holy river.",
        tip: "Carry a comfortable yoga mat or light cotton towel.",
        coords: [30.1250, 78.3200]
      },
      {
        id: "rsh-2",
        name: "White Water River Rafting (Shivpuri to NIM Beach)",
        timeSlot: "Morning (09:30 AM)",
        category: "adventure",
        cost: 1200,
        duration: "3 hours",
        description: "16 km thrilling ride tackling Grade III rapids like Roller Coaster, Golf Course, and Clubhouse.",
        tip: "Body surfing in calm river sections with your lifejacket is a must-do.",
        coords: [30.1412, 78.3842]
      },
      {
        id: "rsh-3",
        name: "Healthy Organic Brunch at Little Buddha Cafe",
        timeSlot: "Afternoon (01:30 PM)",
        category: "food",
        cost: 450,
        duration: "1.5 hours",
        description: "Treehouse style cafe overlooking Laxman Jhula with Israeli platters, fresh smoothies, and lemon ginger tea.",
        tip: "Get a top-floor floor-cushion seat with river breeze.",
        coords: [30.1287, 78.3289]
      },
      {
        id: "rsh-4",
        name: "The Beatles Ashram (Chaurasi Kutia) Tour",
        timeSlot: "Afternoon (03:30 PM)",
        category: "culture",
        cost: 200,
        duration: "2 hours",
        description: "Walk inside the 1968 Maharishi Mahesh Yogi ashram where the Beatles composed the White Album, surrounded by vibrant graffiti.",
        tip: "Visit the meditation domes and the Beatles photo gallery inside.",
        coords: [30.1147, 78.3142]
      },
      {
        id: "rsh-5",
        name: "Grand Maha Ganga Aarti at Triveni Ghat",
        timeSlot: "Evening (06:00 PM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "Soul-stirring prayer with burning brass lamps, Vedic chanting, conch shells, and floating flower diyas.",
        tip: "Arrive by 5:30 PM to secure a front step seat right near the priests.",
        coords: [30.0869, 78.2882]
      }
    ]
  },

  udaipur: {
    name: "Udaipur",
    state: "Rajasthan",
    tagline: "The City of Lakes, Marble Palaces & Royal Romance",
    coverGradient: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
    bestTime: "September to March",
    avgDailyTransport: 550,
    centerCoords: [24.5854, 73.7125],
    highlights: ["City Palace", "Lake Pichola Boat Cruise", "Bagore Ki Haveli", "Sajjangarh Monsoon Palace"],
    transitInfo: {
      airport: "Maharana Pratap Airport (UDR) - 22 km from Old City",
      railway: "Udaipur City Railway Station (UDZ) - Chetak Express & Royal Rajasthan Trains",
      localTransport: [
        { type: "Private Lake City Sightseeing Taxi", avgCost: 1600, bookingPartner: "Uber / Local Travel Desk", tip: "Great for Monsoon Palace hilltop and Shilpgram crafts village" },
        { type: "Auto-Rickshaws for Old City Alleys", avgCost: 400, bookingPartner: "Local Auto Stands", tip: "Cars cannot enter narrow lakeside lanes; autos are essential" },
        { type: "Sunset Lake Pichola Motorboats", avgCost: 650, bookingPartner: "City Palace Jetty (RMC)", tip: "Magical golden-hour cruise stopping at Jag Mandir island" }
      ],
      intercityLinks: {
        flights: "https://www.makemytrip.com/flights/",
        trains: "https://www.irctc.co.in/",
        cabs: "https://www.uber.com/in/en/",
        buses: "https://www.redbus.in/"
      }
    },
    contingencyPlans: {
      heavyRain: {
        title: "Monsoon Lake Swell Contingency",
        desc: "Outdoor boat rides and hill climbs swapped for City Palace indoor crystal gallery, covered haveli folk shows, and vintage car collection.",
        replacements: [
          {
            id: "udp-alt-1",
            name: "Vintage & Classic Car Museum (Maharajas Collection)",
            timeSlot: "Morning (10:30 AM)",
            category: "culture",
            cost: 400,
            duration: "1.5 hours",
            description: "Indoor garage displaying 1934 Rolls-Royce Phantom, Cadillacs, and convertibles used in James Bond Octopussy.",
            tip: "Fully covered indoor gallery with historic photography.",
            coords: [24.5772, 73.6966]
          },
          {
            id: "udp-alt-2",
            name: "Covered Dharohar Folk Dance Show at Bagore Ki Haveli",
            timeSlot: "Evening (07:00 PM)",
            category: "culture",
            cost: 150,
            duration: "1.5 hours",
            description: "Sheltered traditional Rajasthani fire-pot dance, puppet performance, and 11-brass pot balancing on glass.",
            tip: "The courtyard has covered awnings during rainy days.",
            coords: [24.5794, 73.6828]
          }
        ]
      },
      timeDelay: {
        title: "Palace & Sunset Lake Express",
        desc: "Core palace exploration and romantic candlelit lakeside dining at Ambrai Ghat.",
        keepIds: ["udp-1", "udp-4"]
      },
      lowEnergy: {
        title: "Romantic Rooftop & Spa Retreat Mode",
        desc: "Gentle palace terrace walk followed by rooftop cold coffee and soothing Rajasthani head massage.",
        replacements: [
          {
            id: "udp-alt-3",
            name: "Lakeside Rooftop Chill at Jheel's Ginger Coffee Bar",
            timeSlot: "Afternoon (04:00 PM)",
            category: "food",
            cost: 350,
            duration: "2 hours",
            description: "Sit on lake-edge marble jharokhas enjoying cold coffee, woodfired bagels, and serene water ripples.",
            tip: "Best relaxed spot right next to Gangaur Ghat.",
            coords: [24.5802, 73.6824]
          }
        ]
      }
    },
    places: [
      {
        id: "udp-1",
        name: "City Palace Complex & Crystal Gallery",
        timeSlot: "Morning (09:30 AM)",
        category: "culture",
        cost: 450,
        duration: "3 hours",
        description: "Rajasthan's largest royal palace complex with intricate mirror work, royal courtyards, and Lake Pichola panoramas.",
        tip: "Take the combined ticket for City Palace museum and royal gardens.",
        coords: [24.5764, 73.6835]
      },
      {
        id: "udp-2",
        name: "Lake Pichola Sunset Boat Cruise to Jag Mandir",
        timeSlot: "Evening (05:00 PM)",
        category: "nature",
        cost: 650,
        duration: "1.5 hours",
        description: "Scenic boat ride passing the Lake Palace (Taj) and stopping at the island marble palace Jagmandir.",
        tip: "The 5:00 PM sunset departure has the most magical golden-hour reflection.",
        coords: [24.5739, 73.6800]
      },
      {
        id: "udp-3",
        name: "Bagore Ki Haveli Evening Folk Dance Show",
        timeSlot: "Evening (07:00 PM)",
        category: "culture",
        cost: 150,
        duration: "1.5 hours",
        description: "High-energy Chari dance with fire pots, puppet storytelling, and famous 11-pot balancing act on glass.",
        tip: "Tickets sell out quickly; queue at the haveli counter by 5:45 PM.",
        coords: [24.5794, 73.6828]
      },
      {
        id: "udp-4",
        name: "Lakeside Rooftop Dining at Ambrai / Upré",
        timeSlot: "Night (08:30 PM)",
        category: "food",
        cost: 1300,
        duration: "2 hours",
        description: "Romantic candlelit dining directly on the water overlooking illuminated City Palace facades.",
        tip: "Try the Mewari Laal Maas (spicy mutton) or Ker Sangri with butter naan.",
        coords: [24.5790, 73.6802]
      },
      {
        id: "udp-5",
        name: "Saheliyon Ki Bari (Garden of the Maidens)",
        timeSlot: "Morning (11:30 AM)",
        category: "nature",
        cost: 50,
        duration: "1 hour",
        description: "Historic royal garden designed with marble elephant fountains, lotus pools, and rose gardens.",
        tip: "The fountains operate entirely on natural water gravity pressure with zero pumps.",
        coords: [24.6041, 73.6874]
      },
      {
        id: "udp-6",
        name: "Monsoon Palace (Sajjangarh) Hilltop Sunset",
        timeSlot: "Evening (05:30 PM)",
        category: "nature",
        cost: 300,
        duration: "2 hours",
        description: "Hilltop fortress overlooking all five lakes of Udaipur and the rugged Aravalli mountains.",
        tip: "Shared tourist jeeps are available from the base gate.",
        coords: [24.5908, 73.6394]
      }
    ]
  }
};

const INTEREST_CATEGORIES = [
  { id: "culture", label: "Culture & Heritage", icon: "🏛️" },
  { id: "nature", label: "Nature & Scenic", icon: "🌿" },
  { id: "adventure", label: "Adventure & Thrills", icon: "⚡" },
  { id: "food", label: "Food & Street Eats", icon: "🍛" },
  { id: "nightlife", label: "Nightlife & Cafes", icon: "🍸" },
  { id: "wellness", label: "Wellness & Spiritual", icon: "🧘" },
  { id: "shopping", label: "Shopping & Bazaars", icon: "🛍️" }
];
