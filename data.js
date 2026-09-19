/**
 * TravelPilot - Curated Destination Dataset for India
 * Authentic places, realistic estimated costs (₹), time slots, and interest categories.
 */

const DESTINATIONS_DATA = {
  jaipur: {
    name: "Jaipur",
    state: "Rajasthan",
    tagline: "The Pink City of Royal Forts, Palaces & Vibrant Bazaars",
    coverGradient: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
    bestTime: "October to March",
    avgDailyTransport: 600,
    highlights: ["Amber Fort", "Hawa Mahal", "Nahargarh Sunset", "Chokhi Dhani"],
    places: [
      {
        id: "jpr-1",
        name: "Amber Fort & Palace Tour",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 500,
        duration: "3 hours",
        description: "Explore the hilltop majestic Rajput fort, Sheesh Mahal (Mirror Palace), and Maota Lake views.",
        tip: "Reach before 10 AM to beat the crowd and heat."
      },
      {
        id: "jpr-2",
        name: "Panna Meena ka Kund Stepwell",
        timeSlot: "Morning (11:30 AM)",
        category: "culture",
        cost: 0,
        duration: "45 mins",
        description: "Marvel at the 16th-century geometric symmetrical stepwell near Amer.",
        tip: "Great photo spot with clean symmetrical stairs."
      },
      {
        id: "jpr-3",
        name: "Authentic Rajasthani Thali at LMB / Rawat",
        timeSlot: "Afternoon (01:00 PM)",
        category: "food",
        cost: 650,
        duration: "1.5 hours",
        description: "Indulge in Dal Baati Churma, Gatte ki Sabzi, Pyaaz Kachori, and Ghewar.",
        tip: "Try the iconic Pyaaz Kachori at Rawat Mishtan Bhandar."
      },
      {
        id: "jpr-4",
        name: "Hawa Mahal & City Palace Walk",
        timeSlot: "Afternoon (03:30 PM)",
        category: "culture",
        cost: 400,
        duration: "2.5 hours",
        description: "The 953-window Palace of Winds and royal museums inside City Palace.",
        tip: "Sip chai at Wind View Cafe directly opposite Hawa Mahal."
      },
      {
        id: "jpr-5",
        name: "Shopping in Bapu Bazaar & Johari Bazaar",
        timeSlot: "Evening (05:30 PM)",
        category: "shopping",
        cost: 1200,
        duration: "2 hours",
        description: "Shop for handcrafted Jaipuri quilts, mojris (juttis), blue pottery, and silver jewelry.",
        tip: "Friendly bargaining is expected and customary."
      },
      {
        id: "jpr-6",
        name: "Sunset at Nahargarh Fort (Padao Cafe)",
        timeSlot: "Evening (06:30 PM)",
        category: "nature",
        cost: 300,
        duration: "2 hours",
        description: "Witness the sun setting over the entire glowing pink city from the Aravalli hilltop.",
        tip: "Take a prepaid cab or auto that agrees to wait for the return trip."
      },
      {
        id: "jpr-7",
        name: "Cultural Village Experience at Chokhi Dhani",
        timeSlot: "Night (07:30 PM)",
        category: "culture",
        cost: 1100,
        duration: "3.5 hours",
        description: "Traditional folk dance, puppet shows, camel rides, and unlimited royal dining.",
        tip: "Come on an empty stomach for the grand dinner."
      },
      {
        id: "jpr-8",
        name: "Jantar Mantar Astronomical Observatory",
        timeSlot: "Morning (10:00 AM)",
        category: "culture",
        cost: 200,
        duration: "1.5 hours",
        description: "UNESCO World Heritage site featuring the world's largest stone sundial.",
        tip: "Hiring a registered guide brings the astronomical instruments to life."
      },
      {
        id: "jpr-9",
        name: "Jal Mahal (Water Palace) Promenade Walk",
        timeSlot: "Evening (05:00 PM)",
        category: "nature",
        cost: 0,
        duration: "45 mins",
        description: "Scenic evening walk along Man Sagar Lake with the floating palace in the center.",
        tip: "Street vendors sell delicious roasted corn (bhutta) and kulhad chai."
      },
      {
        id: "jpr-10",
        name: "Albert Hall Museum Light Show",
        timeSlot: "Night (08:00 PM)",
        category: "culture",
        cost: 150,
        duration: "1 hour",
        description: "Indo-Saracenic architectural masterpiece illuminated with dynamic night lighting.",
        tip: "Watch hundreds of pigeons outside in the morning, or the lights at night."
      },
      {
        id: "jpr-11",
        name: "Patrika Gate & Jawahar Circle Garden",
        timeSlot: "Morning (08:30 AM)",
        category: "culture",
        cost: 0,
        duration: "1 hour",
        description: "Stunning hand-painted pastel arches representing Rajasthani culture and history.",
        tip: "Best lighting for colorful Instagram photos before 9:30 AM."
      },
      {
        id: "jpr-12",
        name: "Street Food Tour at Masala Chowk",
        timeSlot: "Evening (07:00 PM)",
        category: "food",
        cost: 350,
        duration: "1.5 hours",
        description: "Open-air food court with 21 iconic street food stalls in one clean courtyard.",
        tip: "Try the Gulab Ji Chai and Samrat ki Jalebi."
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
    highlights: ["Baga Beach", "Dudhsagar Falls", "Fontainhas", "Fort Aguada"],
    places: [
      {
        id: "goa-1",
        name: "Fontainhas Latin Quarter Heritage Walk",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 150,
        duration: "2 hours",
        description: "Stroll along vibrant pastel Portuguese villas, tiled roofs, and quaint wooden balconies in Panjim.",
        tip: "Grab fresh poi bread and pastel de nata at 31st January Bakery."
      },
      {
        id: "goa-2",
        name: "Basilica of Bom Jesus & Old Goa Churches",
        timeSlot: "Morning (11:30 AM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "UNESCO World Heritage 16th-century baroque cathedral holding the sacred relics of St. Francis Xavier.",
        tip: "Modest dress required covering shoulders and knees."
      },
      {
        id: "goa-3",
        name: "Authentic Goan Fish Thali at Ritz Classic",
        timeSlot: "Afternoon (01:30 PM)",
        category: "food",
        cost: 450,
        duration: "1 hour",
        description: "Traditional Kingfish fry, prawn curry, kismur, sol kadhi, and rice.",
        tip: "Ask for freshly prepared Sol Kadhi to beat the afternoon heat."
      },
      {
        id: "goa-4",
        name: "Fort Aguada & Lighthouse Viewpoint",
        timeSlot: "Afternoon (04:00 PM)",
        category: "culture",
        cost: 100,
        duration: "1.5 hours",
        description: "17th-century Portuguese fortress offering panoramic views where Mandovi River meets the Arabian Sea.",
        tip: "Visit the lower fort for sunset photography."
      },
      {
        id: "goa-5",
        name: "Water Sports at Baga / Calangute Beach",
        timeSlot: "Morning (10:00 AM)",
        category: "adventure",
        cost: 1500,
        duration: "2.5 hours",
        description: "Parasailing, Jet Ski rides, Banana Boat, and Bumper rides over azure waves.",
        tip: "Book package combos on the beach directly for discounted rates."
      },
      {
        id: "goa-6",
        name: "Sunset & Cocktails at Thalassa / Curlies",
        timeSlot: "Evening (06:00 PM)",
        category: "nightlife",
        cost: 1400,
        duration: "2.5 hours",
        description: "Cliffside Greek dining with panoramic Arabian Sea sunset views and chill electronic beats.",
        tip: "Reserve cliffside tables 2-3 days in advance."
      },
      {
        id: "goa-7",
        name: "Anjuna Flea Market / Arpora Saturday Night Market",
        timeSlot: "Evening (06:30 PM)",
        category: "shopping",
        cost: 800,
        duration: "2 hours",
        description: "Eclectic hippie stalls, live music, handcrafted leather, bohemian clothes, and food trucks.",
        tip: "Saturday night market has great international food stalls and live bands."
      },
      {
        id: "goa-8",
        name: "Dudhsagar Waterfall Jeep Safari Tour",
        timeSlot: "Morning (07:30 AM)",
        category: "adventure",
        cost: 1800,
        duration: "5 hours",
        description: "Thrilling 4x4 jungle jeep safari through Bhagwan Mahavir Sanctuary to India's 4-tiered giant waterfall.",
        tip: "Life jackets are mandatory for swimming in the natural pool."
      },
      {
        id: "goa-9",
        name: "Spice Plantation Guided Tour & Buffet Lunch",
        timeSlot: "Afternoon (12:30 PM)",
        category: "nature",
        cost: 600,
        duration: "2.5 hours",
        description: "Aromatic walk amidst vanilla, cardamom, and cinnamon plantations with organic Goan buffet on banana leaves.",
        tip: "Try the complimentary welcome lemongrass tea and feni taster."
      },
      {
        id: "goa-10",
        name: "Palolem Beach Silent Noise Party / Kayaking",
        timeSlot: "Evening (05:00 PM)",
        category: "adventure",
        cost: 700,
        duration: "2 hours",
        description: "Scenic crescent bay with calm waters for kayaking to Butterfly Beach, followed by beachfront cafes.",
        tip: "South Goa has much calmer, cleaner water than North Goa."
      },
      {
        id: "goa-11",
        name: "Beach Shacks & Live Music at Morjim",
        timeSlot: "Night (08:30 PM)",
        category: "nightlife",
        cost: 950,
        duration: "2.5 hours",
        description: "Relaxed beanbags, fairy lights, fresh seafood grills, and acoustic beach live sets.",
        tip: "Olive Ridley turtle nesting site nearby — keep beach noise low at night."
      },
      {
        id: "goa-12",
        name: "Mandovi River Sunset Cruise with Goan Folk Dance",
        timeSlot: "Evening (05:30 PM)",
        category: "culture",
        cost: 500,
        duration: "1.5 hours",
        description: "Double-deck river cruiser with live DJ, Dekhni folk dance, and panoramic coastal lights.",
        tip: "Departs from Santa Monica Jetty in Panaji."
      }
    ]
  },

  manali: {
    name: "Manali",
    state: "Himachal Pradesh",
    tagline: "Snow-Capped Himalayan Peaks, Pine Valleys & High-Altitude Adventure",
    coverGradient: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
    bestTime: "March to June / Dec to Feb (for snow)",
    avgDailyTransport: 700,
    highlights: ["Solang Valley", "Atal Tunnel & Sissu", "Hadimba Temple", "Old Manali Cafes"],
    places: [
      {
        id: "mnl-1",
        name: "Hadimba Devi Temple in Cedar Forest",
        timeSlot: "Morning (09:00 AM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "Ancient 1553 AD pagoda-style wooden temple nestled inside towering Dhungri deodar forests.",
        tip: "Look out for Himalayan yak photo ops outside the temple complex."
      },
      {
        id: "mnl-2",
        name: "Solang Valley Adventure Sports",
        timeSlot: "Morning (11:00 AM)",
        category: "adventure",
        cost: 2000,
        duration: "3.5 hours",
        description: "Paragliding, Zorbing, ATV quad biking, and ropeway cable car rides with mountain views.",
        tip: "Always check weather conditions before booking paragliding."
      },
      {
        id: "mnl-3",
        name: "Traditional Himachali Siddu & Trout Lunch",
        timeSlot: "Afternoon (02:00 PM)",
        category: "food",
        cost: 450,
        duration: "1 hour",
        description: "Steamed wheat walnut Siddu with desi ghee and fresh river-caught Tandoori Trout fish.",
        tip: "Try local cafes in Old Manali for authentic homemade walnut Siddu."
      },
      {
        id: "mnl-4",
        name: "Old Manali Cafe Hopping & Live Indie Music",
        timeSlot: "Evening (05:00 PM)",
        category: "nightlife",
        cost: 750,
        duration: "2.5 hours",
        description: "Bohemian vibes, wood-fired pizza at Cafe 1947, riverside outdoor seating, and live acoustic music.",
        tip: "Cafe 1947 by the Manalsu River is legendary for river sounds and woodfired pizza."
      },
      {
        id: "mnl-5",
        name: "Atal Tunnel & Sissu Waterfall Day Excursion",
        timeSlot: "Morning (08:30 AM)",
        category: "nature",
        cost: 1200,
        duration: "4.5 hours",
        description: "Drive through the 9.02 km high-altitude engineering marvel into Lahaul Valley's glacial landscapes and Sissu waterfall.",
        tip: "Start early to avoid tunnel checkpoint queues."
      },
      {
        id: "mnl-6",
        name: "Vashisht Hot Springs & Jogni Waterfall Trek",
        timeSlot: "Morning (09:30 AM)",
        category: "adventure",
        cost: 100,
        duration: "3 hours",
        description: "Natural sulfur thermal healing springs followed by a scenic 3 km pine trail trek to the 160-ft cascading Jogni Falls.",
        tip: "Wear sturdy hiking boots with good grip for the rocky steps."
      },
      {
        id: "mnl-7",
        name: "Mall Road Stroll & Tibetan Market Shopping",
        timeSlot: "Evening (06:30 PM)",
        category: "shopping",
        cost: 900,
        duration: "2 hours",
        description: "Shop for Kullu shawls, wooden handicrafts, Tibetan singing bowls, and hot momos.",
        tip: "Visit the Tibetan Monastery just off the main street for peace."
      },
      {
        id: "mnl-8",
        name: "Naggar Castle Heritage & Nicholas Roerich Gallery",
        timeSlot: "Afternoon (01:00 PM)",
        category: "culture",
        cost: 200,
        duration: "2.5 hours",
        description: "500-year-old wooden castle of Kullu kings overlooking Beas Valley, with Russian painter Roerich's estate.",
        tip: "Enjoy apple pie at the courtyard cafe inside the castle."
      },
      {
        id: "mnl-9",
        name: "Paragliding over Dobhi / Kullu Valley",
        timeSlot: "Morning (10:30 AM)",
        category: "adventure",
        cost: 2500,
        duration: "2 hours",
        description: "High-flying 15-minute tandem glide offering 360-degree aerial views of the snow-clad peaks.",
        tip: "Opt for GoPro video package included with the pilot."
      },
      {
        id: "mnl-10",
        name: "River Rafting on the Beas River (Babeli)",
        timeSlot: "Afternoon (03:00 PM)",
        category: "adventure",
        cost: 1000,
        duration: "1.5 hours",
        description: "Exciting 7 km Grade II & III white water rapids through the scenic Kullu gorge.",
        tip: "Keep a spare set of dry clothes and waterproof bag."
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
    highlights: ["Alleppey Houseboat", "Munnar Tea Gardens", "Fort Kochi", "Kathakali Performance"],
    places: [
      {
        id: "ker-1",
        name: "Alleppey Backwater Day Cruise & Canoe Ride",
        timeSlot: "Morning (09:30 AM)",
        category: "nature",
        cost: 1600,
        duration: "4 hours",
        description: "Glide through serene palm-fringed canals, village paddy fields, and lagoons on a traditional Kettuvallam.",
        tip: "Take a narrow shikara or canoe to reach the tiny village inner canals."
      },
      {
        id: "ker-2",
        name: "Munnar Tea Gardens & KDHP Tea Museum Tour",
        timeSlot: "Morning (10:00 AM)",
        category: "nature",
        cost: 250,
        duration: "2.5 hours",
        description: "Endless rolling green tea carpet hills, tea leaf plucking demo, and historic factory processing tour.",
        tip: "Buy authentic freshly ground single-estate black tea at factory rates."
      },
      {
        id: "ker-3",
        name: "Traditional Kerala Sadhya on Banana Leaf",
        timeSlot: "Afternoon (01:00 PM)",
        category: "food",
        cost: 400,
        duration: "1.5 hours",
        description: "Grand vegetarian feast of 24 dishes including Avial, Thoran, Sambar, Payasam, and crispy banana chips.",
        tip: "Eat with clean hands to enjoy the traditional texture and flavor."
      },
      {
        id: "ker-4",
        name: "Fort Kochi Heritage Walk & Chinese Fishing Nets",
        timeSlot: "Evening (04:30 PM)",
        category: "culture",
        cost: 100,
        duration: "2 hours",
        description: "Explore colonial Jewish Town, Santa Cruz Basilica, Mattancherry Palace, and iconic cantilevers at sunset.",
        tip: "Try fresh catch of fish marinated in spices directly at the Kochi pier stalls."
      },
      {
        id: "ker-5",
        name: "Kathakali & Kalaripayattu Live Cultural Show",
        timeSlot: "Evening (06:30 PM)",
        category: "culture",
        cost: 450,
        duration: "2 hours",
        description: "Live classical facial expression dance drama and Kerala's ancient 3000-year-old martial arts demonstration.",
        tip: "Arrive 30 mins early at 6 PM to watch the actors apply organic makeup."
      },
      {
        id: "ker-6",
        name: "Eravikulam National Park (Nilgiri Tahr Sanctuary)",
        timeSlot: "Morning (08:30 AM)",
        category: "nature",
        cost: 300,
        duration: "3 hours",
        description: "Spot endangered wild Nilgiri mountain goats on Anamudi, South India's highest mountain peak.",
        tip: "Book forest department entry tickets online to avoid long ticket queues."
      },
      {
        id: "ker-7",
        name: "Authentic Ayurvedic Herbal Rejuvenation Massage",
        timeSlot: "Afternoon (03:00 PM)",
        category: "wellness",
        cost: 1800,
        duration: "1.5 hours",
        description: "Holistic Abhyanga full-body warm medicinal herbal oil therapy with steam bath.",
        tip: "Ensure you choose a certified government-approved Ayurvedic center."
      },
      {
        id: "ker-8",
        name: "Mattupetty Dam & Eco Echo Point Boating",
        timeSlot: "Afternoon (02:00 PM)",
        category: "nature",
        cost: 350,
        duration: "1.5 hours",
        description: "Speedboating in the scenic mountain reservoir surrounded by mist and tea slopes.",
        tip: "Shout across the lake at Echo Point to hear your multi-echo return."
      },
      {
        id: "ker-9",
        name: "Marari Beach Sunset & Coconut Palm Shacks",
        timeSlot: "Evening (05:30 PM)",
        category: "nature",
        cost: 0,
        duration: "2 hours",
        description: "Unspoiled golden sand fisherman's beach, gentle surf, and peaceful sunset strolls.",
        tip: "Much quieter and cleaner than urban commercial beaches."
      },
      {
        id: "ker-10",
        name: "Spice Market Shopping at Jew Town, Kochi",
        timeSlot: "Morning (11:00 AM)",
        category: "shopping",
        cost: 700,
        duration: "1.5 hours",
        description: "Shop for aromatic Malabar black pepper, green cardamom, star anise, nutmeg, and handicrafts.",
        tip: "Visit the 450-year-old Paradesi Synagogue in the same alley."
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
    highlights: ["Triveni Ghat Aarti", "Ganga White Water Rafting", "Beatles Ashram", "Neer Garh Waterfall"],
    places: [
      {
        id: "rsh-1",
        name: "Sunrise Yoga & Meditation Session by the Ganges",
        timeSlot: "Morning (06:30 AM)",
        category: "wellness",
        cost: 300,
        duration: "1.5 hours",
        description: "Calming morning Pranayama and Hatha yoga session overlooking the flowing holy river.",
        tip: "Carry a comfortable yoga mat or light cotton towel."
      },
      {
        id: "rsh-2",
        name: "White Water River Rafting (Shivpuri to NIM Beach)",
        timeSlot: "Morning (09:30 AM)",
        category: "adventure",
        cost: 1200,
        duration: "3 hours",
        description: "16 km thrilling ride tackling Grade III rapids like Roller Coaster, Golf Course, and Clubhouse.",
        tip: "Body surfing in calm river sections with your lifejacket is a must-do."
      },
      {
        id: "rsh-3",
        name: "Healthy Organic Brunch at Little Buddha Cafe",
        timeSlot: "Afternoon (01:30 PM)",
        category: "food",
        cost: 450,
        duration: "1.5 hours",
        description: "Treehouse style cafe overlooking Laxman Jhula with Israeli platters, fresh smoothies, and lemon ginger tea.",
        tip: "Get a top-floor floor-cushion seat with river breeze."
      },
      {
        id: "rsh-4",
        name: "The Beatles Ashram (Chaurasi Kutia) Tour",
        timeSlot: "Afternoon (03:30 PM)",
        category: "culture",
        cost: 200,
        duration: "2 hours",
        description: "Walk inside the 1968 Maharishi Mahesh Yogi ashram where the Beatles composed the White Album, surrounded by vibrant graffiti.",
        tip: "Visit the meditation domes and the Beatles photo gallery inside."
      },
      {
        id: "rsh-5",
        name: "Grand Maha Ganga Aarti at Triveni Ghat",
        timeSlot: "Evening (06:00 PM)",
        category: "culture",
        cost: 50,
        duration: "1.5 hours",
        description: "Soul-stirring prayer with burning brass lamps, Vedic chanting, conch shells, and floating flower diyas.",
        tip: "Arrive by 5:30 PM to secure a front step seat right near the priests."
      },
      {
        id: "rsh-6",
        name: "Neer Garh Waterfall Hike",
        timeSlot: "Morning (09:00 AM)",
        category: "nature",
        cost: 80,
        duration: "2.5 hours",
        description: "Gentle 2 km hillside trek through terraced steps to crystal-clear emerald mountain plunge pools.",
        tip: "Carry your swimwear if you'd like a refreshing dip in the middle pool."
      },
      {
        id: "rsh-7",
        name: "Bungee Jump & Giant Swing at Mohan Chatti",
        timeSlot: "Morning (10:30 AM)",
        category: "adventure",
        cost: 3800,
        duration: "2.5 hours",
        description: "India's highest 83-meter fixed platform bungee jump operated by certified Jump Masters.",
        tip: "Advance booking required; avoid heavy breakfast right before jumping."
      },
      {
        id: "rsh-8",
        name: "Laxman Jhula & Ram Jhula Sunset Walk",
        timeSlot: "Evening (05:00 PM)",
        category: "culture",
        cost: 0,
        duration: "1 hour",
        description: "Iconic iron suspension bridges connecting bustling ashrams, sweet shops, and riverside ghats.",
        tip: "Watch out for cheeky monkeys on the bridge cables—keep food in bags."
      },
      {
        id: "rsh-9",
        name: "Sound Healing & Tibetan Bowls Meditation",
        timeSlot: "Evening (07:30 PM)",
        category: "wellness",
        cost: 500,
        duration: "1 hour",
        description: "Deep relaxation through acoustic frequencies and vibrational bronze singing bowls.",
        tip: "Wear comfortable, loose cotton clothing."
      },
      {
        id: "rsh-10",
        name: "Authentic Garhwali Dinner & Herbal Chai",
        timeSlot: "Night (08:30 PM)",
        category: "food",
        cost: 350,
        duration: "1 hour",
        description: "Local Kumaoni and Garhwali dishes like Kafuli, Jhangore ki Kheer, and Mandua ki Roti.",
        tip: "Pair with locally harvested rhododendron (buransh) juice."
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
    highlights: ["City Palace", "Lake Pichola Boat Cruise", "Bagore Ki Haveli", "Sajjangarh Monsoon Palace"],
    places: [
      {
        id: "udp-1",
        name: "City Palace Complex & Crystal Gallery",
        timeSlot: "Morning (09:30 AM)",
        category: "culture",
        cost: 450,
        duration: "3 hours",
        description: "Rajasthan's largest royal palace complex with intricate mirror work, royal courtyards, and Lake Pichola panoramas.",
        tip: "Take the combined ticket for City Palace museum and royal gardens."
      },
      {
        id: "udp-2",
        name: "Lake Pichola Sunset Boat Cruise to Jag Mandir",
        timeSlot: "Evening (05:00 PM)",
        category: "nature",
        cost: 650,
        duration: "1.5 hours",
        description: "Scenic boat ride passing the Lake Palace (Taj) and stopping at the island marble palace Jagmandir.",
        tip: "The 5:00 PM sunset departure has the most magical golden-hour reflection."
      },
      {
        id: "udp-3",
        name: "Bagore Ki Haveli Evening Folk Dance Show (Dharohar)",
        timeSlot: "Evening (07:00 PM)",
        category: "culture",
        cost: 150,
        duration: "1.5 hours",
        description: "High-energy Chari dance with fire pots, puppet storytelling, and famous 11-pot balancing act on glass.",
        tip: "Tickets sell out quickly; queue at the haveli counter by 5:45 PM."
      },
      {
        id: "udp-4",
        name: "Lakeside Rooftop Dining at Ambrai / Upré",
        timeSlot: "Night (08:30 PM)",
        category: "food",
        cost: 1300,
        duration: "2 hours",
        description: "Romantic candlelit dining directly on the water overlooking illuminated City Palace facades.",
        tip: "Try the Mewari Laal Maas (spicy mutton) or Ker Sangri with butter naan."
      },
      {
        id: "udp-5",
        name: "Saheliyon Ki Bari (Garden of the Maidens)",
        timeSlot: "Morning (11:30 AM)",
        category: "nature",
        cost: 50,
        duration: "1 hour",
        description: "Historic royal garden designed with marble elephant fountains, lotus pools, and rose gardens.",
        tip: "The fountains operate entirely on natural water gravity pressure with zero pumps."
      },
      {
        id: "udp-6",
        name: "Monsoon Palace (Sajjangarh) Hilltop Sunset",
        timeSlot: "Evening (05:30 PM)",
        category: "nature",
        cost: 300,
        duration: "2 hours",
        description: "Hilltop fortress overlooking all five lakes of Udaipur and the rugged Aravalli mountains.",
        tip: "Shared tourist jeeps are available from the base gate."
      },
      {
        id: "udp-7",
        name: "Jagdish Temple & Old City Bazaar Shopping",
        timeSlot: "Morning (10:30 AM)",
        category: "shopping",
        cost: 600,
        duration: "1.5 hours",
        description: "Carved Indo-Aryan stone temple followed by miniature paintings, handmade leather diaries, and bandhani sarees.",
        tip: "Hathi Pol bazaar is best for authentic Pichwai paintings and textiles."
      },
      {
        id: "udp-8",
        name: "Street Food Tour at Sukhadia Circle & Chetak",
        timeSlot: "Evening (06:30 PM)",
        category: "food",
        cost: 250,
        duration: "1 hour",
        description: "Taste Udaipur's famous crispy Dal Padi, Mirchi Bada, Pav Bhaji, and creamy Kesar Kulfi.",
        tip: "Sukhadia Circle fountain is illuminated in the evenings."
      },
      {
        id: "udp-9",
        name: "Shilpgram Rural Arts & Crafts Village",
        timeSlot: "Afternoon (02:30 PM)",
        category: "culture",
        cost: 100,
        duration: "2 hours",
        description: "Living ethnographic museum showcasing traditional tribal mud huts, potters, weavers, and folk artists.",
        tip: "Buy terracotta pottery and camel leather crafts directly from artisan hands."
      },
      {
        id: "udp-10",
        name: "Fateh Sagar Lake Promenade & Nehru Park Island",
        timeSlot: "Evening (04:30 PM)",
        category: "nature",
        cost: 150,
        duration: "1.5 hours",
        description: "Bustling waterfront promenade, cold coffee stalls at Bombay Market, and motorboat rides to island park.",
        tip: "Try the iconic thick cold coffee at Sai Baba Cold Coffee on the promenade."
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
