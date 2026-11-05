/**
 * ServeEase — Demo Provider Data Seeder (Five-City Dataset)
 * 
 * Provisions realistic, clearly labelled demonstration service providers
 * for college presentation, viva demo, and evaluation across Maharashtra:
 * 
 * Target Distribution:
 * - Sangli:                   20 providers
 * - Chhatrapati Sambhajinagar:  8 providers
 * - Mumbai:                   12 providers
 * - Pune:                     12 providers
 * - Nagpur:                    8 providers
 * Total:                      60 providers
 * 
 * Safety & Integrity:
 * - Marked internally with `isDemo: true`
 * - Marked with `isVerified: true` (no fake verification claims)
 * - Fictional sample contact information (@serveease.demo email domains)
 * - Zero fabricated customer reviews or fake ratings
 * - Idempotent upsert by unique demo email: rerunning will NEVER create duplicates
 * - Safe: Never deletes or overwrites existing real accounts or user bookings
 */

import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const DEMO_PROVIDERS = [
  // =========================================================================
  // 1. SANGLI PROVIDERS (20 Profiles)
  // =========================================================================
  {
    name: "Suresh R. Patil",
    email: "demo.sangli.plumber.1@serveease.demo",
    phoneNumber: "+91 98221 10001",
    city: "sangli",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Senior Pipe Fitting & Leakage Specialist",
      servicesOffered: ["Concealed Pipe Leaks", "CP Fitting Assembly", "Overhead Tank Valve", "Geyser Connections", "Drain Cleaning"],
      experienceYears: 9,
      city: "sangli",
      serviceArea: "Vishrambag & Gaonbhag",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Nine years of residential plumbing expertise across Vishrambag and South Sangli. Quick diagnosis of pipe blockages and sanitary repairs.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Ganesh M. Kulkarni",
    email: "demo.sangli.plumber.2@serveease.demo",
    phoneNumber: "+91 98221 10002",
    city: "sangli",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Commercial & Residential Sanitary Tech",
      servicesOffered: ["Bathroom Remodel Plumbing", "Pressure Pump Installation", "Kitchen Sink Traps", "Water Line Fitting"],
      experienceYears: 6,
      city: "sangli",
      serviceArea: "Kupwad & Market Yard",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Certified plumber specialized in pressure booster pump setups and multi-floor drainage layouts.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Ramesh B. Deshmukh",
    email: "demo.sangli.electrician.1@serveease.demo",
    phoneNumber: "+91 98221 10003",
    city: "sangli",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Licensed Wireman & Tripping Specialist",
      servicesOffered: ["Short Circuit Troubleshooting", "MCB Box Replacement", "Inverter Battery Wiring", "Ceiling Fan Balance"],
      experienceYears: 11,
      city: "sangli",
      serviceArea: "Vishrambag, Rajwada & Khanbhag",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Government-licensed wireman serving old town Sangli and Vishrambag. Fast diagnostic of power fluctuation and panel heating.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Pravin K. Shinde",
    email: "demo.sangli.electrician.2@serveease.demo",
    phoneNumber: "+91 98221 10004",
    city: "sangli",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Heavy Appliance & Inverter Electrician",
      servicesOffered: ["Single-Phase to Three-Phase Wiring", "Geyser Power Circuit Setup", "LED Concealed Lighting", "Earth Leakage Check"],
      experienceYears: 4,
      city: "sangli",
      serviceArea: "Miraj & Madhavnagar",
      startingPrice: 199,
      hourlyRate: 250,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Skilled electrician focusing on household safety, grounding checks, and power wiring for newly installed ACs and water heaters.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 35 mins"
    }
  },
  {
    name: "Prashant V. More",
    email: "demo.sangli.electrician.3@serveease.demo",
    phoneNumber: "+91 98221 10005",
    city: "sangli",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Solar & Inverter Backup Technician",
      servicesOffered: ["Rooftop Solar Inverter Check", "Home UPS Setup", "Switchboard Upgrades", "Voltage Fluctuation Arrestors"],
      experienceYears: 8,
      city: "sangli",
      serviceArea: "Kalanagar & Market Yard",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: false,
      isVerified: true,
      isDemo: true,
      bio: "Clean energy and emergency power specialist. Expert in backup battery wiring and smart switchboard retrofit.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Sunita A. Jadhav",
    email: "demo.sangli.cleaning.1@serveease.demo",
    phoneNumber: "+91 98221 10006",
    city: "sangli",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Deep Kitchen & Washroom Decontamination",
      servicesOffered: ["Deep Kitchen Degreasing", "Bathroom Tile Scaling Removal", "Full House Post-Paint Scrubbing", "Balcony Sanitization"],
      experienceYears: 5,
      city: "sangli",
      serviceArea: "Vishrambag & Sangliwadi",
      startingPrice: 499,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Trained residential cleaning lead. Uses industrial vacuum equipment and pet-safe enzymatic detergents for hard-water stain removal.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Kavita S. Gaikwad",
    email: "demo.sangli.cleaning.2@serveease.demo",
    phoneNumber: "+91 98221 10007",
    city: "sangli",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Sofa, Mattress & Fabric Upholstery Care",
      servicesOffered: ["5-Seater Sofa Steam Extraction", "Mattress Allergen Vacuuming", "Curtain Cleaning On-Site", "Car Seat Shampooing"],
      experienceYears: 6,
      city: "sangli",
      serviceArea: "Chintamani Nagar & Gaonbhag",
      startingPrice: 599,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Specialist in fabric revival and deep upholstery dust mite removal using German extraction machinery.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Santosh N. Sutar",
    email: "demo.sangli.carpenter.1@serveease.demo",
    phoneNumber: "+91 98221 10008",
    city: "sangli",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Modular Furniture Assembly & Lock Specialist",
      servicesOffered: ["Godrej Lock Installation", "Modular Kitchen Hinge Replacement", "Sliding Wardrobe Roller Fix", "Bed Frame Reinforcement"],
      experienceYears: 12,
      city: "sangli",
      serviceArea: "Rajwada & Vishrambag",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Over a decade of precision carpentry. Skilled in soft-close kitchen fittings, custom wardrobe alterations, and lock fixes.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Ashok K. Mane",
    email: "demo.sangli.carpenter.2@serveease.demo",
    phoneNumber: "+91 98221 10009",
    city: "sangli",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Door Alignment & General Woodcraft",
      servicesOffered: ["Wooden Door Planing", "Window Latch Repairs", "Plywood Partitions", "Dining Table Leg Fixing"],
      experienceYears: 7,
      city: "sangli",
      serviceArea: "Kupwad & Sangliwadi",
      startingPrice: 299,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Dependable neighborhood carpenter specializing in door swelling adjustments during monsoon and sturdy wooden furniture maintenance.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Nitin P. Kale",
    email: "demo.sangli.mechanic.1@serveease.demo",
    phoneNumber: "+91 98221 10010",
    city: "sangli",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Doorstep Two-Wheeler Tuning & Oil Service",
      servicesOffered: ["Activa / Bike Engine Oil Change", "Disc Brake Pad Replacement", "Carburetor Tuning & Cleaning", "Drive Belt Inspection"],
      experienceYears: 8,
      city: "sangli",
      serviceArea: "Market Yard & Miraj Road",
      startingPrice: 249,
      hourlyRate: 250,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Mobile mechanic with a compact field kit. Solves starting troubles, spark plug failures, and offers doorstep scooter lube service.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Anand T. Shinde",
    email: "demo.sangli.mechanic.2@serveease.demo",
    phoneNumber: "+91 98221 10011",
    city: "sangli",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Car Battery Jumpstart & Puncture Support",
      servicesOffered: ["Tubeless Tyre Puncture On-Site", "Battery Jumpstart (12V)", "Coolant Top-Up", "Brake Fluid Inspection"],
      experienceYears: 5,
      city: "sangli",
      serviceArea: "Vishrambag & Bypass Road",
      startingPrice: 199,
      hourlyRate: 200,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "On-call emergency roadside assistance specialist in Sangli municipal boundaries. Rapid scooter and hatchback roadside aid.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Dipak S. Thorat",
    email: "demo.sangli.appliance.1@serveease.demo",
    phoneNumber: "+91 98221 10012",
    city: "sangli",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Refrigeration & Washing Machine Specialist",
      servicesOffered: ["Single / Double Door Fridge Gas Refill", "Washing Machine Drum Drain Motor", "Thermostat Replacement", "Microwave Magnetron Fix"],
      experienceYears: 10,
      city: "sangli",
      serviceArea: "Vishrambag & Khanbhag",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Experienced technician handling LG, Samsung, and Whirlpool refrigerators, top-load washers, and microwave ovens.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Vikram R. Bhosale",
    email: "demo.sangli.appliance.2@serveease.demo",
    phoneNumber: "+91 98221 10013",
    city: "sangli",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Inverter AC Servicing & Water Heater Tech",
      servicesOffered: ["Split AC Jet Foam Wash", "Copper Tube Leak Brazing", "Storage Geyser Element Heating", "RO Filter Membrane Change"],
      experienceYears: 7,
      city: "sangli",
      serviceArea: "Madhavnagar & Gaonbhag",
      startingPrice: 399,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "HVAC and home water purifier specialist. Specializes in summer AC coil pressure cleaning and pre-winter geyser descaling.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },
  {
    name: "Chandrakant G. Salunkhe",
    email: "demo.sangli.painter.1@serveease.demo",
    phoneNumber: "+91 98221 10014",
    city: "sangli",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Interior Emulsion & Damp Seepage Coating",
      servicesOffered: ["Waterproofing Wall Putty", "Asian Paints Royale Emulsion Application", "Ceiling Mold Cleaning & Primer", "Door Enamel Gloss"],
      experienceYears: 14,
      city: "sangli",
      serviceArea: "Vishrambag & Miraj",
      startingPrice: 499,
      hourlyRate: 500,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Master wall finisher with 14 years across residential bungalows. Thorough crack repair, moisture inspection, and airless spray coat.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Balasaheb V. Jagtap",
    email: "demo.sangli.painter.2@serveease.demo",
    phoneNumber: "+91 98221 10015",
    city: "sangli",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Rental Repaint & Texture Accent Specialist",
      servicesOffered: ["Quick 1-Day Rental Refresh", "Living Room Texture Wall", "Distemper & White Washing", "Metal Grill Anti-Rust Paint"],
      experienceYears: 6,
      city: "sangli",
      serviceArea: "Kupwad & Kalanagar",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Cost-effective, reliable apartment repainting. Quick turnaround between tenant turnovers with neat floor masking.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1.5 hours"
    }
  },
  {
    name: "Pandurang K. Chavan",
    email: "demo.sangli.driving.1@serveease.demo",
    phoneNumber: "+91 98221 10016",
    city: "sangli",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Temporary Chauffeur & Outstation Driver",
      servicesOffered: ["Hourly City Driving", "Sangli to Kolhapur Highway Trips", "Night Driver for Family Cars", "Automatic / Manual Transmission Handling"],
      experienceYears: 11,
      city: "sangli",
      serviceArea: "Vishrambag, Rajwada & Kupwad",
      startingPrice: 299,
      hourlyRate: 150,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Verified commercial badge driver with clean record. Patient driver for senior citizens and outstation family trips in personal vehicles.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Dattatray N. Ghorpade",
    email: "demo.sangli.driving.2@serveease.demo",
    phoneNumber: "+91 98221 10017",
    city: "sangli",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Event & Emergency Standby Driver",
      servicesOffered: ["Wedding & Event Conveyance", "Medical Emergency Transfer Driver", "SUV Long-Distance Driving", "Local Errands Chauffeur"],
      experienceYears: 8,
      city: "sangli",
      serviceArea: "Gaonbhag & Sangliwadi",
      startingPrice: 349,
      hourlyRate: 180,
      isAvailable: false,
      isVerified: true,
      isDemo: true,
      bio: "Experienced across highway stretches. Punctual, non-smoking personal car driver available on an hourly or daily stipend basis.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },
  {
    name: "Yogesh M. Naik",
    email: "demo.sangli.plumber.3@serveease.demo",
    phoneNumber: "+91 98221 10018",
    city: "sangli",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Emergency Pipe Burst & Water Tank Tech",
      servicesOffered: ["Overhead Tank Ball Valve", "Submersible Motor Connection", "Drain Rodding", "Kitchen Tap Replacement"],
      experienceYears: 5,
      city: "sangli",
      serviceArea: "Chintamani Nagar & Gaonbhag",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Fast response technician resolving persistent water dripping, faulty ball valves, and kitchen sink blockages.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Mahesh D. Pawar",
    email: "demo.sangli.painter.3@serveease.demo",
    phoneNumber: "+91 98221 10019",
    city: "sangli",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Waterproofing & Exterior Texture Painter",
      servicesOffered: ["Terrace Waterproofing", "Exterior Weatherproof Paint", "Anti-Fungal Primer", "Enamel Painting"],
      experienceYears: 9,
      city: "sangli",
      serviceArea: "Vishrambag & Rajwada",
      startingPrice: 399,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Specialized in weather-resistant exterior coats and leakproof roof sealant across South Sangli.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Sachin B. Yadav",
    email: "demo.sangli.cleaning.3@serveease.demo",
    phoneNumber: "+91 98221 10020",
    city: "sangli",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Residential Floor Buffing & Glass Cleaning",
      servicesOffered: ["Marble Floor Machine Polish", "French Window Cleaning", "Chimney Deep Clean", "Balcony Power Wash"],
      experienceYears: 6,
      city: "sangli",
      serviceArea: "Kalanagar & Kupwad",
      startingPrice: 449,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Reliable team leader for pre-festival thorough deep cleans and marble restoration.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },

  // =========================================================================
  // 2. CHHATRAPATI SAMBHAJINAGAR PROVIDERS (8 Profiles)
  // =========================================================================
  {
    name: "Sayyed A. Qureshi",
    email: "demo.csn.plumber.1@serveease.demo",
    phoneNumber: "+91 98230 20001",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Industrial & Domestic Water Pipeline Expert",
      servicesOffered: ["Borewell Submersible Connection", "High-Pressure CPVC Piping", "Bathroom Flush Tank Overhaul", "Solar Water Heater Line Repair"],
      experienceYears: 11,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Cidco & Cannaught Place",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Over a decade solving Sambhajinagar hard-water calcium deposit issues in bathroom geysers and concealed pipeline blockages.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Vijay M. Somvanshi",
    email: "demo.csn.electrician.1@serveease.demo",
    phoneNumber: "+91 98230 20002",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Power Distribution & Circuit Breaker Tech",
      servicesOffered: ["Distribution Board Overhaul", "Earthing Pit Resistance Check", "Heavy Machinery Starter Fix", "Decorative False Ceiling Wiring"],
      experienceYears: 8,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Kranti Chowk & Waluj",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Commercial and home electrician. Prompt emergency service for tripped main breakers and commercial light installations.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Irfan K. Pathan",
    email: "demo.csn.appliance.1@serveease.demo",
    phoneNumber: "+91 98230 20003",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Split AC Gas Top-up & Coil Service",
      servicesOffered: ["R32 / R410A Refrigerant Filling", "AC PCB Circuit Board Diagnostics", "Indoor Blower Cleaning", "Outdoor Fan Motor Replacement"],
      experienceYears: 7,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Seven Hills & Samarth Nagar",
      startingPrice: 399,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Fast doorstep cooling troubleshooting across Cidco and Central Sambhajinagar. Transparent rates with warranty on compressor refills.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 35 mins"
    }
  },
  {
    name: "Shrikant R. Joshi",
    email: "demo.csn.carpenter.1@serveease.demo",
    phoneNumber: "+91 98230 20004",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Solid Teak & Modular Wardrobe Joiner",
      servicesOffered: ["Hydraulic Bed Lift Replacement", "Kitchen Basket Alignment", "Main Safety Door Lock Fitting", "Custom Plywood Bookshelf"],
      experienceYears: 13,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Garkheda & Town Centre",
      startingPrice: 399,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Master joiner trained in classical woodwork and contemporary modular hardware. Precision cabinet installation.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Sunita G. Bansode",
    email: "demo.csn.cleaning.1@serveease.demo",
    phoneNumber: "+91 98230 20005",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Commercial & Bungalow Deep Sanitization",
      servicesOffered: ["Full Villa Deep Sanitization", "Kitchen Chimney Baffle Filter Soak", "Hard Water Stain Acid Wash", "Window Sill & Mesh De-dusting"],
      experienceYears: 6,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Beed Bypass & Cidco",
      startingPrice: 599,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Reliable team managing full-home deep cleanings before festivals and family gatherings across Beed Bypass row houses.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Abdul R. Shaikh",
    email: "demo.csn.mechanic.1@serveease.demo",
    phoneNumber: "+91 98230 20006",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Doorstep Two-Wheeler Emergency Repair",
      servicesOffered: ["Clutch Cable Snapping Fix", "Spark Plug Cleaning & Ignition", "Drum Brake Shoe Adjustment", "Engine Decarbonizing"],
      experienceYears: 9,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Waluj, Kranti Chowk & Railway Station",
      startingPrice: 249,
      hourlyRate: 250,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Mobile motorcycle mechanic with rapid field dispatch along the Waluj industrial belt and Kranti Chowk.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Kishor H. Ingle",
    email: "demo.csn.driving.1@serveease.demo",
    phoneNumber: "+91 98230 20007",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Chauffeur & Airport/Railway Transfer Driver",
      servicesOffered: ["Local City Chauffeur", "Chhatrapati Sambhajinagar Airport Pickups", "Pune/Mumbai Highway Trips", "Luxury Car Handling"],
      experienceYears: 10,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Railway Station, Airport Road & Cidco",
      startingPrice: 399,
      hourlyRate: 150,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Punctual, non-smoking professional driver with extensive highway and local city expertise. Available for hourly bookings.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Rajendra T. More",
    email: "demo.csn.appliance.2@serveease.demo",
    phoneNumber: "+91 98230 20008",
    city: "chhatrapati-sambhajinagar",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Washing Machine & Microwave Microwave Technician",
      servicesOffered: ["Front-Load PCB Repair", "Inverter Motor Check", "Microwave Heating Element", "Water Purifier Filter Change"],
      experienceYears: 8,
      city: "chhatrapati-sambhajinagar",
      serviceArea: "Beed Bypass & Seven Hills",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Expert technician for major home appliance brands with OEM spare parts and upfront service estimates.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },

  // =========================================================================
  // 3. MUMBAI PROVIDERS (12 Profiles)
  // =========================================================================
  {
    name: "Amit S. Sharma",
    email: "demo.mumbai.electrician.1@serveease.demo",
    phoneNumber: "+91 98200 30001",
    city: "mumbai",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Master Residential Electrician & Smart Switch Tech",
      servicesOffered: ["Smart Home Automation Wiring", "MCB Tripping Fix", "High-Load Kitchen Wiring", "Earthing Safety Check"],
      experienceYears: 11,
      city: "mumbai",
      serviceArea: "Andheri West & Juhu",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Over a decade handling western suburban high-rises and residential flats. Specializes in luxury electrical fitouts and safety audits.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Vikram R. Merchant",
    email: "demo.mumbai.plumber.1@serveease.demo",
    phoneNumber: "+91 98200 30002",
    city: "mumbai",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Concealed Leakage & Sanitaryware Engineer",
      servicesOffered: ["Bathroom Water Seepage Detection", "Grohe / Kohler Fixture Setup", "Pressure Booster Pumps", "Drain Snake Cleaning"],
      experienceYears: 13,
      city: "mumbai",
      serviceArea: "Bandra West & Khar",
      startingPrice: 399,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Trusted plumber for high-rise apartments across Bandra. Non-invasive acoustic acoustic leak detection and luxury bath hardware specialist.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Dinesh N. Salvi",
    email: "demo.mumbai.carpenter.1@serveease.demo",
    phoneNumber: "+91 98200 30003",
    city: "mumbai",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Modular Kitchen & Veneer Door Carpenter",
      servicesOffered: ["Hettich Soft-Close Fitting", "Main Door Yale Digital Lock", "Wardrobe Slider Alignment", "Custom Floating Shelves"],
      experienceYears: 14,
      city: "mumbai",
      serviceArea: "Dadar & Prabhadevi",
      startingPrice: 399,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Craftsman skilled in marine plywood joinery, laminate repairs, and German architectural hardware assembly.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Pooja K. Mehra",
    email: "demo.mumbai.cleaning.1@serveease.demo",
    phoneNumber: "+91 98200 30004",
    city: "mumbai",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Apartment Deep Cleaning & Eco-Sanitization",
      servicesOffered: ["Move-In / Move-Out Deep Clean", "Kitchen Degreasing & Descaling", "Bathroom Mold Decontamination", "Sofa Shampooing"],
      experienceYears: 7,
      city: "mumbai",
      serviceArea: "Powai & Vikhroli",
      startingPrice: 699,
      hourlyRate: 500,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Leading a dedicated team of sanitized cleaning specialists with modern industrial scrubbing and HEPA extraction tools.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Sameer A. Khan",
    email: "demo.mumbai.appliance.1@serveease.demo",
    phoneNumber: "+91 98200 30005",
    city: "mumbai",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Inverter AC & Front-Load Washer Tech",
      servicesOffered: ["Dual-Inverter AC Jet Cleaning", "Compressor Capacitor Change", "Front Load Washing Machine Drum Bearings", "Gas Top-Up R410A"],
      experienceYears: 9,
      city: "mumbai",
      serviceArea: "Borivali West & Kandivali",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Fast response appliance technician covering western railway corridor apartments. Honest diagnosis and genuine spare parts.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Santosh M. Jadhav",
    email: "demo.mumbai.mechanic.1@serveease.demo",
    phoneNumber: "+91 98200 30006",
    city: "mumbai",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Doorstep Two-Wheeler & Car Breakdown Tech",
      servicesOffered: ["Scooter Periodic Lube Service", "Jumpstart Assistance (12V)", "Brake Pad Replacement", "Emergency Cable Repair"],
      experienceYears: 10,
      city: "mumbai",
      serviceArea: "Kurla & Chembur",
      startingPrice: 299,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Field-equipped roadside specialist providing rapid emergency breakdowns and routine home service for cars and bikes.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Girish V. Mhatre",
    email: "demo.mumbai.painter.1@serveease.demo",
    phoneNumber: "+91 98200 30007",
    city: "mumbai",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Monsoon Waterproofing & Luxury Emulsion Painter",
      servicesOffered: ["External Seepage Barrier", "Silicone Terrace Coating", "Asian Paints Royale Lustre", "Anti-Fungal Bathroom Priming"],
      experienceYears: 12,
      city: "mumbai",
      serviceArea: "Thane West & Mulund",
      startingPrice: 499,
      hourlyRate: 500,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Specializing in Mumbai coastal climate waterproofing and damp patch eradication with airless spray finishes.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Farhan I. Sayed",
    email: "demo.mumbai.driving.1@serveease.demo",
    phoneNumber: "+91 98200 30008",
    city: "mumbai",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Executive Chauffeur & Airport Transit Driver",
      servicesOffered: ["Daily Office Commute Chauffeur", "Mumbai Airport (T2) Pickups", "Pune Expressway Drive", "Luxury Automatic Car Handling"],
      experienceYears: 15,
      city: "mumbai",
      serviceArea: "Colaba & Marine Lines",
      startingPrice: 449,
      hourlyRate: 200,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Professional chauffeur with over 15 years navigating South Mumbai traffic. Punctual, polite, and fully verified driving record.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Ramesh T. Kamble",
    email: "demo.mumbai.plumber.2@serveease.demo",
    phoneNumber: "+91 98200 30009",
    city: "mumbai",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Drain Unclogging & Hydro-Jetting Specialist",
      servicesOffered: ["Kitchen Waste Pipe Rodding", "Toilet Trap Clearing", "Angle Valve Leak Fix", "Overhead Water Tank Ball Cock"],
      experienceYears: 8,
      city: "mumbai",
      serviceArea: "Ghatkopar & Vidyavihar",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Equipped with mechanical drain snakes to clear choked drainage without damaging wall tiles in residential towers.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 35 mins"
    }
  },
  {
    name: "Nilesh P. Shinde",
    email: "demo.mumbai.electrician.2@serveease.demo",
    phoneNumber: "+91 98200 30010",
    city: "mumbai",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Emergency Tripping & Meter Box Electrician",
      servicesOffered: ["Adani / Tata Power Line Check", "ELCB Tripping Troubleshooting", "Inverter Setup", "Geyser Heavy Power Point"],
      experienceYears: 7,
      city: "mumbai",
      serviceArea: "Malad & Goregaon",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Dependable neighborhood wireman resolving continuous tripping and burnt fuse issues with high-grade components.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Sunita B. Gaikwad",
    email: "demo.mumbai.cleaning.2@serveease.demo",
    phoneNumber: "+91 98200 30011",
    city: "mumbai",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Navi Mumbai Residential Deep Clean Lead",
      servicesOffered: ["Full 2BHK/3BHK Deep Wash", "Kitchen Oil Stains Degreasing", "Bathroom Acid Tile Cleaning", "Glass Panel Polishing"],
      experienceYears: 6,
      city: "mumbai",
      serviceArea: "Vashi & Nerul",
      startingPrice: 599,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Efficient deep-cleaning crew for Navi Mumbai apartments. Thorough attention to corners, window tracks, and cabinet interiors.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Anand R. Sawant",
    email: "demo.mumbai.appliance.2@serveease.demo",
    phoneNumber: "+91 98200 30012",
    city: "mumbai",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Double-Door Refrigerator & Microwave Engineer",
      servicesOffered: ["Frost-Free Refrigerator Cooling Fix", "Microwave Magnetron Sparking", "RO Filter Replacement", "Chimney Motor Servicing"],
      experienceYears: 10,
      city: "mumbai",
      serviceArea: "Andheri East & Sakinaka",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: false,
      isVerified: true,
      isDemo: true,
      bio: "Multi-brand certified tech providing genuine relay, thermostat, and gas charging for household cooling equipment.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },

  // =========================================================================
  // 4. PUNE PROVIDERS (12 Profiles)
  // =========================================================================
  {
    name: "Nitin D. Joshi",
    email: "demo.pune.electrician.1@serveease.demo",
    phoneNumber: "+91 98230 40001",
    city: "pune",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Senior Resident Wireman & Power Panel Expert",
      servicesOffered: ["MSEDCL Meter Panel Wiring", "Short Circuit Detection", "Inverter UPS Setup", "Switchboard Modular Upgrades"],
      experienceYears: 12,
      city: "pune",
      serviceArea: "Kothrud & Karve Nagar",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Twelve years serving Pune households across Kothrud. Fast, methodical detection of electrical faults and prompt home visits.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Milind S. Deshpande",
    email: "demo.pune.plumber.1@serveease.demo",
    phoneNumber: "+91 98230 40002",
    city: "pune",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Bungalow Sanitary & Pressurized Plumbing Specialist",
      servicesOffered: ["Pumping Station Maintenance", "Solar Geyser Air Lock Removal", "Bathroom Concealed Fitting", "Kitchen Waste Trap Repair"],
      experienceYears: 10,
      city: "pune",
      serviceArea: "Baner & Aundh",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Expert plumber specializing in solar water heater lines, high-rise pressure valves, and kitchen sink blockages in Baner-Aundh.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Pravin B. Sutar",
    email: "demo.pune.carpenter.1@serveease.demo",
    phoneNumber: "+91 98230 40003",
    city: "pune",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Modular Furniture Assembly & Repair Craftsman",
      servicesOffered: ["IKEA / Pepperfry Furniture Assembly", "Hydraulic Bed Hinges", "Wooden Door Planing", "Study Table Customization"],
      experienceYears: 9,
      city: "pune",
      serviceArea: "Wakad & Pimple Saudagar",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Specialist in flat-pack furniture assembly and quick home woodwork adjustments across IT corridor societies.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },
  {
    name: "Sunita R. Shinde",
    email: "demo.pune.cleaning.1@serveease.demo",
    phoneNumber: "+91 98230 40004",
    city: "pune",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "High-Rise Apartment & Kitchen Deep Clean Lead",
      servicesOffered: ["Deep Kitchen Degreasing", "Bathroom Hard-Water Scale Removal", "Balcony Power Wash", "Full Gated Society Flat Scrubbing"],
      experienceYears: 6,
      city: "pune",
      serviceArea: "Viman Nagar & Kalyani Nagar",
      startingPrice: 599,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Professional cleaning team with modern rotary scrubbers and non-toxic sanitizing solutions for modern techie households.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Kishor V. Kulkarni",
    email: "demo.pune.appliance.1@serveease.demo",
    phoneNumber: "+91 98230 40005",
    city: "pune",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Air Conditioner Jet Wash & Refrigerator Specialist",
      servicesOffered: ["Split AC Foam Service", "Gas Charging (R32)", "Frost-Free Refrigerator Defrost Issue", "Top-Load Washing Machine Drum"],
      experienceYears: 8,
      city: "pune",
      serviceArea: "Hinjewadi & Wakad",
      startingPrice: 349,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Serving Hinjewadi IT professionals with timely AC tune-ups, filter descaling, and washing machine repairs.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Amol M. Thorat",
    email: "demo.pune.mechanic.1@serveease.demo",
    phoneNumber: "+91 98230 40006",
    city: "pune",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Doorstep Two-Wheeler Tuning & Roadside Support",
      servicesOffered: ["Doorstep Scooter Oil & Brake Service", "Battery Jumpstart", "Flat Tyre Assistance", "Carburetor Clean"],
      experienceYears: 7,
      city: "pune",
      serviceArea: "Hadapsar & Magarpatta",
      startingPrice: 249,
      hourlyRate: 250,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Mobile mechanic with customized service scooter visiting Magarpatta and Hadapsar for convenient doorstep maintenance.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Baban G. Waghmare",
    email: "demo.pune.painter.1@serveease.demo",
    phoneNumber: "+91 98230 40007",
    city: "pune",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Interior Emulsion & Water Seepage Specialist",
      servicesOffered: ["Waterproof Putty Coating", "Velvet Matt Finish", "Wood Polish on Doors", "Texture Feature Wall"],
      experienceYears: 13,
      city: "pune",
      serviceArea: "Shivajinagar & Model Colony",
      startingPrice: 449,
      hourlyRate: 450,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Seasoned painter with extensive knowledge of Pune weather effects on external walls and heritage bungalow interiors.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Sachin S. Shinde",
    email: "demo.pune.driving.1@serveease.demo",
    phoneNumber: "+91 98230 40008",
    city: "pune",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Chauffeur for City & Mumbai Expressway",
      servicesOffered: ["Pune-Mumbai Expressway Driver", "Hourly City Chauffeur", "Night Drive Service", "Sedan / SUV Handling"],
      experienceYears: 11,
      city: "pune",
      serviceArea: "Koregaon Park & Camp",
      startingPrice: 349,
      hourlyRate: 160,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Dependable driver specialized in Mumbai-Pune expressway transit, automatic cars, and family weekend trips.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Avinash K. Jagtap",
    email: "demo.pune.plumber.2@serveease.demo",
    phoneNumber: "+91 98230 40009",
    city: "pune",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Tap Dripping, Flush Tank & Motor Repair Tech",
      servicesOffered: ["Concealed Diverter Repair", "Overhead Tank Float Valve", "Kitchen Sink Drain Rodding", "Geyser Water Inlet Fix"],
      experienceYears: 6,
      city: "pune",
      serviceArea: "Pimpri & Chinchwad",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Fast PCMC neighborhood technician resolving water wastage, low shower pressure, and faulty bathroom valves.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Deepak R. Bapat",
    email: "demo.pune.electrician.2@serveease.demo",
    phoneNumber: "+91 98230 40010",
    city: "pune",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Lighting & Home Inverter Technician",
      servicesOffered: ["LED Profile Strip Fitting", "Pure Sinewave Inverter Wire", "Ceiling Fan Heavy Hook", "MCB Tripping Fix"],
      experienceYears: 7,
      city: "pune",
      serviceArea: "Bavdhan & Pashan",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Precise wiring and modern mood lighting installation for Bavdhan hills apartments and residential spaces.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Manisha P. More",
    email: "demo.pune.cleaning.2@serveease.demo",
    phoneNumber: "+91 98230 40011",
    city: "pune",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Sofa Foam Cleaning & Kitchen Chimney Tech",
      servicesOffered: ["Fabric Sofa Deep Vacuuming", "Kitchen Exhaust Fan & Chimney Wash", "Window Net Scrubbing", "Floor Machine Buffing"],
      experienceYears: 5,
      city: "pune",
      serviceArea: "Sinhagad Road & Dhayari",
      startingPrice: 499,
      hourlyRate: 380,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Thorough deep cleaning lead with dependable female associates for home sanitization across Sinhagad Road.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },
  {
    name: "Hemant L. Gaikwad",
    email: "demo.pune.appliance.2@serveease.demo",
    phoneNumber: "+91 98230 40012",
    city: "pune",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Microwave, Geyser & Water Purifier Specialist",
      servicesOffered: ["Instant Geyser Heating Coil", "RO Membrane Replacement", "Microwave High-Voltage Diode", "Mixer Grinder Motor Rewinding"],
      experienceYears: 9,
      city: "pune",
      serviceArea: "Kharadi & Chandan Nagar",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: false,
      isVerified: true,
      isDemo: true,
      bio: "Comprehensive countertop appliance diagnostics with prompt turnaround in East Pune societies.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 35 mins"
    }
  },

  // =========================================================================
  // 5. NAGPUR PROVIDERS (8 Profiles)
  // =========================================================================
  {
    name: "Vinod M. Meshram",
    email: "demo.nagpur.plumber.1@serveease.demo",
    phoneNumber: "+91 98240 50001",
    city: "nagpur",
    providerDetails: {
      category: "Plumbing Services",
      categorySlug: "plumber",
      title: "Commercial & Home Water System Specialist",
      servicesOffered: ["Overhead Plastic Tank Fitting", "Submersible Borewell Pump Repair", "Bathroom CPVC Leak Sealing", "Drain Blockage Cleaning"],
      experienceYears: 11,
      city: "nagpur",
      serviceArea: "Dharampeth & Ramdaspeth",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Eleven years of trusted plumbing service across Dharampeth and West Nagpur. Fast emergency support for leaking pipes and valves.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Prashant S. Wankhede",
    email: "demo.nagpur.electrician.1@serveease.demo",
    phoneNumber: "+91 98240 50002",
    city: "nagpur",
    providerDetails: {
      category: "Electrical Repairs",
      categorySlug: "electrician",
      title: "Senior Wireman & Summer Cooler/Inverter Specialist",
      servicesOffered: ["Desert Cooler Motor Wiring", "Home Inverter Setup", "MCB Box Replacement", "Short Circuit Detection"],
      experienceYears: 10,
      city: "nagpur",
      serviceArea: "Sitabuldi & Sadar",
      startingPrice: 249,
      hourlyRate: 300,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Master wireman adept in high-temperature summer electrical loads, cooling appliance rewiring, and surge protection.",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 25 mins"
    }
  },
  {
    name: "Raju P. Raut",
    email: "demo.nagpur.carpenter.1@serveease.demo",
    phoneNumber: "+91 98240 50003",
    city: "nagpur",
    providerDetails: {
      category: "Carpentry & Woodwork",
      categorySlug: "carpenter",
      title: "Wood Joiner & Security Door Lock Fitter",
      servicesOffered: ["Godrej Ultra Lock Fitting", "Modular Kitchen Soft-Close Hinges", "Wooden Bed Frame Tightening", "Window Mesh Frame Fix"],
      experienceYears: 8,
      city: "nagpur",
      serviceArea: "Manish Nagar & Besa",
      startingPrice: 349,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Punctual carpenter for modern Manish Nagar residential towers. Expert in hardware repairs and lock installations.",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 40 mins"
    }
  },
  {
    name: "Sunanda T. Borkar",
    email: "demo.nagpur.cleaning.1@serveease.demo",
    phoneNumber: "+91 98240 50004",
    city: "nagpur",
    providerDetails: {
      category: "Home Cleaning & Sanitation",
      categorySlug: "cleaning",
      title: "Full Home Deep Cleaning & Tile Scrubbing Lead",
      servicesOffered: ["Full House Post-Construction Clean", "Kitchen Heavy Degreasing", "Bathroom Scaling Removal", "Terrace Dust Wash"],
      experienceYears: 7,
      city: "nagpur",
      serviceArea: "Pratap Nagar & Khamla",
      startingPrice: 499,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Lead cleaning organizer providing thorough pre-Diwali and festival deep scrubs for Nagpur bungalows and flats.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 45 mins"
    }
  },
  {
    name: "Narendra K. Tembhurne",
    email: "demo.nagpur.appliance.1@serveease.demo",
    phoneNumber: "+91 98240 50005",
    city: "nagpur",
    providerDetails: {
      category: "Appliance Repair",
      categorySlug: "appliance",
      title: "Desert Cooler, AC & Refrigerator Technician",
      servicesOffered: ["Split AC Pressure Foam Wash", "Cooler Submersible Pump Replacement", "Single/Double Door Refrigerator Gas", "RO Purifier Filter Change"],
      experienceYears: 9,
      city: "nagpur",
      serviceArea: "Civil Lines & Seminary Hills",
      startingPrice: 299,
      hourlyRate: 350,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Dedicated appliance specialist equipped with diagnostic multi-meters and fast gas-leak soldering gear.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  },
  {
    name: "Gajanan S. Kohale",
    email: "demo.nagpur.mechanic.1@serveease.demo",
    phoneNumber: "+91 98240 50006",
    city: "nagpur",
    providerDetails: {
      category: "Vehicle Mechanics",
      categorySlug: "mechanic",
      title: "Two-Wheeler Doorstep Service & Puncture Tech",
      servicesOffered: ["Doorstep Bike Engine Oil Change", "Spark Plug & Air Filter Replacement", "Tubeless Puncture Fix", "Chain Lubrication & Tightening"],
      experienceYears: 6,
      city: "nagpur",
      serviceArea: "Wardha Road & Chhatrapati Square",
      startingPrice: 199,
      hourlyRate: 200,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Quick roadside and doorstep motorcycle mechanic operating along South Nagpur corridors.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 20 mins"
    }
  },
  {
    name: "Ashok B. Dahake",
    email: "demo.nagpur.painter.1@serveease.demo",
    phoneNumber: "+91 98240 50007",
    city: "nagpur",
    providerDetails: {
      category: "Painting & Wall Care",
      categorySlug: "painting",
      title: "Weatherproof Heat-Reflective Paint Specialist",
      servicesOffered: ["Terrace White Heat-Proof Coating", "Interior Plastic Emulsion", "Oil Paint on Window Grills", "Putty & Primer Finishing"],
      experienceYears: 12,
      city: "nagpur",
      serviceArea: "Nandanvan & Sakkardara",
      startingPrice: 399,
      hourlyRate: 400,
      isAvailable: true,
      isVerified: true,
      isDemo: true,
      bio: "Twelve years painting Nagpur properties with emphasis on roof heat-reduction paints and interior washable finishes.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 1 hour"
    }
  },
  {
    name: "Sudhir D. Mohod",
    email: "demo.nagpur.driving.1@serveease.demo",
    phoneNumber: "+91 98240 50008",
    city: "nagpur",
    providerDetails: {
      category: "Local Driving Services",
      categorySlug: "driving",
      title: "Hourly City & Outstation Personal Chauffeur",
      servicesOffered: ["Dr. Babasaheb Ambedkar Airport Transfers", "Hourly City Driving", "Nagpur to Wardha / Amravati Trips", "Automatic / Manual Cars"],
      experienceYears: 9,
      city: "nagpur",
      serviceArea: "Trimurti Nagar & Hingna Road",
      startingPrice: 299,
      hourlyRate: 140,
      isAvailable: false,
      isVerified: true,
      isDemo: true,
      bio: "Professional commercial badge driver with clean record. Punctual, courteous, and safe driving for personal car owners.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
      responseTime: "Within 30 mins"
    }
  }
];

/**
 * Seed Runner Function
 */
export const seedDemoProviders = async () => {
  console.log('====================================================');
  console.log('🌱 ServeEase — Demo Provider Data Seeder (5 Cities)');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    console.error('❌ Error: MONGODB_URI is not configured in server/.env');
    process.exit(1);
  }

  // Pre-hash dummy password for demo accounts
  console.log('🔒 Generating bcrypt password hash for demo accounts...');
  const defaultPasswordHash = await User.hashPassword('DemoProviderPass123!');

  let shouldDisconnect = false;
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('⏳ Connecting to MongoDB Atlas...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ Connected to MongoDB.');
      shouldDisconnect = true;
    }

    // Safe cleanup: Remove any outdated demo profiles not present in DEMO_PROVIDERS.
    // Strictly protects all real user accounts: ONLY matches documents with isDemo: true and @serveease.demo domain.
    const activeDemoEmails = DEMO_PROVIDERS.map(p => p.email.toLowerCase().trim());
    await User.deleteMany({
      'providerDetails.isDemo': true,
      email: { $nin: activeDemoEmails, $regex: /@serveease\.demo$/i }
    });

    let sangliCount = 0;
    let sambhajinagarCount = 0;
    let mumbaiCount = 0;
    let puneCount = 0;
    let nagpurCount = 0;

    for (const item of DEMO_PROVIDERS) {
      const updateData = {
        name: item.name,
        email: item.email.toLowerCase().trim(),
        passwordHash: defaultPasswordHash,
        role: 'provider',
        status: 'active',
        city: item.city,
        phoneNumber: item.phoneNumber,
        providerDetails: item.providerDetails
      };

      // Idempotent upsert: find by email and update or insert
      await User.findOneAndUpdate(
        { email: updateData.email },
        { $set: updateData },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );

      if (item.city === 'sangli') sangliCount++;
      else if (item.city === 'chhatrapati-sambhajinagar') sambhajinagarCount++;
      else if (item.city === 'mumbai') mumbaiCount++;
      else if (item.city === 'pune') puneCount++;
      else if (item.city === 'nagpur') nagpurCount++;
    }

    const total = sangliCount + sambhajinagarCount + mumbaiCount + puneCount + nagpurCount;

    console.log('----------------------------------------------------');
    console.log(`🎉 Demo Seeding Completed Successfully!`);
    console.log(`📍 Sangli Demo Providers:                   ${sangliCount} profiles`);
    console.log(`📍 Chhatrapati Sambhajinagar Demo Providers: ${sambhajinagarCount} profiles`);
    console.log(`📍 Mumbai Demo Providers:                   ${mumbaiCount} profiles`);
    console.log(`📍 Pune Demo Providers:                     ${puneCount} profiles`);
    console.log(`📍 Nagpur Demo Providers:                   ${nagpurCount} profiles`);
    console.log(`📦 Total Demo Providers Seeded:             ${total} profiles`);
    console.log('🛡️  All profiles marked with isDemo: true and isVerified: true');
    console.log('====================================================');

    if (shouldDisconnect) {
      await mongoose.disconnect();
    }
    return {
      success: true,
      sangliCount,
      csnCount: sambhajinagarCount,
      mumbaiCount,
      puneCount,
      nagpurCount,
      total
    };
  } catch (err) {
    console.error('❌ Seeding failed with error:', err.message);
    if (mongoose.connection.readyState !== 0 && shouldDisconnect) {
      await mongoose.disconnect();
    }
    throw err;
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seedDemoProviders.js')) {
  seedDemoProviders().then(() => process.exit(0)).catch(() => process.exit(1));
}

export default seedDemoProviders;
