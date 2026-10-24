/**
 * Seed generator for the mock backend. Catalogue, providers, services, promo
 * codes and policies are ported from the Servio app; bookings, payments,
 * reviews, tickets and payouts are generated deterministically over the last
 * 12 months so every dashboard number is computed from real records.
 */
import { ADMIN_PERMISSIONS, ALL_PERMISSIONS, SUPER_ROLE_ID } from '@/lib/permissions';
import type {
  AdminNotification,
  AdminRole,
  AdminUser,
  AppVersionConfig,
  AuditLog,
  Broadcast,
  FeatureFlag,
  Permission,
  PlatformSettings,
  SystemService,
} from '@/types/admin';
import type {
  Banner,
  Booking,
  BookingEvent,
  BookingStatus,
  Category,
  City,
  CmsPage,
  Customer,
  DeliveryPartner,
  DeliveryTask,
  Faq,
  PaymentMethod,
  Payout,
  PromoCode,
  Provider,
  Review,
  Service,
  SupportTicket,
  WalletTransaction,
  WeeklyHours,
} from '@/types/models';
import { avatar, between, dateKey, daysFromNow, fakeIp, hoursAgo, phone, pick, rand, resetSeed, round1, sample, weighted } from './helpers';

export function createSeed() {
  resetSeed(7);

  /* ───────────────────────── Platform settings ───────────────────────── */

  const settings: PlatformSettings = {
    platformName: 'Servio',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    supportEmail: 'support@servio.app',
    supportPhone: '+91 98765 43210',
    taxPercent: 18,
    defaultCommission: 15,
    deliveryCommission: 10,
    maxVisitingCharge: 149,
    minPayout: 500,
    payoutCycle: 'weekly',
    autoApprovePayoutsBelow: 2000,
    cancellationWindowHours: 3,
    lateCancellationFee: 99,
    maxReschedules: 2,
    advanceBookingDays: 14,
    referrerBonus: 150,
    refereeBonus: 100,
    paymentGateways: { card: true, upi: true, razorpay: true, stripe: true, paystack: false, flutterwave: false },
    cashOnService: true,
    walletEnabled: true,
    channels: { push: true, sms: true, email: true, whatsapp: false },
    maintenanceMode: false,
    maintenanceMessage: 'We are upgrading Servio. Bookings will resume shortly.',
    providerAutoApproval: false,
  };

  const cities: City[] = [
    { id: 'city_1', name: 'Bengaluru', state: 'Karnataka', active: true, radiusKm: 35, launchedAt: daysFromNow(-900) },
    { id: 'city_2', name: 'Mumbai', state: 'Maharashtra', active: true, radiusKm: 40, launchedAt: daysFromNow(-610) },
    { id: 'city_3', name: 'New Delhi', state: 'Delhi', active: true, radiusKm: 45, launchedAt: daysFromNow(-520) },
    { id: 'city_4', name: 'Hyderabad', state: 'Telangana', active: true, radiusKm: 30, launchedAt: daysFromNow(-400) },
    { id: 'city_5', name: 'Pune', state: 'Maharashtra', active: true, radiusKm: 25, launchedAt: daysFromNow(-260) },
    { id: 'city_6', name: 'Raipur', state: 'Chhattisgarh', active: false, radiusKm: 15, launchedAt: daysFromNow(20) },
  ];
  const cityWeight: [string, number][] = [['Bengaluru', 40], ['Mumbai', 22], ['New Delhi', 16], ['Hyderabad', 12], ['Pune', 10]];
  const localities: Record<string, string[]> = {
    Bengaluru: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar', 'Bellandur'],
    Mumbai: ['Andheri West', 'Bandra', 'Powai', 'Malad', 'Chembur', 'Thane West'],
    'New Delhi': ['Saket', 'Dwarka', 'Lajpat Nagar', 'Vasant Kunj', 'Rohini', 'Karol Bagh'],
    Hyderabad: ['Gachibowli', 'Madhapur', 'Banjara Hills', 'Kondapur', 'Kukatpally'],
    Pune: ['Kothrud', 'Baner', 'Viman Nagar', 'Hinjewadi', 'Aundh'],
    Raipur: ['Shankar Nagar'],
  };
  const stateOf = (city: string) => cities.find((c) => c.name === city)?.state ?? '';

  /* ───────────────────────── Categories ───────────────────────── */

  type CatSeed = [id: string, name: string, icon: string, subs: string[], desc: string, commission: number];
  const catSeeds: CatSeed[] = [
    ['cat_clean', 'Home Cleaning', 'sparkles', ['Deep Cleaning', 'Bathroom Cleaning', 'Kitchen Cleaning', 'Sofa & Carpet'], 'Spotless homes by trained professionals', 15],
    ['cat_ac', 'AC & Appliances', 'snowflake', ['AC Service', 'Refrigerator', 'Washing Machine', 'Water Purifier'], 'Repair, service & installation', 18],
    ['cat_elec', 'Electrician', 'zap', ['Wiring', 'Fans & Lights', 'Switchboards'], 'Certified, insured electricians', 15],
    ['cat_plumb', 'Plumbing', 'droplet', ['Leakage Repair', 'Tap & Mixer', 'Bathroom Fittings'], 'Fast fixes for leaks and blockages', 15],
    ['cat_salon', 'Salon for Women', 'flower', ['Waxing', 'Facial & Cleanup', 'Manicure & Pedicure', 'Hair'], 'Salon experience at home', 20],
    ['cat_men', "Men's Grooming", 'scissors', ['Haircut', 'Beard & Shave', 'Massage'], 'Barbers who come to you', 20],
    ['cat_paint', 'Painting', 'paint-roller', ['Interior', 'Exterior', 'Waterproofing'], 'Fresh walls with zero mess', 12],
    ['cat_pest', 'Pest Control', 'bug', ['Cockroach', 'Termite', 'Bed Bugs'], 'Safe, odourless treatments', 15],
    ['cat_carp', 'Carpentry', 'hammer', ['Furniture Assembly', 'Door & Window', 'Repairs'], 'Skilled woodwork on demand', 15],
    ['cat_laundry', 'Laundry', 'shirt', ['Wash & Fold', 'Dry Cleaning', 'Ironing'], 'Free pickup & doorstep delivery', 12],
    ['cat_car', 'Car Care', 'car', ['Car Wash', 'Detailing', 'Servicing'], 'Doorstep wash & workshop pickup', 14],
    ['cat_spa', 'Spa & Wellness', 'leaf', ['Massage', 'Yoga Trainer', 'Physiotherapy'], 'Relax and recover at home', 20],
  ];
  const categories: Category[] = [];
  catSeeds.forEach(([id, name, icon, subs, description, commissionRate], ci) => {
    categories.push({ id, name, icon, parentId: null, description, active: true, featured: ci < 6, sortOrder: ci + 1, serviceCount: 0, commissionRate });
    subs.forEach((s, i) =>
      categories.push({ id: `${id}_${i + 1}`, name: s, icon, parentId: id, active: true, featured: false, sortOrder: i + 1, serviceCount: 0, commissionRate }),
    );
  });

  /* ───────────────────────── Providers ───────────────────────── */

  const defaultHours = (): WeeklyHours[] => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: day !== 0, start: '09:00', end: '19:00' }));

  type ProvSeed = [id: string, biz: string, owner: string, type: 'individual' | 'organization', cats: string[], status: Provider['status'], city: string, template: string, about: string];
  const provSeeds: ProvSeed[] = [
    ['prov_1', 'SparkleClean Co.', 'Meera Iyer', 'organization', ['cat_clean', 'cat_pest'], 'approved', 'Bengaluru', 'prov_1', 'Award-winning cleaning team with 40+ background-verified professionals. Eco-friendly, child-safe products.'],
    ['prov_2', 'CoolBreeze Appliance Care', 'Sanjay Rao', 'organization', ['cat_ac'], 'approved', 'Bengaluru', 'prov_2', 'Authorised multi-brand appliance specialists. Genuine spares and a 30-day warranty.'],
    ['prov_3', 'Rakesh Electricals', 'Rakesh Yadav', 'individual', ['cat_elec', 'cat_carp'], 'approved', 'Bengaluru', 'prov_3', 'Licensed electrician with 12 years of residential experience.'],
    ['prov_4', 'FlowFix Plumbing', 'Imran Shaikh', 'individual', ['cat_plumb'], 'approved', 'Bengaluru', 'prov_4', 'From dripping taps to full bathroom refits — fixed right the first time.'],
    ['prov_5', 'Glow Studio at Home', 'Ritika Bansal', 'organization', ['cat_salon', 'cat_spa'], 'approved', 'Bengaluru', 'prov_5', 'Certified beauticians and therapists using premium, single-use kits.'],
    ['prov_6', 'Sharp Cuts Grooming', 'Faizan Ali', 'individual', ['cat_men'], 'approved', 'Bengaluru', 'prov_6', 'Modern barbering at your doorstep.'],
    ['prov_7', 'ColorCraft Painters', 'Joseph Thomas', 'organization', ['cat_paint', 'cat_carp'], 'approved', 'Bengaluru', 'prov_7', 'Professional painting crews with free colour consultation.'],
    ['prov_8', 'FreshFold Laundry', 'Pooja Shetty', 'organization', ['cat_laundry'], 'approved', 'Bengaluru', 'prov_8', 'Hygienic wash & fold, dry cleaning and steam ironing with free pickup.'],
    ['prov_9', 'AutoShine Car Care', 'Manpreet Gill', 'organization', ['cat_car'], 'approved', 'Bengaluru', 'prov_9', 'Waterless doorstep washes, ceramic detailing and workshop servicing.'],
    ['prov_10', 'SafeHome Pest Solutions', 'Gaurav Jain', 'organization', ['cat_pest'], 'pending', 'Bengaluru', 'prov_1', 'Government-approved chemicals and certified technicians.'],
    ['prov_11', 'HandyHub Services', 'Suresh Pillai', 'individual', ['cat_carp', 'cat_elec'], 'pending', 'Bengaluru', 'prov_3', 'All-round handyman for quick home fixes.'],
    ['prov_12', 'Mumbai Mops', 'Farah Khan', 'organization', ['cat_clean'], 'approved', 'Mumbai', 'prov_1', 'Same-day home cleaning across the western suburbs.'],
    ['prov_13', 'ChillTech Services', 'Nitin Desai', 'organization', ['cat_ac'], 'approved', 'Mumbai', 'prov_2', 'AC and appliance experts with 24×7 emergency visits.'],
    ['prov_14', 'Bandra Beauty Bar', 'Sonia Fernandes', 'organization', ['cat_salon', 'cat_spa'], 'approved', 'Mumbai', 'prov_5', 'Luxury salon services at home.'],
    ['prov_15', 'QuickFix Mumbai', 'Ajay Patil', 'individual', ['cat_plumb', 'cat_elec'], 'suspended', 'Mumbai', 'prov_4', 'Plumbing and electrical repairs.'],
    ['prov_16', 'Capital Cleaners', 'Rahul Bhatia', 'organization', ['cat_clean', 'cat_pest'], 'approved', 'New Delhi', 'prov_1', 'Deep cleaning and sanitisation for Delhi NCR homes.'],
    ['prov_17', 'Delhi Cool Care', 'Harpreet Kaur', 'organization', ['cat_ac'], 'approved', 'New Delhi', 'prov_2', 'Beat the Delhi heat — AC service in 90 minutes.'],
    ['prov_18', 'Gents Grooming Co.', 'Arjun Chawla', 'individual', ['cat_men'], 'approved', 'New Delhi', 'prov_6', 'Premium grooming for men at home.'],
    ['prov_19', 'Pearl City Plumbers', 'Mohammed Saleem', 'individual', ['cat_plumb'], 'approved', 'Hyderabad', 'prov_4', 'Trusted plumbing across Hyderabad.'],
    ['prov_20', 'Deccan Detailers', 'Kiran Reddy', 'organization', ['cat_car'], 'approved', 'Hyderabad', 'prov_9', 'Car detailing and doorstep washes.'],
    ['prov_21', 'Hyd Home Spa', 'Lakshmi Prasad', 'organization', ['cat_salon', 'cat_spa'], 'pending', 'Hyderabad', 'prov_5', 'Spa and salon therapies at home.'],
    ['prov_22', 'Pune Painters Guild', 'Omkar Joshi', 'organization', ['cat_paint'], 'approved', 'Pune', 'prov_7', 'Interior and exterior painting with warranty.'],
    ['prov_23', 'WashWise Pune', 'Snehal Kulkarni', 'organization', ['cat_laundry'], 'approved', 'Pune', 'prov_8', 'Laundry and dry cleaning with free pickup.'],
    ['prov_24', 'SwitchOn Electric', 'Prakash Shinde', 'individual', ['cat_elec'], 'rejected', 'Pune', 'prov_3', 'Electrical repairs.'],
  ];

  const providers: Provider[] = provSeeds.map(([id, businessName, ownerName, type, categoryIds, status, city, , about], i) => {
    const approved = status === 'approved' || status === 'suspended';
    const slug = businessName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    return {
      id,
      businessName,
      ownerName,
      type,
      avatar: avatar(i * 3 + 9),
      about,
      city,
      address: `${between(10, 400)}, ${pick(localities[city])}, ${city}`,
      phone: phone(),
      email: `hello@${slug}.in`,
      categoryIds,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      yearsExperience: between(2, 15),
      verified: status === 'approved',
      featured: ['prov_1', 'prov_2', 'prov_5', 'prov_14'].includes(id),
      status,
      statusNote: status === 'suspended' ? 'Repeated late arrivals and 2 customer complaints.' : status === 'rejected' ? 'Address proof illegible; licence expired.' : undefined,
      commissionRate: catSeeds.find((c) => c[0] === categoryIds[0])?.[5] ?? 15,
      visitingCharge: pick([0, 49, 79, 99]),
      hours: defaultHours(),
      documents: [
        { id: 'doc_id', name: 'Government ID', status: approved ? 'verified' : status === 'rejected' ? 'verified' : 'pending', uploadedAt: daysFromNow(-between(5, 200)) },
        { id: 'doc_addr', name: 'Address proof', status: approved ? 'verified' : status === 'rejected' ? 'rejected' : 'pending', uploadedAt: daysFromNow(-between(5, 200)), note: status === 'rejected' ? 'Document unreadable' : undefined },
        {
          id: 'doc_biz',
          name: type === 'organization' ? 'GST / Business registration' : 'Skill certificate',
          status: approved ? 'verified' : status === 'rejected' ? 'rejected' : i % 2 ? 'missing' : 'pending',
          uploadedAt: approved ? daysFromNow(-between(5, 200)) : undefined,
        },
        { id: 'doc_police', name: 'Police verification', status: approved ? 'verified' : 'pending', uploadedAt: daysFromNow(-between(5, 200)) },
      ],
      bank: { accountName: businessName, accountNumber: `XXXXXX${between(1000, 9999)}`, ifsc: pick(['HDFC0001234', 'ICIC0004321', 'SBIN0011223', 'UTIB0002345']), bankName: pick(['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank']) },
      walletBalance: 0,
      joinedAt: daysFromNow(status === 'pending' ? -between(1, 6) : -between(90, 880)),
    };
  });
  const provById = (id: string) => providers.find((p) => p.id === id)!;

  /* ───────────────────────── Services ───────────────────────── */

  type SvcSeed = [provider: string, sub: string, title: string, price: number, discount: number, minutes: number, includes: string[], excludes: string[], tags?: string[]];
  const templates: SvcSeed[] = [
    ['prov_1', 'cat_clean_1', 'Full Home Deep Cleaning (2 BHK)', 4999, 3999, 300, ['All rooms, kitchen & 2 bathrooms', 'Machine scrubbing of floors', 'Balcony & windows'], ['Wall washing'], ['bestseller']],
    ['prov_1', 'cat_clean_2', 'Intense Bathroom Cleaning', 599, 499, 60, ['Tiles & grout scrubbing', 'Hard-water stain removal'], ['Ceiling cleaning'], ['popular']],
    ['prov_1', 'cat_clean_3', 'Kitchen Deep Clean', 1599, 1299, 150, ['Chimney exterior & hob', 'Cabinet in & out'], ['Utensil washing']],
    ['prov_1', 'cat_clean_4', 'Sofa Shampooing (5 seats)', 1199, 899, 90, ['Vacuum & shampoo', 'Stain treatment'], ['Leather sofas']],
    ['prov_1', 'cat_pest_1', 'Cockroach & Ant Control', 1099, 899, 60, ['Gel treatment in kitchen', '3-month warranty'], ['Termite treatment']],
    ['prov_2', 'cat_ac_1', 'AC Power Jet Service', 799, 599, 60, ['Jet pump cleaning', 'Filter & coil wash', 'Gas pressure check'], ['Gas refill'], ['bestseller']],
    ['prov_2', 'cat_ac_1', 'AC Installation (Split)', 1499, 1299, 120, ['Indoor & outdoor unit mounting', 'Test run'], ['Stand & extra piping']],
    ['prov_2', 'cat_ac_1', 'AC Gas Refill & Leak Fix', 2499, 2199, 90, ['Leak detection', 'Full gas top-up'], ['Compressor replacement']],
    ['prov_2', 'cat_ac_2', 'Refrigerator Repair', 349, 0, 60, ['Diagnosis visit', 'Minor repairs'], ['Spare parts cost']],
    ['prov_2', 'cat_ac_3', 'Washing Machine Repair', 349, 299, 60, ['Diagnosis', 'Drum & motor check'], ['Spare parts cost']],
    ['prov_2', 'cat_ac_4', 'RO Water Purifier Service', 699, 549, 45, ['Filter cleaning', 'TDS check'], ['Membrane replacement']],
    ['prov_3', 'cat_elec_2', 'Ceiling Fan Installation', 249, 199, 45, ['Fan mounting', 'Wiring & testing'], ['Fan & down-rod']],
    ['prov_3', 'cat_elec_3', 'Switchboard Repair', 199, 0, 30, ['Switch/socket replacement'], ['New switchboard cost']],
    ['prov_3', 'cat_elec_1', 'Full Home Wiring Inspection', 999, 799, 120, ['MCB & earthing test', 'Written report'], ['Rewiring']],
    ['prov_3', 'cat_carp_1', 'Furniture Assembly', 499, 449, 60, ['Bed, wardrobe or table assembly'], ['Wall drilling']],
    ['prov_4', 'cat_plumb_1', 'Leakage Detection & Repair', 399, 349, 60, ['Pipe & joint inspection', 'Sealant fix'], ['Pipe material']],
    ['prov_4', 'cat_plumb_2', 'Tap / Mixer Installation', 249, 199, 30, ['Old tap removal', 'New tap fitting'], ['Tap cost']],
    ['prov_4', 'cat_plumb_3', 'Toilet Repair & Unclogging', 449, 399, 60, ['Flush tank repair', 'Blockage removal'], ['New commode']],
    ['prov_4', 'cat_plumb_3', 'Water Tank Cleaning', 899, 749, 90, ['Draining & sludge removal'], ['Tank above 2000 L']],
    ['prov_5', 'cat_salon_1', 'Full Arms + Legs Waxing (Rica)', 899, 749, 60, ['Rica liposoluble wax', 'Underarms included'], ['Bikini wax']],
    ['prov_5', 'cat_salon_2', 'O3+ Brightening Facial', 1899, 1599, 75, ['Cleansing & exfoliation', 'Single-use kit'], ['Threading']],
    ['prov_5', 'cat_salon_3', 'Spa Manicure & Pedicure', 1199, 999, 90, ['Soak, scrub & massage', 'Nail polish'], ['Gel extensions'], ['popular']],
    ['prov_5', 'cat_salon_4', 'Hair Spa & Blow-dry', 1299, 0, 60, ['Deep conditioning', 'Blow-dry styling'], ['Hair colour']],
    ['prov_5', 'cat_spa_1', 'Swedish Full-Body Massage (60 min)', 1999, 1699, 60, ['Aromatherapy oils', 'Trained therapist'], ['Steam']],
    ['prov_5', 'cat_spa_2', 'Personal Yoga Session', 799, 0, 60, ['Certified trainer', 'Customised flow'], ['Yoga mat']],
    ['prov_6', 'cat_men_1', 'Haircut + Styling', 349, 299, 30, ['Consultation', 'Cut & wash'], ['Hair colour'], ['bestseller']],
    ['prov_6', 'cat_men_2', 'Beard Trim & Shape', 199, 149, 20, ['Beard sculpting', 'Hot towel'], []],
    ['prov_6', 'cat_men_3', 'Head & Shoulder Massage', 399, 349, 30, ['Warm oil massage'], []],
    ['prov_7', 'cat_paint_1', '1 Room Interior Painting', 6999, 5999, 480, ['Putty touch-up', '2 coats premium emulsion'], ['Texture work'], ['popular']],
    ['prov_7', 'cat_paint_3', 'Terrace Waterproofing (100 sq ft)', 3499, 2999, 240, ['Crack filling', '2-year warranty'], ['Civil repairs']],
    ['prov_7', 'cat_carp_2', 'Door Lock & Hinge Repair', 299, 0, 45, ['Lock alignment', 'Hinge replacement'], ['Lock cost']],
    ['prov_8', 'cat_laundry_1', 'Wash & Fold (per kg)', 99, 79, 2880, ['Free pickup & drop', 'Neatly folded'], ['Stain removal'], ['pickup']],
    ['prov_8', 'cat_laundry_2', 'Dry Cleaning (per piece)', 199, 169, 4320, ['Free pickup & drop', 'Hanger packing'], ['Leather & suede'], ['pickup']],
    ['prov_8', 'cat_laundry_3', 'Steam Ironing (per piece)', 15, 12, 1440, ['Free pickup & drop'], [], ['pickup']],
    ['prov_9', 'cat_car_1', 'Doorstep Foam Car Wash', 499, 399, 45, ['Exterior foam wash', 'Interior vacuum'], ['Engine bay'], ['bestseller']],
    ['prov_9', 'cat_car_2', 'Ceramic Coating & Detailing', 14999, 11999, 480, ['Paint correction', '9H ceramic coat'], ['Dent repair'], ['pickup']],
    ['prov_9', 'cat_car_3', 'Periodic Car Service (Pickup)', 3999, 3499, 360, ['Free pickup & drop', '40-point inspection'], ['Spare parts'], ['pickup']],
  ];

  const services: Service[] = [];
  for (const [provId, , , , cats, , , template] of provSeeds) {
    const p = provById(provId);
    const own = templates.filter((t) => t[0] === template && cats.includes(t[1].split('_').slice(0, 2).join('_')));
    for (const [, sub, title, price, discount, durationMin, includes, excludes, tags = []] of own) {
      const factor = provId === template ? 1 : pick([0.9, 1, 1.05, 1.1]);
      const pr = Math.round((price * factor) / 10) * 10 || price;
      const dc = discount ? Math.round((discount * factor) / 10) * 10 || discount : 0;
      services.push({
        id: `svc_${services.length + 1}`,
        providerId: provId,
        providerName: p.businessName,
        categoryId: sub.split('_').slice(0, 2).join('_'),
        subcategoryId: sub,
        title,
        description: `${title} by trained, background-verified professionals. Transparent pricing, on-time arrival and a 7-day re-work guarantee.`,
        price: pr,
        discountPrice: dc || undefined,
        durationMin,
        rating: 0,
        reviewCount: 0,
        bookings: 0,
        includes,
        excludes,
        tags: tags.filter((t) => t !== 'pickup'),
        active: p.status !== 'rejected' && rand() > 0.06,
        requiresPickup: tags.includes('pickup'),
        createdAt: daysFromNow(-between(10, 300)),
      });
    }
  }
  for (const cat of categories) cat.serviceCount = services.filter((s) => s.categoryId === cat.id || s.subcategoryId === cat.id).length;

  /* ───────────────────────── Customers ───────────────────────── */

  const first = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Ishaan', 'Diya', 'Kabir', 'Tara', 'Aditya', 'Nisha', 'Rahul', 'Meghna', 'Sahil', 'Ira', 'Varun', 'Pooja', 'Neel', 'Riya', 'Karthik', 'Zoya', 'Dev', 'Anika', 'Yash', 'Simran', 'Harsh', 'Aisha', 'Manav', 'Ritu', 'Om', 'Lavanya', 'Kunal', 'Sara'];
  const last = ['Sharma', 'Nair', 'Mehta', 'Gupta', 'Singh', 'Reddy', 'Das', 'Joshi', 'Verma', 'Patel', 'Malhotra', 'Menon', 'Rao', 'Kulkarni', 'Arora', 'Khan', 'Bose', 'Pai', 'Iyer', 'Chopra', 'Bhat', 'Saxena'];
  const customers: Customer[] = [];
  for (let i = 0; i < 160; i++) {
    const name = i === 0 ? 'Aarav Sharma' : `${pick(first)} ${pick(last)}`;
    const city = i === 0 ? 'Bengaluru' : weighted(cityWeight);
    customers.push({
      id: `cus_${i + 1}`,
      name,
      email: i === 0 ? 'customer@servio.app' : `${name.toLowerCase().replace(' ', '.')}${i}@mail.com`,
      phone: phone(),
      avatar: rand() > 0.35 ? avatar(i + 11) : undefined,
      status: i % 37 === 13 ? 'blocked' : 'active',
      city,
      referralCode: `${name.split(' ')[0].toUpperCase()}${between(10, 99)}`,
      walletBalance: 0,
      bookingsCount: 0,
      totalSpent: 0,
      lastActiveAt: hoursAgo(between(1, 24 * 40)),
      createdAt: daysFromNow(-between(5, 420)),
    });
  }
  const custByCity = (city: string) => customers.filter((c) => c.city === city);

  /* ───────────────────────── Delivery partners ───────────────────────── */

  const partnerSeeds: [string, string, DeliveryPartner['vehicleType'], DeliveryPartner['status']][] = [
    ['Ravi Kumar', 'Bengaluru', 'scooter', 'approved'], ['Mohammed Arif', 'Bengaluru', 'bike', 'approved'], ['Deepak Gowda', 'Bengaluru', 'van', 'pending'],
    ['Sunil Pawar', 'Mumbai', 'bike', 'approved'], ['Ganesh Kadam', 'Mumbai', 'scooter', 'approved'], ['Amit Tiwari', 'New Delhi', 'bike', 'approved'],
    ['Rajesh Yadav', 'New Delhi', 'car', 'suspended'], ['Venkat Rao', 'Hyderabad', 'bike', 'approved'], ['Sai Teja', 'Hyderabad', 'scooter', 'pending'],
    ['Nikhil More', 'Pune', 'bike', 'approved'], ['Ashok Jadhav', 'Pune', 'van', 'approved'], ['Imtiaz Sheikh', 'Mumbai', 'bike', 'rejected'],
  ];
  const partners: DeliveryPartner[] = partnerSeeds.map(([name, city, vehicleType, status], i) => ({
    id: `dp_${i + 1}`,
    name,
    email: i === 0 ? 'delivery@servio.app' : `${name.split(' ')[0].toLowerCase()}@mail.com`,
    phone: phone(),
    avatar: avatar(50 + i),
    vehicleType,
    vehicleNumber: `${pick(['KA', 'MH', 'DL', 'TS'])} ${`${between(1, 50)}`.padStart(2, '0')} ${pick(['HX', 'EF', 'MN', 'AB', 'QR'])} ${between(1000, 9999)}`,
    licenseNumber: `DL${between(1000000000, 9999999999)}`,
    rating: status === 'approved' || status === 'suspended' ? round1(4.2 + rand() * 0.7) : 0,
    completedTasks: 0,
    online: status === 'approved' && rand() > 0.4,
    status,
    city,
    earnings: 0,
    joinedAt: daysFromNow(status === 'pending' ? -between(1, 5) : -between(60, 500)),
  }));

  /* ───────────────────────── Bookings ───────────────────────── */

  const flow: BookingStatus[] = ['pending', 'confirmed', 'on_the_way', 'in_progress', 'completed'];
  const methods: [PaymentMethod, number][] = [['upi', 40], ['card', 18], ['razorpay', 12], ['wallet', 8], ['cash', 20], ['stripe', 2]];
  const bookings: Booking[] = [];
  const approvedIn = (city: string) => providers.filter((p) => (p.status === 'approved' || p.status === 'suspended') && p.city === city);

  const makeBooking = (dayOffset: number, forcedStatus?: BookingStatus) => {
    const i = bookings.length;
    let city = weighted(cityWeight);
    if (!approvedIn(city).length) city = 'Bengaluru';
    const p = pick(approvedIn(city));
    const own = services.filter((s) => s.providerId === p.id);
    const chosen = sample(own, rand() > 0.78 ? 2 : 1);
    const pool = custByCity(city);
    const cust = pool.length ? pick(pool) : customers[0];
    const items = chosen.map((s) => {
      const qty = s.price < 100 ? between(3, 12) : rand() > 0.85 ? 2 : 1;
      return { serviceId: s.id, categoryId: s.categoryId, title: s.title, unitPrice: s.discountPrice ?? s.price, quantity: qty, durationMin: s.durationMin };
    });
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const promo = rand() > 0.84 ? pick(['WELCOME500', 'CLEAN20', 'COOL15', 'MONSOON10']) : undefined;
    const discount = promo === 'WELCOME500' && subtotal >= 1999 ? 500 : promo ? Math.min(Math.round(subtotal * 0.1), 200) : 0;
    const visitingCharge = p.visitingCharge;
    const tax = Math.round(((subtotal - discount + visitingCharge) * settings.taxPercent) / 100);
    const total = subtotal - discount + visitingCharge + tax;
    const commission = Math.round(((subtotal - discount) * p.commissionRate) / 100);

    let status: BookingStatus;
    if (forcedStatus) status = forcedStatus;
    else if (dayOffset < -1) status = weighted([['completed', 84], ['cancelled', 12], ['rejected', 4]] as const);
    else if (dayOffset < 0) status = weighted([['completed', 80], ['cancelled', 15], ['in_progress', 5]] as const);
    else if (dayOffset === 0) status = weighted([['pending', 14], ['confirmed', 26], ['on_the_way', 16], ['in_progress', 18], ['completed', 18], ['cancelled', 8]] as const);
    else status = weighted([['pending', 40], ['confirmed', 52], ['cancelled', 8]] as const);

    const slotH = between(8, 19);
    const slot = `${`${slotH}`.padStart(2, '0')}:${pick(['00', '30'])}`;
    const createdAt = daysFromNow(Math.min(dayOffset, 0) - between(0, 4), between(7, 22), between(0, 59));
    const method = weighted(methods);
    const timeline: BookingEvent[] = [{ status: 'pending', at: createdAt, note: 'Booking placed', by: cust.name }];
    if (status === 'cancelled' || status === 'rejected') {
      timeline.push({ status, at: daysFromNow(Math.min(dayOffset, 0), Math.max(slotH - 3, 7)), note: status === 'rejected' ? 'Declined by provider' : 'Cancelled by customer', by: status === 'rejected' ? p.businessName : cust.name });
    } else {
      const reach = flow.indexOf(status);
      flow.slice(1, reach + 1).forEach((st, k) => timeline.push({ status: st, at: daysFromNow(dayOffset, Math.max(slotH - (reach - k - 1), 6), 5 + k * 9), by: p.businessName }));
    }
    const paidOnline = method !== 'cash';
    const payStatus = status === 'cancelled' || status === 'rejected' ? (paidOnline ? 'refunded' : 'pending') : status === 'completed' || paidOnline ? 'paid' : 'pending';
    if (payStatus === 'refunded') timeline.push({ status: 'refund', at: timeline[timeline.length - 1].at, note: `Refund of ₹${total} to original method` });
    const loc = pick(localities[city]);
    const b: Booking = {
      id: `bk_${i + 1}`,
      code: `SRV${240100 + i * 7}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      providerId: p.id,
      providerName: p.businessName,
      city,
      categoryId: items[0].categoryId,
      items,
      address: { label: pick(['Home', 'Home', 'Work', 'Other'] as const), line1: `${between(1, 900)}, ${pick(['12th Main', '5th Cross', 'MG Road', 'Link Road', 'Ring Road', 'Station Road'])}`, line2: loc, city, state: stateOf(city), pincode: `${between(110, 600)}0${between(10, 99)}` },
      scheduledDate: dateKey(dayOffset),
      slot,
      status,
      payment: { method, status: payStatus, transactionId: paidOnline ? `TXN${between(10000000, 99999999)}` : undefined, refundedAmount: payStatus === 'refunded' ? total : undefined },
      pricing: { subtotal, discount, visitingCharge, tax, total, commission },
      promoCode: discount ? promo : undefined,
      notes: rand() > 0.88 ? pick(['Please call before arriving.', 'Gate code 4521.', 'Pet at home — friendly dog.', 'Bring a ladder please.']) : undefined,
      timeline,
      cancelReason: status === 'cancelled' ? pick(['Change of plans', 'Booked by mistake', 'Found a better price', 'Service no longer needed']) : status === 'rejected' ? 'Fully booked for this slot' : undefined,
      rescheduleCount: rand() > 0.9 ? 1 : 0,
      createdAt,
    };
    bookings.push(b);
    return b;
  };

  for (let n = 0; n < 720; n++) {
    const u = rand();
    makeBooking(-Math.max(1, Math.floor(365 * (1 - Math.sqrt(u)))));
  }
  for (let n = 0; n < 34; n++) makeBooking(0);
  for (let n = 0; n < 46; n++) makeBooking(between(1, 10));
  // A few guaranteed live jobs for the live-ops widgets
  (['in_progress', 'on_the_way', 'pending', 'pending', 'confirmed'] as BookingStatus[]).forEach((s) => makeBooking(0, s));
  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* Derived customer / provider / service stats */
  for (const b of bookings) {
    const c = customers.find((x) => x.id === b.customerId)!;
    c.bookingsCount += 1;
    if (b.status === 'completed') c.totalSpent += b.pricing.total;
    if (b.createdAt > c.lastActiveAt) c.lastActiveAt = b.createdAt;
    if (c.createdAt > b.createdAt) c.createdAt = new Date(new Date(b.createdAt).getTime() - between(1, 10) * 86_400_000).toISOString();
    for (const it of b.items) {
      const s = services.find((x) => x.id === it.serviceId);
      if (s) s.bookings += 1;
    }
    if (b.status === 'completed') provById(b.providerId).jobsCompleted += 1;
  }

  /* ───────────────────────── Delivery tasks ───────────────────────── */

  const deliveryTasks: DeliveryTask[] = [];
  bookings
    .filter((b) => b.items.some((it) => services.find((s) => s.id === it.serviceId)?.requiresPickup))
    .filter((b) => b.scheduledDate >= dateKey(-60))
    .forEach((b) => {
      const p = provById(b.providerId);
      const cityPartners = partners.filter((x) => x.city === b.city && x.status === 'approved');
      const done = b.status === 'completed';
      const status: DeliveryTask['status'] = done ? 'delivered' : b.status === 'cancelled' || b.status === 'rejected' ? 'cancelled' : weighted([['available', 45], ['accepted', 30], ['picked_up', 25]] as const);
      const partner = status === 'available' || !cityPartners.length ? undefined : pick(cityPartners);
      const t: DeliveryTask = {
        id: `dt_${deliveryTasks.length + 1}`,
        bookingId: b.id,
        bookingCode: b.code,
        type: pick(['pickup', 'pickup', 'drop', 'parts'] as const),
        status: partner || status === 'available' || status === 'cancelled' ? status : 'available',
        partnerId: partner?.id,
        partnerName: partner?.name,
        city: b.city,
        pickup: { name: b.customerName, phone: b.customerPhone, address: `${b.address.line1}, ${b.address.line2}, ${b.city}` },
        drop: { name: p.businessName, phone: p.phone, address: p.address },
        itemsSummary: b.items.map((it) => `${it.quantity} × ${it.title}`).join(', '),
        distanceKm: round1(1.5 + rand() * 9),
        fee: between(45, 140),
        codAmount: b.payment.method === 'cash' && b.payment.status === 'pending' ? b.pricing.total : 0,
        scheduledFor: `${b.scheduledDate}T${b.slot}:00`,
        createdAt: b.createdAt,
        updatedAt: hoursAgo(between(1, 40)),
      };
      if (t.partnerId && t.status === 'delivered') {
        const dp = partners.find((x) => x.id === t.partnerId)!;
        dp.completedTasks += 1;
        dp.earnings += t.fee;
      }
      b.deliveryTaskId = t.id;
      deliveryTasks.push(t);
    });
  partners.forEach((dp) => {
    if (dp.status === 'approved' || dp.status === 'suspended') {
      dp.completedTasks += between(80, 600);
      dp.earnings += dp.completedTasks * between(55, 75);
    }
  });

  /* ───────────────────────── Reviews ───────────────────────── */

  const goodComments = [
    'Absolutely fantastic service. Arrived on time and left the place spotless!',
    'Very professional and polite. Will definitely book again.',
    'Great value for money. The technician explained everything clearly.',
    'Superb attention to detail. Highly recommended!',
    'Quick, clean and hassle-free. Exactly what I needed.',
    'Friendly staff and premium products. Loved it.',
  ];
  const midComments = ['Good work overall, slightly delayed but kept me informed.', 'Decent job. A few corners were missed but fixed when asked.', 'Okay experience, pricing could be clearer.'];
  const badComments = ['Arrived 2 hours late and did not call.', 'Technician was rude and left a mess behind.', 'Charged extra for parts without asking. Not happy.', 'Call this number for cheaper service: 98XXXXXX12 !!!'];
  const reviews: Review[] = [];
  for (const b of bookings.filter((x) => x.status === 'completed')) {
    if (rand() > 0.45) continue;
    const rating = weighted([[5, 58], [4, 24], [3, 9], [2, 5], [1, 4]] as const);
    const comment = rating >= 4 ? pick(goodComments) : rating === 3 ? pick(midComments) : pick(badComments);
    const spam = comment.includes('Call this number');
    const status: Review['status'] = spam ? 'flagged' : rating <= 2 && rand() > 0.6 ? 'flagged' : rand() > 0.97 ? 'hidden' : 'published';
    const it = b.items[0];
    reviews.push({
      id: `rv_${reviews.length + 1}`,
      bookingId: b.id,
      serviceId: it.serviceId,
      serviceTitle: it.title,
      providerId: b.providerId,
      providerName: b.providerName,
      customerId: b.customerId,
      customerName: b.customerName,
      rating,
      comment,
      status,
      flagReason: status === 'flagged' ? (spam ? 'Contains phone number / solicitation' : 'Reported by provider as unfair') : undefined,
      reply: rand() > 0.6 ? { text: 'Thank you for the feedback! We look forward to serving you again.', at: b.createdAt } : undefined,
      createdAt: new Date(new Date(`${b.scheduledDate}T12:00:00`).getTime() + between(2, 40) * 3_600_000).toISOString(),
    });
    b.rating = rating;
  }
  for (const p of providers) {
    const own = reviews.filter((r) => r.providerId === p.id);
    p.reviewCount = own.length;
    p.rating = own.length ? round1(own.reduce((s, r) => s + r.rating, 0) / own.length) : 0;
  }
  for (const s of services) {
    const own = reviews.filter((r) => r.serviceId === s.id);
    s.reviewCount = own.length;
    s.rating = own.length ? round1(own.reduce((a, r) => a + r.rating, 0) / own.length) : 0;
  }

  /* ───────────────────────── Promotions & banners ───────────────────────── */

  const promoCodes: PromoCode[] = [
    { id: 'pr_1', code: 'WELCOME500', title: 'Flat ₹500 off your first booking', description: 'Valid on orders above ₹1,999 for new users.', discountType: 'flat', value: 500, minOrder: 1999, providerId: null, startsAt: daysFromNow(-90), expiresAt: daysFromNow(30), active: true, usageCount: 1240, usageLimit: 5000, perUserLimit: 1 },
    { id: 'pr_2', code: 'CLEAN20', title: '20% off cleaning services', description: 'Up to ₹400 off on any SparkleClean service.', discountType: 'percent', value: 20, minOrder: 499, maxDiscount: 400, providerId: 'prov_1', categoryId: 'cat_clean', startsAt: daysFromNow(-20), expiresAt: daysFromNow(14), active: true, usageCount: 318, usageLimit: 1000, perUserLimit: 2 },
    { id: 'pr_3', code: 'COOL15', title: '15% off AC servicing', description: 'Beat the heat — up to ₹300 off.', discountType: 'percent', value: 15, minOrder: 599, maxDiscount: 300, providerId: 'prov_2', categoryId: 'cat_ac', startsAt: daysFromNow(-10), expiresAt: daysFromNow(10), active: true, usageCount: 96, usageLimit: 500, perUserLimit: 1 },
    { id: 'pr_4', code: 'GLOW250', title: '₹250 off salon at home', description: 'On salon & spa orders above ₹1,499.', discountType: 'flat', value: 250, minOrder: 1499, providerId: 'prov_5', categoryId: 'cat_salon', startsAt: daysFromNow(-5), expiresAt: daysFromNow(21), active: true, usageCount: 77, usageLimit: 300, perUserLimit: 1 },
    { id: 'pr_5', code: 'MONSOON10', title: '10% off sitewide', description: 'Up to ₹200 off. Expired campaign.', discountType: 'percent', value: 10, minOrder: 0, maxDiscount: 200, providerId: null, startsAt: daysFromNow(-60), expiresAt: daysFromNow(-5), active: false, usageCount: 2010, usageLimit: 2010, perUserLimit: 3 },
    { id: 'pr_6', code: 'DIWALI300', title: 'Festive ₹300 off', description: 'Deep cleaning before Diwali — above ₹2,499.', discountType: 'flat', value: 300, minOrder: 2499, providerId: null, categoryId: 'cat_clean', startsAt: daysFromNow(2), expiresAt: daysFromNow(25), active: true, usageCount: 0, usageLimit: 3000, perUserLimit: 1 },
  ];
  const banners: Banner[] = [
    { id: 'bn_1', title: 'Summer-ready AC service', subtitle: 'Up to 25% off jet servicing', cta: 'Book now', categoryId: 'cat_ac', placement: 'home_hero', active: true, sortOrder: 1, clicks: 4210, impressions: 98200 },
    { id: 'bn_2', title: 'Deep clean, deep savings', subtitle: 'Use CLEAN20 for 20% off', cta: 'Explore', categoryId: 'cat_clean', placement: 'home_hero', active: true, sortOrder: 2, clicks: 3880, impressions: 91050 },
    { id: 'bn_3', title: 'Salon luxury at home', subtitle: 'Certified beauticians · single-use kits', cta: 'Pamper yourself', categoryId: 'cat_salon', placement: 'home_hero', active: true, sortOrder: 3, clicks: 2950, impressions: 76400 },
    { id: 'bn_4', title: 'Festive deep cleaning', subtitle: 'DIWALI300 — flat ₹300 off', cta: 'Get ready', categoryId: 'cat_clean', placement: 'home_strip', active: false, sortOrder: 4, clicks: 0, impressions: 0 },
    { id: 'bn_5', title: 'Car care, delivered', subtitle: 'Free pickup for workshop service', cta: 'Book a wash', categoryId: 'cat_car', placement: 'category', active: true, sortOrder: 5, clicks: 820, impressions: 21300 },
  ];

  /* ───────────────────────── Admins & roles ───────────────────────── */

  const opsPerms = ADMIN_PERMISSIONS;
  const roles: AdminRole[] = [
    { id: SUPER_ROLE_ID, name: 'Super Admin', description: 'Full platform control including admins, roles, settings and system.', permissions: [...ALL_PERMISSIONS], system: true, color: 'highlight', createdAt: daysFromNow(-900) },
    { id: 'role_ops', name: 'Operations Admin', description: 'Runs day-to-day marketplace operations across all modules.', permissions: [...opsPerms], system: true, color: 'primary', createdAt: daysFromNow(-900) },
    {
      id: 'role_finance',
      name: 'Finance Manager',
      description: 'Payments, refunds, payouts and financial reports.',
      permissions: ['dashboard.view', 'bookings.view', 'customers.view', 'providers.view', 'partners.view', 'payments.view', 'payments.refund', 'payouts.view', 'payouts.manage', 'reports.view'],
      system: false,
      color: 'success',
      createdAt: daysFromNow(-600),
    },
    {
      id: 'role_support',
      name: 'Support Agent',
      description: 'Handles tickets, booking issues and review moderation.',
      permissions: ['dashboard.view', 'bookings.view', 'bookings.manage', 'customers.view', 'providers.view', 'partners.view', 'deliveries.view', 'support.view', 'support.manage', 'reviews.moderate'],
      system: false,
      color: 'info',
      createdAt: daysFromNow(-600),
    },
    {
      id: 'role_city',
      name: 'City Manager',
      description: 'Operations for assigned cities: supply, bookings and dispatch.',
      permissions: opsPerms.filter((p) => !['marketing.manage', 'content.manage', 'catalog.manage', 'payments.refund', 'payouts.manage'].includes(p)) as Permission[],
      system: false,
      color: 'accent',
      createdAt: daysFromNow(-300),
    },
  ];
  const admins: AdminUser[] = [
    { id: 'adm_1', name: 'Aditi Rao', email: 'superadmin@servio.app', phone: '+91 90000 11111', avatar: avatar(32), roleId: SUPER_ROLE_ID, status: 'active', cityScope: [], twoFactor: true, lastActiveAt: hoursAgo(0.2), createdAt: daysFromNow(-900) },
    { id: 'adm_2', name: 'Neha Kapoor', email: 'admin@servio.app', phone: '+91 90000 44556', avatar: avatar(44), roleId: 'role_ops', status: 'active', cityScope: [], twoFactor: false, lastActiveAt: hoursAgo(0.5), createdAt: daysFromNow(-700) },
    { id: 'adm_3', name: 'Karan Malhotra', email: 'finance@servio.app', phone: '+91 90000 22233', avatar: avatar(14), roleId: 'role_finance', status: 'active', cityScope: [], twoFactor: false, lastActiveAt: hoursAgo(3), createdAt: daysFromNow(-500) },
    { id: 'adm_4', name: 'Sana Qureshi', email: 'support@servio.app', phone: '+91 90000 33344', avatar: avatar(26), roleId: 'role_support', status: 'active', cityScope: [], twoFactor: false, lastActiveAt: hoursAgo(1), createdAt: daysFromNow(-420) },
    { id: 'adm_5', name: 'Vivek Menon', email: 'citymanager@servio.app', phone: '+91 90000 55667', avatar: avatar(57), roleId: 'role_city', status: 'active', cityScope: ['Mumbai', 'Pune'], twoFactor: false, lastActiveAt: hoursAgo(6), createdAt: daysFromNow(-250) },
    { id: 'adm_6', name: 'Rhea Dsouza', email: 'rhea@servio.app', phone: '+91 90000 66778', roleId: 'role_support', status: 'invited', cityScope: [], twoFactor: false, createdAt: daysFromNow(-2) },
    { id: 'adm_7', name: 'Manoj Pillai', email: 'manoj@servio.app', phone: '+91 90000 77889', avatar: avatar(61), roleId: 'role_city', status: 'suspended', cityScope: ['New Delhi'], twoFactor: false, lastActiveAt: hoursAgo(24 * 40), createdAt: daysFromNow(-380) },
  ];

  /* ───────────────────────── Payouts & wallet ───────────────────────── */

  const payouts: Payout[] = [];
  providers
    .filter((p) => p.status === 'approved')
    .forEach((p) => {
      for (let w = 1; w <= 6; w++) {
        payouts.push({
          id: `po_${payouts.length + 1}`,
          payeeId: p.id,
          payeeName: p.businessName,
          payeeRole: 'provider',
          amount: between(18, 140) * 100,
          status: 'paid',
          method: 'bank',
          accountRef: p.bank?.accountNumber ?? '',
          utr: `UTR${between(100000000, 999999999)}`,
          requestedAt: daysFromNow(-w * 7 - 1),
          processedAt: daysFromNow(-w * 7 + 1),
        });
      }
      p.walletBalance = between(12, 90) * 100;
    });
  sample(providers.filter((p) => p.status === 'approved'), 7).forEach((p, i) =>
    payouts.push({ id: `po_${payouts.length + 1}`, payeeId: p.id, payeeName: p.businessName, payeeRole: 'provider', amount: Math.min(p.walletBalance, between(15, 80) * 100), status: i === 0 ? 'approved' : 'requested', method: 'bank', accountRef: p.bank?.accountNumber ?? '', requestedAt: hoursAgo(between(2, 70)) }),
  );
  partners
    .filter((p) => p.status === 'approved')
    .forEach((p, i) => {
      for (let w = 1; w <= 4; w++)
        payouts.push({ id: `po_${payouts.length + 1}`, payeeId: p.id, payeeName: p.name, payeeRole: 'delivery', amount: between(28, 62) * 100, status: 'paid', method: 'upi', accountRef: `${p.name.split(' ')[0].toLowerCase()}@upi`, utr: `UTR${between(100000000, 999999999)}`, requestedAt: daysFromNow(-w * 7), processedAt: daysFromNow(-w * 7 + 1) });
      if (i % 2 === 0)
        payouts.push({ id: `po_${payouts.length + 1}`, payeeId: p.id, payeeName: p.name, payeeRole: 'delivery', amount: between(15, 48) * 100, status: 'requested', method: 'upi', accountRef: `${p.name.split(' ')[0].toLowerCase()}@upi`, requestedAt: hoursAgo(between(1, 48)) });
    });
  payouts.push({ id: `po_${payouts.length + 1}`, payeeId: 'prov_15', payeeName: 'QuickFix Mumbai', payeeRole: 'provider', amount: 6400, status: 'rejected', method: 'bank', accountRef: 'XXXXXX8812', requestedAt: daysFromNow(-9), processedAt: daysFromNow(-8), note: 'Account under review (suspended).' });
  payouts.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const walletTxns: WalletTransaction[] = [];
  customers.slice(0, 60).forEach((c, i) => {
    if (i % 3) return;
    const add = between(5, 30) * 100;
    walletTxns.push({ id: `wt_${walletTxns.length + 1}`, userId: c.id, type: 'credit', amount: add, title: 'Added via UPI', reference: `UPI${between(1000, 9999)}`, createdAt: daysFromNow(-between(10, 120)) });
    if (rand() > 0.5) walletTxns.push({ id: `wt_${walletTxns.length + 1}`, userId: c.id, type: 'credit', amount: settings.refereeBonus, title: 'Referral bonus', createdAt: daysFromNow(-between(5, 90)) });
    const spend = Math.round(add * (0.2 + rand() * 0.6));
    walletTxns.push({ id: `wt_${walletTxns.length + 1}`, userId: c.id, type: 'debit', amount: spend, title: 'Paid for booking', createdAt: daysFromNow(-between(1, 9)) });
  });
  for (const c of customers) c.walletBalance = walletTxns.filter((t) => t.userId === c.id).reduce((s, t) => s + (t.type === 'credit' ? t.amount : -t.amount), 0);

  /* ───────────────────────── Support ───────────────────────── */

  const ticketSubjects: [string, SupportTicket['category'], SupportTicket['priority']][] = [
    ['Refund not received for cancelled booking', 'payment', 'medium'],
    ['Payment deducted but booking not confirmed', 'payment', 'urgent'],
    ['Professional did not show up', 'booking', 'high'],
    ['Change phone number on account', 'account', 'low'],
    ['Overcharged for spare parts', 'booking', 'high'],
    ['Laundry items missing after delivery', 'delivery', 'high'],
    ['Unable to apply promo code', 'payment', 'low'],
    ['Update GST details on invoices', 'account', 'low'],
    ['Payout delayed by a week', 'payment', 'medium'],
    ['Customer was abusive during job', 'provider', 'high'],
    ['App crashes on checkout', 'other', 'medium'],
    ['Wrong address shown on task', 'delivery', 'medium'],
    ['Need to reschedule more than twice', 'booking', 'low'],
    ['Damage to furniture during painting', 'booking', 'urgent'],
  ];
  const supportAgents = admins.filter((a) => a.roleId === 'role_support' && a.status === 'active');
  const tickets: SupportTicket[] = [];
  for (let i = 0; i < 34; i++) {
    const [subject, category, priority] = ticketSubjects[i % ticketSubjects.length];
    const isProvider = category === 'provider' || subject.includes('Payout') || subject.includes('GST');
    const isDelivery = subject.includes('task');
    const b = pick(bookings.slice(0, 300));
    const userName = isProvider ? b.providerName : isDelivery ? pick(partners).name : b.customerName;
    const created = hoursAgo(i < 8 ? between(1, 30) : between(30, 24 * 60));
    const status: SupportTicket['status'] = i < 6 ? 'open' : i < 13 ? weighted([['open', 1], ['in_progress', 2]] as const) : weighted([['resolved', 5], ['closed', 3], ['in_progress', 1]] as const);
    const assignee = status === 'open' && i % 2 === 0 ? undefined : pick(supportAgents);
    const messages: SupportTicket['messages'] = [{ id: 'm1', from: 'user', authorName: userName, text: `${subject}. Booking ${b.code}. Please help at the earliest.`, at: created }];
    if (status !== 'open') messages.push({ id: 'm2', from: 'support', authorName: assignee?.name ?? 'Servio Support', text: `Hi ${userName.split(' ')[0]}, thanks for reaching out. We're looking into booking ${b.code} and will update you shortly.`, at: new Date(new Date(created).getTime() + 3_600_000).toISOString() });
    if (status === 'resolved' || status === 'closed') messages.push({ id: 'm3', from: 'support', authorName: assignee?.name ?? 'Servio Support', text: 'This has been resolved. Please reopen the ticket if you need anything else.', at: new Date(new Date(created).getTime() + 26 * 3_600_000).toISOString() });
    tickets.push({
      id: `tk_${i + 1}`,
      number: `TKT-${(4100 + i * 3).toString()}`,
      userId: isProvider ? b.providerId : b.customerId,
      userName,
      userRole: isProvider ? 'provider' : isDelivery ? 'delivery' : 'customer',
      subject,
      category,
      priority,
      status,
      bookingId: b.id,
      assigneeId: assignee?.id,
      assigneeName: assignee?.name,
      messages,
      createdAt: created,
      updatedAt: messages[messages.length - 1].at,
    });
  }
  tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const faqs: Faq[] = [
    { id: 'f1', audience: 'customer', question: 'How do I reschedule a booking?', answer: 'Open the booking from My Bookings and tap “Reschedule”. You can pick any available slot up to 3 hours before the scheduled time at no extra cost.', published: true, sortOrder: 1 },
    { id: 'f2', audience: 'customer', question: 'What is the cancellation policy?', answer: 'Cancellations are free up to 3 hours before the slot. Later cancellations may attract a visiting fee charged by the provider.', published: true, sortOrder: 2 },
    { id: 'f3', audience: 'customer', question: 'When will I receive my refund?', answer: 'Refunds to wallets are instant. Card and UPI refunds take 3–5 business days depending on your bank.', published: true, sortOrder: 3 },
    { id: 'f4', audience: 'customer', question: 'Are professionals background-verified?', answer: 'Yes. Every provider submits government ID and address proof, and organisations submit business registration before approval.', published: true, sortOrder: 4 },
    { id: 'f5', audience: 'customer', question: 'Why can I only add services from one provider?', answer: 'Each booking is fulfilled by a single provider so they can plan their team and time slot.', published: true, sortOrder: 5 },
    { id: 'f6', audience: 'provider', question: 'When are payouts processed?', answer: 'Request a withdrawal once your balance exceeds ₹500. Approved payouts are transferred within 2 business days.', published: true, sortOrder: 1 },
    { id: 'f7', audience: 'provider', question: 'How is commission calculated?', answer: 'The platform commission is a percentage of the service subtotal (excluding tax) set per category.', published: true, sortOrder: 2 },
    { id: 'f8', audience: 'delivery', question: 'How do I mark a task delivered?', answer: 'Ask the recipient for the 4-digit OTP shown in their app and enter it on the task screen.', published: true, sortOrder: 1 },
    { id: 'f9', audience: 'all', question: 'How do I contact support?', answer: 'Raise a ticket from Help & Support. Our team responds within 4 working hours.', published: true, sortOrder: 1 },
    { id: 'f10', audience: 'provider', question: 'Can I offer my own promo codes?', answer: 'Yes — create provider-funded codes from Business → Promo codes. The discount is deducted from your earnings.', published: false, sortOrder: 3 },
  ];

  const cmsPages: CmsPage[] = [
    { id: 'cms_terms', slug: 'terms', title: 'Terms of Service', updatedAt: daysFromNow(-40), updatedBy: 'Aditi Rao', body: 'These Terms govern your use of the Servio apps and website.\n\n1. Bookings are contracts between the customer and the service provider. Servio facilitates discovery, scheduling and payments.\n2. Prices shown include the provider’s service charge; taxes and visiting charges are shown before payment.\n3. Providers are independent professionals verified by Servio before approval.' },
    { id: 'cms_privacy', slug: 'privacy', title: 'Privacy Policy', updatedAt: daysFromNow(-40), updatedBy: 'Aditi Rao', body: 'We collect only the information needed to deliver services: your name, contact details, addresses and booking history.\n\nWe never sell personal data. Location is used only to match you with nearby professionals.' },
    { id: 'cms_refund', slug: 'refund', title: 'Cancellation & Refund Policy', updatedAt: daysFromNow(-12), updatedBy: 'Neha Kapoor', body: 'Free cancellation up to 3 hours before the slot. Refunds to Servio Wallet are instant; cards and UPI take 3–5 business days.' },
    { id: 'cms_about', slug: 'about', title: 'About Servio', updatedAt: daysFromNow(-120), updatedBy: 'Aditi Rao', body: 'Servio connects households with trusted, verified home-service professionals across India.' },
  ];

  /* ───────────────────────── Notifications, broadcasts, audit ───────────────────────── */

  const pendingProv = providers.filter((p) => p.status === 'pending');
  const notifications: AdminNotification[] = [
    { id: 'an_1', kind: 'approval', title: `${pendingProv.length} providers awaiting approval`, body: pendingProv.map((p) => p.businessName).join(', '), href: '/providers?status=pending', read: false, permission: 'providers.manage', createdAt: hoursAgo(2) },
    { id: 'an_2', kind: 'payout', title: 'Payout requests pending', body: `${payouts.filter((p) => p.status === 'requested').length} withdrawal requests need review.`, href: '/payouts?status=requested', read: false, permission: 'payouts.manage', createdAt: hoursAgo(5) },
    { id: 'an_3', kind: 'ticket', title: 'Urgent ticket opened', body: 'Payment deducted but booking not confirmed.', href: '/support?priority=urgent', read: false, permission: 'support.view', createdAt: hoursAgo(7) },
    { id: 'an_4', kind: 'review', title: 'Flagged reviews need moderation', body: `${reviews.filter((r) => r.status === 'flagged').length} reviews were reported.`, href: '/reviews?status=flagged', read: false, permission: 'reviews.moderate', createdAt: hoursAgo(11) },
    { id: 'an_5', kind: 'approval', title: 'New delivery partner signup', body: 'Deepak Gowda (Bengaluru) submitted documents.', href: '/partners?status=pending', read: true, permission: 'partners.manage', createdAt: hoursAgo(26) },
    { id: 'an_6', kind: 'system', title: 'SMS gateway degraded', body: 'MSG91 latency above 2s. OTP fallback to WhatsApp enabled.', read: true, permission: 'system.manage', createdAt: hoursAgo(30) },
    { id: 'an_7', kind: 'booking', title: 'High cancellation rate in Mumbai', body: 'Cancellations up 6% week over week.', href: '/reports', read: true, permission: 'reports.view', createdAt: hoursAgo(50) },
    { id: 'an_8', kind: 'system', title: 'Weekly report ready', body: 'GMV, revenue and supply metrics for last week.', href: '/reports', read: true, permission: 'reports.view', createdAt: hoursAgo(80) },
  ];

  const broadcasts: Broadcast[] = [
    { id: 'bc_1', title: 'Weekend deal: 20% off cleaning', body: 'Use code CLEAN20 on any cleaning service. Valid till Sunday.', audience: 'customer', city: null, channels: ['push', 'email'], status: 'sent', recipients: 8920, openRate: 0.31, createdBy: 'Neha Kapoor', createdAt: daysFromNow(-3) },
    { id: 'bc_2', title: 'New: instant payouts', body: 'Withdraw earnings to your bank within 2 hours, every day.', audience: 'provider', city: null, channels: ['push', 'sms'], status: 'sent', recipients: 412, openRate: 0.64, createdBy: 'Aditi Rao', createdAt: daysFromNow(-9) },
    { id: 'bc_3', title: 'Monsoon safety tips', body: 'Wear rain gear and keep devices dry. Ride safe!', audience: 'delivery', city: 'Mumbai', channels: ['push'], status: 'sent', recipients: 48, openRate: 0.72, createdBy: 'Vivek Menon', createdAt: daysFromNow(-21) },
    { id: 'bc_4', title: 'Diwali deep-clean is here', body: 'Flat ₹300 off with DIWALI300. Slots filling fast!', audience: 'customer', city: null, channels: ['push', 'email', 'sms'], status: 'scheduled', scheduledFor: daysFromNow(2, 9), recipients: 9100, createdBy: 'Neha Kapoor', createdAt: daysFromNow(-1) },
    { id: 'bc_5', title: 'App update available', body: 'Update to the latest version for faster checkout.', audience: 'all', city: null, channels: ['push'], status: 'draft', recipients: 0, createdBy: 'Aditi Rao', createdAt: hoursAgo(5) },
  ];

  const auditActions: [string, string, string, AuditLog['severity']][] = [
    ['provider.approve', 'Provider', 'Approved provider', 'info'],
    ['provider.suspend', 'Provider', 'Suspended provider', 'warning'],
    ['booking.cancel', 'Booking', 'Cancelled booking and refunded customer', 'warning'],
    ['booking.status', 'Booking', 'Changed booking status', 'info'],
    ['payout.pay', 'Payout', 'Marked payout as paid', 'info'],
    ['payout.reject', 'Payout', 'Rejected payout request', 'warning'],
    ['promo.create', 'PromoCode', 'Created promo code', 'info'],
    ['settings.update', 'Settings', 'Updated platform settings', 'critical'],
    ['role.update', 'Role', 'Updated role permissions', 'critical'],
    ['admin.invite', 'Admin', 'Invited admin', 'warning'],
    ['customer.block', 'Customer', 'Blocked customer', 'warning'],
    ['review.hide', 'Review', 'Hid review', 'info'],
    ['ticket.resolve', 'Ticket', 'Resolved ticket', 'info'],
    ['refund.issue', 'Booking', 'Issued partial refund', 'warning'],
    ['flag.toggle', 'FeatureFlag', 'Toggled feature flag', 'critical'],
    ['auth.login', 'Session', 'Signed in', 'info'],
  ];
  const auditLogs: AuditLog[] = [];
  for (let i = 0; i < 140; i++) {
    const [action, entity, summary, severity] = pick(auditActions);
    const actor = pick(admins.filter((a) => a.status !== 'invited'));
    const role = roles.find((r) => r.id === actor.roleId)!;
    const ref = entity === 'Booking' ? pick(bookings).code : entity === 'Provider' ? pick(providers).businessName : entity === 'Payout' ? pick(payouts).id : entity === 'PromoCode' ? pick(promoCodes).code : entity === 'Customer' ? pick(customers).name : '';
    auditLogs.push({
      id: `al_${i + 1}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: role.name,
      action,
      entity,
      entityId: ref || undefined,
      summary: ref ? `${summary} · ${ref}` : summary,
      severity,
      ip: fakeIp(),
      at: hoursAgo(i * 4.3 + rand() * 3),
    });
  }

  const featureFlags: FeatureFlag[] = [
    { key: 'instant_payouts', name: 'Instant payouts', description: 'Providers can withdraw earnings within 2 hours.', enabled: true, rollout: 100, audience: 'provider', updatedAt: daysFromNow(-9) },
    { key: 'live_tracking', name: 'Live professional tracking', description: 'Customers see the professional on a map once on the way.', enabled: true, rollout: 60, audience: 'customer', updatedAt: daysFromNow(-4) },
    { key: 'wallet_cashback', name: 'Wallet cashback', description: '5% cashback in Servio Wallet on online payments.', enabled: false, rollout: 0, audience: 'customer', updatedAt: daysFromNow(-30) },
    { key: 'ai_slot_suggest', name: 'Smart slot suggestions', description: 'Recommend slots with the highest provider availability.', enabled: true, rollout: 25, audience: 'customer', updatedAt: daysFromNow(-2) },
    { key: 'batch_pickups', name: 'Batched pickups', description: 'Group nearby pickup tasks for delivery partners.', enabled: false, rollout: 10, audience: 'delivery', updatedAt: daysFromNow(-15) },
    { key: 'whatsapp_otp', name: 'WhatsApp OTP fallback', description: 'Send OTP via WhatsApp when SMS fails.', enabled: true, rollout: 100, audience: 'all', updatedAt: daysFromNow(-1) },
  ];

  const appVersions: AppVersionConfig[] = (['customer', 'provider', 'delivery'] as const).flatMap((app, i) =>
    (['android', 'ios'] as const).map((platform) => ({
      app,
      platform,
      latest: `3.${8 - i}.${platform === 'ios' ? 1 : 2}`,
      minSupported: `3.${5 - i}.0`,
      forceUpdate: false,
      activeInstalls: app === 'customer' ? (platform === 'android' ? 64200 : 21800) : app === 'provider' ? (platform === 'android' ? 1240 : 310) : platform === 'android' ? 380 : 40,
    })),
  );

  const svc = (key: string, name: string, base: number, status: SystemService['status'] = 'operational', uptime = 99.98): SystemService => ({
    key,
    name,
    status,
    latencyMs: base,
    uptime,
    history: Array.from({ length: 24 }, () => Math.round(base * (0.7 + rand() * 0.6) * (status === 'degraded' ? 1.8 : 1))),
  });
  const systemServices: SystemService[] = [
    svc('api', 'Core API', 120),
    svc('auth', 'Auth & OTP', 90),
    svc('payments', 'Payments (Razorpay)', 310, 'operational', 99.95),
    svc('push', 'Push (FCM / APNs)', 140),
    svc('sms', 'SMS (MSG91)', 1150, 'degraded', 99.2),
    svc('maps', 'Maps & geocoding', 210),
    svc('search', 'Search index', 60),
    svc('storage', 'Media storage', 95),
  ];

  return {
    version: 1,
    seededAt: new Date().toISOString(),
    settings,
    cities,
    categories,
    providers,
    services,
    customers,
    partners,
    bookings,
    deliveryTasks,
    reviews,
    promoCodes,
    banners,
    roles,
    admins,
    payouts,
    walletTxns,
    tickets,
    faqs,
    cmsPages,
    notifications,
    broadcasts,
    auditLogs,
    featureFlags,
    appVersions,
    systemServices,
    /** Demo-only password overrides (email → password). Never do this in production. */
    passwords: {} as Record<string, string>,
  };
}

export type SeedData = ReturnType<typeof createSeed>;

export const categoryNameFrom = (cats: Category[], id: string) => cats.find((c) => c.id === id)?.name ?? id;
