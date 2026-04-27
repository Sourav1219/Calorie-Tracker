const { randomUUID } = require("crypto");

const STANDARD_CATEGORIES = [
  "Amul",
  "Baskin Robbins",
  "Biscuits",
  "Breads & Breakfast",
  "Burger King",
  "Chocolates",
  "Condiments & Sauces",
  "Dominos",
  "Drinks",
  "Energy Drinks",
  "Fast Foods",
  "Fruits",
  "Gym Supplements",
  "Indian Meals",
  "Lays",
  "McDonald's",
  "Non-Vegetarian",
  "O'cean",
  "Other Foods",
  "Protein Foods",
  "Rice & Bowls",
  "Snacks & Street Foods",
  "Soft Drinks",
  "Soups & Salads",
  "Sweets & Desserts",
];

const LEGACY_CATEGORY_TO_SECTION = {
  Biscuits: "Biscuits",
  Beverages: "Drinks",
  "Breakfast & Cereals": "Breads & Breakfast",
  "Chutneys, Pickles & Sauces": "Condiments & Sauces",
  "Dal & Legumes": "Protein Foods",
  Dairy: "Protein Foods",
  "Egg Dishes": "Non-Vegetarian",
  "Fast Food & Bakery": "Fast Foods",
  Fruits: "Fruits",
  "Indian Breads": "Breads & Breakfast",
  "Non-Vegetarian": "Non-Vegetarian",
  "Pasta, Noodles & Pizza": "Fast Foods",
  "Rice & Grains": "Rice & Bowls",
  "Salads & Raita": "Soups & Salads",
  "Snacks & Street Food": "Snacks & Street Foods",
  Soups: "Soups & Salads",
  "Sweets & Desserts": "Sweets & Desserts",
  "Vegetables & Curries": "Indian Meals",
  "Other Foods": "Other Foods",
};

const CATEGORY_ALIASES = {
  amul: "Amul",
  dominos: "Dominos",
  "domino's": "Dominos",
  "mcdonald's": "McDonald's",
  "mcdonald’s": "McDonald's",
  mcdonalds: "McDonald's",
  mcdonald: "McDonald's",
  "burger king": "Burger King",
  burgerking: "Burger King",
  "baskin robbins": "Baskin Robbins",
  "baskin-robbins": "Baskin Robbins",
  baskinrobbins: "Baskin Robbins",
  lays: "Lays",
  "lay's": "Lays",
  "o'cean": "O'cean",
  ocean: "O'cean",
  "soft drinks": "Soft Drinks",
  "soft drink": "Soft Drinks",
  softdrinks: "Soft Drinks",
  biscuits: "Biscuits",
  biscuit: "Biscuits",
  chocolates: "Chocolates",
  chocolate: "Chocolates",
  "energy drinks": "Energy Drinks",
  "energy drink": "Energy Drinks",
  drinks: "Drinks",
  drink: "Drinks",
  beverages: "Drinks",
  beverage: "Drinks",
  "gym supplements": "Gym Supplements",
  "gym supplement": "Gym Supplements",
  supplements: "Gym Supplements",
  supplement: "Gym Supplements",
  "protein foods": "Protein Foods",
  "protein food": "Protein Foods",
  "fast foods": "Fast Foods",
  "fast food": "Fast Foods",
  "snacks & street foods": "Snacks & Street Foods",
  "snacks & street food": "Snacks & Street Foods",
  snacks: "Snacks & Street Foods",
  "breads & breakfast": "Breads & Breakfast",
  breakfast: "Breads & Breakfast",
  breads: "Breads & Breakfast",
  "rice & bowls": "Rice & Bowls",
  rice: "Rice & Bowls",
  "indian meals": "Indian Meals",
  "soups & salads": "Soups & Salads",
  soups: "Soups & Salads",
  salads: "Soups & Salads",
  fruits: "Fruits",
  "sweets & desserts": "Sweets & Desserts",
  sweets: "Sweets & Desserts",
  desserts: "Sweets & Desserts",
  "condiments & sauces": "Condiments & Sauces",
  condiments: "Condiments & Sauces",
  sauces: "Condiments & Sauces",
  "other foods": "Other Foods",
  "fast food & bakery": "Fast Foods",
  "pasta, noodles & pizza": "Fast Foods",
  "breakfast & cereals": "Breads & Breakfast",
  "chutneys, pickles & sauces": "Condiments & Sauces",
  "dal & legumes": "Protein Foods",
  dairy: "Protein Foods",
  "egg dishes": "Non-Vegetarian",
  "indian breads": "Breads & Breakfast",
  "non-vegetarian": "Non-Vegetarian",
  "non vegetarian": "Non-Vegetarian",
  "non veg": "Non-Vegetarian",
  "non-veg": "Non-Vegetarian",
  nonveg: "Non-Vegetarian",
  "rice & grains": "Rice & Bowls",
  "salads & raita": "Soups & Salads",
  "vegetables & curries": "Indian Meals",
};

const BRAND_SECTION_RULES = [
  { section: "Amul", keywords: ["amul"] },
  { section: "Dominos", keywords: ["dominos", "domino's", "domino s"] },
  {
    section: "McDonald's",
    keywords: ["mcdonald's", "mcdonald’s", "mcdonalds", "mcdonald", "mc aloo", "mcveggie", "mcchicken", "mcegg"],
  },
  {
    section: "Burger King",
    keywords: ["burger king", "burgerking", "bk grill", "whopper", "xtra long chicken"],
  },
  {
    section: "Baskin Robbins",
    keywords: ["baskin robbins", "baskin-robbins", "br sundae"],
  },
  { section: "Lays", keywords: ["lays", "lay's", "lay s"] },
  { section: "O'cean", keywords: ["o'cean", "ocean"] },
  {
    section: "Soft Drinks",
    keywords: [
      "coca-cola",
      "coca cola",
      "pepsi",
      "thums up",
      "sprite",
      "fanta",
      "limca",
      "campa cola",
    ],
  },
];

const CHOCOLATE_KEYWORDS = [
  "bar one",
  "bar-one",
  "cadbury 5 star",
  "cadbury dairy milk",
  "cadbury fuse",
  "cadbury gems",
  "cadbury perk",
  "ferrero rocher",
  "galaxy",
  "hershey",
  "kinder joy",
  "kitkat",
  "milkybar",
  "munch",
  "snickers",
];

const BISCUIT_KEYWORDS = [
  "20-20 cookies",
  "50-50",
  "50-50 jeera",
  "anmol butter bite",
  "anmol cream biscuits",
  "anmol marie",
  "bourbon",
  "butter bite",
  "cream biscuits",
  "dark fantasy",
  "digestive",
  "dream cream",
  "farmlite digestive",
  "farmlite oats",
  "good day",
  "happy happy",
  "hide & seek",
  "krackjack",
  "little hearts",
  "little roll",
  "magix cream biscuits",
  "marie gold",
  "marie light",
  "marie lite",
  "maska chaska",
  "mcvitie's digestive",
  "mcvitie's marie",
  "mcvities digestive",
  "mcvities marie",
  "milk bikis",
  "milk shakti",
  "mom's magic",
  "monaco",
  "nutrichoice digestive",
  "nutrichoice oats",
  "oreo chocolate cream",
  "oreo cream biscuit",
  "oreo original",
  "oreo strawberry cream",
  "parle g",
  "parle-g",
  "snakker",
  "tiger",
  "tiger cream",
  "treat croissant",
  "treat oreo cream",
  "treat strawberry cream",
  "unibic cookies",
  "unibic cream biscuits",
];

const ENERGY_DRINK_KEYWORDS = [
  "energy drink",
  "hell energy",
  "monster",
  "prime energy",
  "red bull",
  "sting",
  "cloud 9",
  "xtreme",
  "tzinga",
];

const DRINK_KEYWORDS = [
  "blue lagoon",
  "buttermilk",
  "chai",
  "coconut water",
  "coffee",
  "cola",
  "cold coffee",
  "cooler",
  "fanta",
  "glucon-d",
  "jal jeera",
  "jaljeera",
  "juice",
  "lassi",
  "lemonade",
  "limca",
  "milkshake",
  "mojito",
  "nimbu pani",
  "panna",
  "pepsi",
  "shake",
  "sharbat",
  "sherbet",
  "smoothie",
  "soda",
  "sprite",
  "sugarcane juice",
  "tea",
  "thandai",
  "thums up",
  "water",
];

const GYM_SUPPLEMENT_KEYWORDS = [
  "bcaa",
  "casein",
  "creatine",
  "eaas",
  "electrolyte powder",
  "fat burner",
  "fish oil",
  "isolate",
  "l-carnitine",
  "mass gainer",
  "multivitamin",
  "pre workout",
  "protein powder",
  "test booster",
  "whey",
  "zma",
];

const FAST_FOOD_KEYWORDS = [
  "burger",
  "chowmein",
  "club sandwich",
  "french fries",
  "fries",
  "hot dog",
  "lasagne",
  "macaroni",
  "maggi",
  "mcchicken",
  "mcdonald",
  "mcegg",
  "mcveggie",
  "momo",
  "noodle",
  "pasta",
  "pizza",
  "roll",
  "sandwich",
  "spaghetti",
  "sub",
  "vegan sub",
  "wrap",
];

const SNACK_STREET_KEYWORDS = [
  "bhel",
  "bhel puri",
  "bourbon",
  "britannia",
  "chaat",
  "chakli",
  "chips",
  "cutlet",
  "dahi bhalla",
  "dahi puri",
  "dhokla",
  "digestive",
  "golgyappa",
  "good day",
  "hide & seek",
  "kachori",
  "khakhra",
  "khaman",
  "krackjack",
  "lay's",
  "lays",
  "marie",
  "mathri",
  "mcvitie",
  "mcvitie's",
  "murukku",
  "namkeen",
  "oreo",
  "pakoda",
  "pakora",
  "pani puri",
  "papdi",
  "parle",
  "pav bhaji",
  "popcorn",
  "priyagold",
  "puff",
  "roasted chana",
  "roasted peanuts",
  "samosa",
  "sev",
  "sev puri",
  "sunfeast",
  "tikki",
  "vada",
];

const BREAD_BREAKFAST_KEYWORDS = [
  "appam",
  "bhatura",
  "bread",
  "cereal",
  "chapati",
  "cheela",
  "chilla",
  "cornflakes",
  "dalia",
  "daliya",
  "dosa",
  "idli",
  "kulcha",
  "lachha prantha",
  "muesli",
  "naan",
  "oats",
  "parantha",
  "paratha",
  "poha",
  "poori",
  "prantha",
  "puri",
  "roti",
  "toast",
  "upma",
  "uttapam",
  "waffle",
];

const RICE_BOWL_KEYWORDS = [
  "biryani",
  "curd rice",
  "fried rice",
  "jeera rice",
  "khichdi",
  "khichri",
  "lemon rice",
  "millet",
  "pongal",
  "pulao",
  "quinoa",
  "rice",
  "sabudana",
];

const SOUP_SALAD_KEYWORDS = [
  "coleslaw",
  "nimbu onion",
  "raita",
  "rasam",
  "salad",
  "shorba",
  "sirka onion",
  "soup",
  "yakhni",
];

const CONDIMENT_KEYWORDS = [
  "aachar",
  "achaar",
  "chutney",
  "dip",
  "dressing",
  "jam",
  "jelly",
  "ketchup",
  "mayonnaise",
  "murabba",
  "pickle",
  "sauce",
  "spread",
];

const SWEET_KEYWORDS = [
  "bar one",
  "bar-one",
  "barfi",
  "baskin",
  "biscuit",
  "brownie",
  "burfi",
  "cadbury",
  "cake",
  "chikki",
  "cookie",
  "cream biscuit",
  "croissant",
  "custard",
  "dessert",
  "donut",
  "doughnut",
  "eclair",
  "ferrero",
  "flan",
  "galaxy",
  "halwa",
  "ice cream",
  "ice cream cup",
  "jalebi",
  "katli",
  "kheer",
  "kinder",
  "kitkat",
  "kulfi",
  "laddu",
  "ladoo",
  "marie biscuit",
  "milkybar",
  "mousse",
  "munch",
  "pancake",
  "pastry",
  "payasam",
  "phirni",
  "pie",
  "pudding",
  "pulse",
  "rajbogh",
  "rasgulla",
  "rasmalai",
  "robbins",
  "snickers",
  "tart",
];

const NON_VEG_KEYWORDS = [
  "bacon",
  "bhurji",
  "chicken",
  "egg",
  "fish",
  "ham",
  "kebab",
  "keema",
  "lamb",
  "mcchicken",
  "mcegg",
  "meat",
  "mutton",
  "omelet",
  "omelette",
  "omlet",
  "pepperoni",
  "prawn",
  "salami",
  "seafood",
  "shrimp",
  "turkey",
  "xtra long chicken",
];

const NON_VEG_EXCLUSION_KEYWORDS = [
  "eggless",
];

const LOCKED_SECTION_CATEGORIES = [
  "Amul",
  "Dominos",
  "McDonald's",
  "Burger King",
  "Baskin Robbins",
  "Lays",
  "O'cean",
  "Soft Drinks",
  "Biscuits",
  "Chocolates",
  "Energy Drinks",
  "Drinks",
  "Gym Supplements",
];

const ALLOWED_PROTEIN_FOOD_KEYS = new Set([
  "paneer sandwich brown bread",
  "paneer roll roti paratha wrap",
  "paneer sub 6 inch",
  "vegan sub 6 inch",
  "soya milk 200ml",
  "soya milk 200 ml",
]);

const INDIAN_MEAL_KEYWORDS = [
  "aloo",
  "avial",
  "baingan",
  "bharta",
  "bhartha",
  "bhindi",
  "curry",
  "gobi",
  "kadhi",
  "karela",
  "kofta",
  "korma",
  "matar",
  "mushroom masala",
  "palak",
  "poriyal",
  "saag",
  "sabzi",
  "shimla mirch",
  "thali",
  "thoran",
];

const FRUIT_KEYWORDS = [
  "amla",
  "anar",
  "apple",
  "apricot",
  "banana",
  "berry",
  "chikoo",
  "coconut flesh",
  "coconut water",
  "custard apple",
  "date ",
  "dates",
  "fig",
  "grape",
  "guava",
  "jamun",
  "kiwi",
  "litchi",
  "lychee",
  "mango",
  "melon",
  "orange",
  "papaya",
  "peach",
  "pear",
  "pineapple",
  "plum",
  "pomegranate",
  "rasbhari",
  "sapota",
  "strawberry",
  "watermelon",
];

const CATEGORY_RULES = [
  {
    category: "Energy Drinks",
    keywords: ENERGY_DRINK_KEYWORDS,
  },
  {
    category: "Chutneys, Pickles & Sauces",
    keywords: [
      "baghar",
      "tadka",
      "dressing",
      "ketchup",
      "puree",
      "mayonnaise",
      "masala",
      "spice blend",
    ],
  },
  {
    category: "Soups",
    keywords: ["soup", "consomme", "stock", "yakhni", "yakhani", "shorba", "rasam", "charu", "saaru"],
  },
  {
    category: "Salads & Raita",
    keywords: ["salad", "raita", "coleslaw", "aspic", "raw turnip"],
  },
  {
    category: "Chutneys, Pickles & Sauces",
    keywords: [
      "chutney",
      "pickle",
      "achaar",
      "aachar",
      "sauce",
      "jam",
      "jelly",
      "icing",
      "frosting",
      "murabba",
      "spread",
      "dip",
      "preserve",
      "preserves",
    ],
  },
  {
    category: "Sweets & Desserts",
    keywords: [
      "kheer",
      "halwa",
      "burfi",
      "barfi",
      "katli",
      "ladoo",
      "laddu",
      "payasam",
      "pudding",
      "custard",
      "mousse",
      "ice cream",
      "kulfi",
      "phirni",
      "mal pua",
      "shahi tukre",
      "sorbet",
      "souffle",
      "cheesecake",
      "dessert",
      "chum chum",
      "murki",
      "alaska",
      "rasgulla",
      "rasmalai",
      "charlotte",
      "rousse",
      "gujia",
      "ghujia",
      "lavang latika",
      "ginger candy",
      "candy",
      "fruit delight",
      "dil bahar",
      "kesari bath",
      "chikki",
      "flan",
      "coconut finger",
      "gunjia",
    ],
  },
  {
    category: "Pasta, Noodles & Pizza",
    keywords: ["pasta", "noodle", "chowmein", "macaroni", "lasagne", "spaghetti", "pizza"],
  },
  {
    category: "Fast Food & Bakery",
    keywords: [
      "sandwich",
      "burger",
      "biscuit",
      "cookie",
      "cake",
      "pie",
      "tart",
      "bun",
      "toast",
      "bread",
      "muffin",
      "pastry",
      "eclair",
      "pancake",
      "waffle",
      "patties",
      "gateau",
      "choux",
      "loaf",
      "melting moments",
    ],
  },
  {
    category: "Snacks & Street Food",
    keywords: [
      "dhokla",
      "khaman",
      "khakhra",
      "mathri",
      "papdi",
      "pav bhaji",
      "gobi 65",
      "bhel",
      "pakora",
      "pakoda",
      "chaat",
      "samosa",
      "kachori",
      "vada",
      "tikki",
      "chips",
      "namkeen",
      "cutlet",
      "sev",
      "murmura",
      "roll",
      "puff",
      "cracker",
      "namak paras",
    ],
  },
  {
    category: "Indian Breads",
    keywords: [
      "thepla",
      "roti",
      "chapati",
      "paratha",
      "parantha",
      "naan",
      "bhatura",
      "puri",
      "poori",
      "appam",
      "dosa",
      "uttapam",
      "idli",
      "chilla",
      "cheela",
      "kulcha",
    ],
  },
  {
    category: "Egg Dishes",
    keywords: ["omelette", "omlet", "omelet", "boiled egg", "baked egg", "egg ", " eggs"],
  },
  {
    category: "Non-Vegetarian",
    keywords: [
      "chicken",
      "fish",
      "mutton",
      "prawn",
      "shrimp",
      "lamb",
      "bacon",
      "kebab",
      "meat",
      "keema",
      "afghani",
      "cajun",
      "broth",
      "roghan josh",
    ],
  },
  {
    category: "Rice & Grains",
    keywords: [
      "rice",
      "pulao",
      "biryani",
      "khichri",
      "khichdi",
      "quinoa",
      "millet",
      "amaranth",
      "cracked wheat",
      "dalia",
      "poha",
      "tahar",
    ],
  },
  {
    category: "Breakfast & Cereals",
    keywords: ["cereal", "cornflakes", "oats", "porridge", "premix", "dalia", "muesli", "upma", "handvo", "wheat flakes", "shishu ahar"],
  },
  {
    category: "Dal & Legumes",
    keywords: [
      "dal",
      "lentil",
      "channa",
      "chana",
      "rajma",
      "beans",
      "bean ",
      "gram ",
      "gram curry",
      "chickpea",
      "moong",
      "arhar",
      "sambar",
      "urad",
    ],
  },
  {
    category: "Dairy",
    keywords: [
      "milk",
      "paneer",
      "cheese",
      "curd",
      "yogurt",
      "cream",
      "chenna",
      "chhena",
      "ghee",
      "butter",
    ],
  },
  {
    category: "Vegetables & Curries",
    keywords: [
      "kadhi",
      "korma",
      "do pyaza",
      "dhansak",
      "matar",
      "stuffed ",
      "curry",
      "sabzi",
      "bhujia",
      "bhartha",
      "bharta",
      "kofta",
      "thoran",
      "foogath",
      "poriyal",
      "avial",
      "manchurian",
      "vegetable",
      "veg ",
      "palak",
      "aloo",
      "baingan",
      "gourd",
      "cabbage",
      "cauliflower",
      "broccoli",
      "beans with",
      "bathua",
      "saag",
      "roast potatoes",
      "potato",
      "okra",
      "bhindi",
      "arbi",
      "kathal",
      "jackfruit",
      "methi",
      "mushroom",
      "turnip",
      "yam",
      "suran",
      "sajina",
      "soya chunks",
    ],
  },
  {
    category: "Fruits",
    keywords: FRUIT_KEYWORDS,
  },
  {
    category: "Beverages",
    keywords: [
      "thandai",
      "hot chocolate",
      "mintade",
      "lem-o-gin",
      "tea",
      "coffee",
      "drink",
      "sharbat",
      "sherbet",
      "panna",
      "juice",
      "smoothie",
      "milkshake",
      "shake",
      "cooler",
      "lemonade",
      "water",
      "jal jeera",
      "jaljeera",
      "lassi",
      "buttermilk",
      "canjee",
      "kanjee",
      "cocoa",
      "squash",
      "punch",
    ],
  },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCategoryLabel(category) {
  const normalized = normalizeText(category).toLowerCase();
  return CATEGORY_ALIASES[normalized] || null;
}

function toMeasurementCategory(category, name = "") {
  const section =
    normalizeCategoryLabel(category) ||
    LEGACY_CATEGORY_TO_SECTION[category] ||
    category;
  const normalizedName = normalizeText(name).toLowerCase();

  if (section === "Protein Foods") {
    if (isNonVegetarianItem(normalizedName)) {
      return "Non-Vegetarian";
    }
    if (matchesAnyKeyword(normalizedName, ["milk", "curd", "yogurt", "paneer", "cheese", "butter", "ghee"])) {
      return "Dairy";
    }
    return "Dal & Legumes";
  }

  if (section === "Non-Vegetarian") {
    return "Non-Vegetarian";
  }

  if (section === "Soups & Salads") {
    return matchesAnyKeyword(normalizedName, ["soup", "shorba", "rasam", "yakhni", "stock"])
      ? "Soups"
      : "Salads & Raita";
  }

  const sectionToMeasurementCategory = {
    Biscuits: "Snacks & Street Food",
    Chocolates: "Sweets & Desserts",
    Lays: "Snacks & Street Food",
    "McDonald's": "Fast Food & Bakery",
    "Burger King": "Fast Food & Bakery",
    "Baskin Robbins": "Sweets & Desserts",
    "O'cean": "Beverages",
    "Soft Drinks": "Beverages",
    "Energy Drinks": "Beverages",
    Drinks: "Beverages",
    Amul: "Dairy",
    Dominos: "Pasta, Noodles & Pizza",
    "Fast Foods": "Fast Food & Bakery",
    "Snacks & Street Foods": "Snacks & Street Food",
    "Protein Foods": "Dal & Legumes",
    "Non-Vegetarian": "Non-Vegetarian",
    "Gym Supplements": "Beverages",
    "Breads & Breakfast": "Indian Breads",
    "Rice & Bowls": "Rice & Grains",
    "Indian Meals": "Vegetables & Curries",
    "Soups & Salads": "Salads & Raita",
    Fruits: "Fruits",
    "Sweets & Desserts": "Sweets & Desserts",
    "Condiments & Sauces": "Chutneys, Pickles & Sauces",
    "Other Foods": "Other Foods",
  };

  return sectionToMeasurementCategory[section] || category;
}

function matchesAnyKeyword(normalizedTextValue, keywords) {
  return keywords.some((keyword) => matchesKeyword(normalizedTextValue, keyword));
}

function isLockedSectionCategory(section) {
  return LOCKED_SECTION_CATEGORIES.includes(section);
}

function toProteinFoodKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[–—]/g, " ")
    .replace(/[()/,]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAllowedProteinFoodItem(normalizedTextValue) {
  if (!normalizedTextValue) {
    return false;
  }

  const proteinKey = toProteinFoodKey(normalizedTextValue);
  return ALLOWED_PROTEIN_FOOD_KEYS.has(proteinKey);
}

function isNonVegetarianItem(normalizedTextValue) {
  if (!normalizedTextValue) {
    return false;
  }

  if (matchesAnyKeyword(normalizedTextValue, NON_VEG_EXCLUSION_KEYWORDS)) {
    return false;
  }

  return matchesAnyKeyword(normalizedTextValue, NON_VEG_KEYWORDS);
}

function toSectionCategory(category, name = "", brand = "") {
  const normalizedName = normalizeText(name).toLowerCase();
  const normalizedBrand = normalizeText(brand).toLowerCase();
  const combined = `${normalizedName} ${normalizedBrand}`.trim().replace(/\s+/g, " ");
  const normalizedCategory = normalizeCategoryLabel(category);
  const fallbackFromLegacy = LEGACY_CATEGORY_TO_SECTION[category] || null;

  for (const rule of BRAND_SECTION_RULES) {
    if (rule.keywords.some((keyword) => matchesKeyword(combined, keyword))) {
      return rule.section;
    }
  }

  if (isLockedSectionCategory(normalizedCategory)) {
    return normalizedCategory;
  }

  if (isLockedSectionCategory(fallbackFromLegacy)) {
    return fallbackFromLegacy;
  }

  if (isAllowedProteinFoodItem(combined)) {
    return "Protein Foods";
  }

  if (matchesAnyKeyword(combined, GYM_SUPPLEMENT_KEYWORDS)) {
    return "Gym Supplements";
  }

  if (matchesAnyKeyword(combined, ENERGY_DRINK_KEYWORDS)) {
    return "Energy Drinks";
  }

  if (matchesAnyKeyword(combined, CHOCOLATE_KEYWORDS)) {
    return "Chocolates";
  }

  if (matchesAnyKeyword(combined, BISCUIT_KEYWORDS)) {
    return "Biscuits";
  }

  if (matchesAnyKeyword(combined, DRINK_KEYWORDS)) {
    return "Drinks";
  }

  if (matchesAnyKeyword(combined, ["bournvita milk", "horlicks milk", "hot milk"])) {
    return "Drinks";
  }

  if (matchesAnyKeyword(combined, ["plain curd"])) {
    return "Soups & Salads";
  }

  if (matchesAnyKeyword(combined, ["cheese balls", "extra cheese"])) {
    return "Snacks & Street Foods";
  }

  if (isNonVegetarianItem(combined)) {
    return "Non-Vegetarian";
  }

  if (matchesAnyKeyword(combined, [
    "paneer yakhni", "pulse mix", "gobhi masala", "paneer tikka butter masala",
    "achari paneer", "black chana gravy", "chilli paneer", "chilly paneer", "dosti paneer", "kadahi paneer", "kadhai paneer",
    "khatta channa", "paneer lababdar", "paneer makhni", "paneer matal champ", "paneer special",
    "paneer shaslik/tikka", "potato with curd", "sambar", "shahi paneer", "soya achari champ",
    "soya matal champ", "white chana gravy"
  ])) {
    return "Indian Meals";
  }

  if (matchesAnyKeyword(combined, ["swiss roll", "cinnamon roll", "sweet roll", "oats burfi", "oats barfi", "shrikhand", "rabri", "gulab jamun", "kala jamun"])) {
    return "Sweets & Desserts";
  }

  if (matchesAnyKeyword(combined, FAST_FOOD_KEYWORDS)) {
    return "Fast Foods";
  }

  if (matchesAnyKeyword(combined, SNACK_STREET_KEYWORDS)) {
    return "Snacks & Street Foods";
  }

  if (matchesAnyKeyword(combined, BREAD_BREAKFAST_KEYWORDS)) {
    return "Breads & Breakfast";
  }

  if (matchesAnyKeyword(combined, RICE_BOWL_KEYWORDS)) {
    return "Rice & Bowls";
  }

  if (matchesAnyKeyword(combined, SOUP_SALAD_KEYWORDS)) {
    return "Soups & Salads";
  }

  if (matchesAnyKeyword(combined, CONDIMENT_KEYWORDS)) {
    return "Condiments & Sauces";
  }

  if (matchesAnyKeyword(combined, SWEET_KEYWORDS)) {
    return "Sweets & Desserts";
  }

  if (matchesAnyKeyword(combined, FRUIT_KEYWORDS)) {
    return "Fruits";
  }

  if (matchesAnyKeyword(combined, INDIAN_MEAL_KEYWORDS)) {
    return "Indian Meals";
  }

  if (normalizedCategory) {
    if (normalizedCategory === "Protein Foods" && name) return "Other Foods";
    return normalizedCategory;
  }

  if (fallbackFromLegacy) {
    if (fallbackFromLegacy === "Protein Foods" && name) return "Other Foods";
    return fallbackFromLegacy;
  }

  return "Other Foods";
}

function matchesKeyword(normalizedName, keyword) {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return false;
  }

  if (normalizedKeyword.includes(" ")) {
    return normalizedName.includes(normalizedKeyword);
  }

  return new RegExp(`\\b${escapeRegex(normalizedKeyword)}s?\\b`, "i").test(normalizedName);
}

function inferDishCategoryBeforeGenericRules(name) {
  const normalizedName = normalizeText(name).toLowerCase();
  if (!normalizedName) {
    return null;
  }

  if (isAllowedProteinFoodItem(normalizedName)) {
    return "Protein Foods";
  }

  if (hasKeyword(normalizedName, ["burfi", "barfi", "katli", "ladoo", "laddu", "halwa", "chikki"])) {
    return null;
  }

  const vegetableLeadKeywords = [
    "aloo",
    "baingan",
    "bhindi",
    "mushroom",
    "arbi",
    "methi",
    "cabbage",
    "cauliflower",
    "broccoli",
    "turnip",
    "yam",
    "suran",
    "jackfruit",
    "kathal",
    "okra",
    "potato",
    "gourd",
    "sajina",
  ];
  const dalLeadKeywords = [
    "dal",
    "moong dal",
    "urad dal",
    "chana dal",
    "masoor dal",
    "toor dal",
    "arhar dal",
    "green gram",
    "moong",
    "urad",
    "chana",
    "rajma",
    "lentil",
  ];

  if (
    vegetableLeadKeywords.some((keyword) =>
      normalizedName.startsWith(`${keyword} masala`)
    ) ||
    (hasKeyword(normalizedName, vegetableLeadKeywords) && hasKeyword(normalizedName, ["masala"]))
  ) {
    return "Indian Meals";
  }

  if (
    dalLeadKeywords.some((keyword) => normalizedName.startsWith(keyword)) ||
    (hasKeyword(normalizedName, dalLeadKeywords) && hasKeyword(normalizedName, ["dal", "tadka", "baghar"]))
  ) {
    return "Indian Meals";
  }

  return null;
}

function inferCategory(name, existingCategory, brand = "") {
  const normalizedName = normalizeText(name).toLowerCase();
  if (!normalizedName) {
    return "Other Foods";
  }

  const preclassifiedCategory = inferDishCategoryBeforeGenericRules(normalizedName);
  if (preclassifiedCategory) {
    return preclassifiedCategory;
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => matchesKeyword(normalizedName, keyword))) {
      return toSectionCategory(rule.category, name, brand);
    }
  }

  const normalizedExisting = toSectionCategory(existingCategory, name, brand);
  if (normalizedExisting) {
    return normalizedExisting;
  }

  return "Other Foods";
}

function hasKeyword(name, keywords) {
  const normalizedName = normalizeText(name).toLowerCase();
  return keywords.some((keyword) => matchesKeyword(normalizedName, keyword));
}

function addMeasurementOption(target, unit, grams, label) {
  if (!unit || !Number.isFinite(grams) || grams <= 0) {
    return;
  }

  if (target.some((option) => option.unit === unit)) {
    return;
  }

  target.push({ unit, grams, label });
}

function inferPieceWeight(name, category) {
  category = toMeasurementCategory(category, name);
  const normalizedName = normalizeText(name).toLowerCase();

  if (["Beverages", "Soups", "Salads & Raita", "Chutneys, Pickles & Sauces"].includes(category)) {
    return null;
  }

  if (normalizedName.includes("boiled egg") || normalizedName.includes("egg ")) return 50;
  if (normalizedName.includes("cookie") || normalizedName.includes("biscuit")) return 12;
  if (normalizedName.includes("ladoo") || normalizedName.includes("laddu")) return 35;
  if (normalizedName.includes("burfi") || normalizedName.includes("barfi") || normalizedName.includes("katli")) return 25;
  if (normalizedName.includes("bread slice")) return 30;
  if (normalizedName.includes("roti") || normalizedName.includes("chapati")) return 40;
  if (normalizedName.includes("paratha") || normalizedName.includes("parantha")) return 80;
  if (normalizedName.includes("naan")) return 80;
  if (normalizedName.includes("bhatura")) return 90;
  if (normalizedName.includes("puri") || normalizedName.includes("poori")) return 25;
  if (normalizedName.includes("idli")) return 50;
  if (normalizedName.includes("dosa")) return 100;
  if (normalizedName.includes("uttapam")) return 120;
  if (normalizedName.includes("appam")) return 80;
  if (normalizedName.includes("pakora") || normalizedName.includes("pakoda") || normalizedName.includes("cutlet") || normalizedName.includes("tikki")) return 40;
  if (normalizedName.includes("sandwich")) return 120;
  if (normalizedName.includes("burger")) return 180;
  if (normalizedName.includes("pizza")) return 120;
  if (normalizedName.includes("ice cream") || normalizedName.includes("kulfi")) return 100;

  if (normalizedName.includes("samosa")) return 60;
  if (normalizedName.includes("kachori")) return 50;
  if (normalizedName.includes("vada") || normalizedName.includes("medu vada")) return 45;
  if (normalizedName.includes("dhokla")) return 40;
  if (normalizedName.includes("momo")) return 25;
  if (normalizedName.includes("spring roll")) return 50;
  if (normalizedName.includes("pastry")) return 80;
  if (normalizedName.includes("brownie")) return 60;
  if (normalizedName.includes("cake")) return 80;
  if (normalizedName.includes("gulab jamun")) return 40;
  if (normalizedName.includes("rasgulla")) return 45;
  if (normalizedName.includes("rasmalai")) return 50;
  if (normalizedName.includes("jalebi")) return 30;

  if (FRUIT_KEYWORDS.some((keyword) => normalizedName.includes(keyword))) {
    if (normalizedName.includes("banana")) return 118;
    if (normalizedName.includes("apple")) return 180;
    if (normalizedName.includes("orange")) return 130;
    if (normalizedName.includes("mango")) return 200;
    if (normalizedName.includes("amla")) return 35;
    if (normalizedName.includes("guava")) return 100;
    if (normalizedName.includes("papaya")) return 150;
    if (normalizedName.includes("watermelon")) return 280;
    if (normalizedName.includes("grape")) return 5;
    if (normalizedName.includes("pomegranate")) return 200;
    if (normalizedName.includes("pineapple")) return 150;
    if (normalizedName.includes("chikoo") || normalizedName.includes("sapota")) return 80;
    if (normalizedName.includes("litchi") || normalizedName.includes("lychee")) return 15;
    if (normalizedName.includes("jamun")) return 10;
    if (normalizedName.includes("pear")) return 170;
    if (normalizedName.includes("peach")) return 150;
    if (normalizedName.includes("plum")) return 65;
    if (normalizedName.includes("kiwi")) return 75;
    if (normalizedName.includes("strawberry")) return 12;
    if (normalizedName.includes("fig")) return 50;
    if (normalizedName.includes("coconut")) return 200;
    if (normalizedName.includes("date")) return 8;
    return 100;
  }

  if (category === "Indian Breads") return 60;
  if (category === "Egg Dishes") return 80;
  if (category === "Fast Food & Bakery") return 60;

  return null;
}

function inferSliceWeight(name) {
  const normalizedName = normalizeText(name).toLowerCase();
  if (normalizedName.includes("bread")) return 30;
  if (normalizedName.includes("pizza")) return 120;
  if (normalizedName.includes("cake") || normalizedName.includes("pastry") || normalizedName.includes("pie") || normalizedName.includes("tart") || normalizedName.includes("gateau") || normalizedName.includes("cheesecake")) return 80;
  return null;
}

function inferPacketWeight(name) {
  const normalizedName = normalizeText(name).toLowerCase();
  if (normalizedName.includes("biscuit") || normalizedName.includes("cookie")) return 60;
  if (normalizedName.includes("chips") || normalizedName.includes("namkeen") || normalizedName.includes("sev") || normalizedName.includes("cracker")) return 50;
  if (normalizedName.includes("chocolate")) return 40;
  return null;
}

function shouldUseKatori(name, category) {
  category = toMeasurementCategory(category, name);
  const normalizedName = normalizeText(name).toLowerCase();
  if (!["Rice & Grains", "Dal & Legumes", "Vegetables & Curries", "Salads & Raita", "Other Foods"].includes(category)) {
    return false;
  }

  if (hasKeyword(normalizedName, ["ice cream", "kulfi", "cookie", "biscuit", "cake", "gateau", "sandwich", "burger", "pizza", "pakora", "pakoda", "samosa", "chips"])) {
    return false;
  }

  return true;
}

function shouldUseCup(name, category) {
  category = toMeasurementCategory(category, name);
  const normalizedName = normalizeText(name).toLowerCase();
  if (["Beverages", "Soups"].includes(category)) {
    return true;
  }

  return hasKeyword(normalizedName, ["ice cream", "kulfi", "phirni"]);
}

function isAmulLiquidItem(name) {
  const n = name.toLowerCase();
  const isSolidOverride = matchesAnyKeyword(n, ["ice cream", "stick", "cone", "kulfi", "chocobar", "paneer", "cheese", "butter", "ghee", "spread", "slice", "cube", "dahi", "yogurt", "curd", "masti dahi"]);
  if (isSolidOverride) return false;

  const isLiquidKeyword = matchesAnyKeyword(n, ["milk", "lassi", "buttermilk", "chaach", "shake", "drink", "kool", "cafe", "beverage", "smoothie"]);
  if (isLiquidKeyword) return true;

  const isChocolateDrink = n.includes("chocolate") && (n.includes("milk") || n.includes("shake") || n.includes("kool") || n.includes("drink"));
  return isChocolateDrink;
}

function inferAmulPackSize(name) {
  const n = name.toLowerCase();
  if (n.includes("kool")) return 200;
  if (n.includes("lassi")) return 200;
  if (n.includes("buttermilk") || n.includes("chaach")) return 200;
  if (n.includes("taaza") || n.includes("gold") || n.includes("shakti") || n.includes("cow milk") || n.includes("buffalo milk")) {
    if (n.includes("small") || n.includes("tetra") || n.includes("250")) return 250;
    if (n.includes("500")) return 500;
    if (n.includes("1l") || n.includes("1 l") || n.includes("1000")) return 1000;
    return 500; // common pouch size
  }
  return 200; // default for most other drinks (Kool, Lassi packs)
}

function chooseDefaultMeasurementUnit(name, category, options) {
  if (options && options.length > 0) {
    return options[0].unit;
  }
  return null;
}

function buildMeasurementOptions({ name, category }) {
  const section = toSectionCategory(category, name);
  const n = normalizeText(name).toLowerCase();
  const options = [];

  switch (section) {
    case "Amul": {
      // Differentiate Amul liquids (milk, lassi, buttermilk, Kool beverages) from solids (paneer, cheese, ice cream sticks)
      const isLiquid = isAmulLiquidItem(n);
      if (isLiquid) {
        const packSize = inferAmulPackSize(name);
        options.push({ unit: "ml", grams: 1, label: "Millilitre" });
        options.push({ unit: "glass", grams: 200, label: "Glass" });
        options.push({ unit: "pack", grams: packSize, label: `Pack (${packSize}ml)` });
      } else {
        options.push({ unit: "piece", grams: 100, label: "Piece" });
        options.push({ unit: "g", grams: 1, label: "Gram" });
      }
      break;
    }

    case "Baskin Robbins":
      options.push({ unit: "scoop", grams: 80, label: "Scoop" });
      options.push({ unit: "katori", grams: 120, label: "Katori" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Biscuits":
      options.push({ unit: "piece", grams: 10, label: "Piece" });
      options.push({ unit: "packet", grams: 50, label: "Packet" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Breads & Breakfast": {
      // Use smart piece weight based on item name
      const pieceWt = inferPieceWeight(name, category) || 60;
      options.push({ unit: "piece", grams: pieceWt, label: "Piece" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Burger King":
      options.push({ unit: "piece", grams: 100, label: "Piece" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Chocolates": {
      const isDairyMilk = matchesAnyKeyword(n, ["dairy milk"]);
      options.push({ unit: "bar", grams: isDairyMilk ? 36 : 40, label: "Bar" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Condiments & Sauces":
      options.push({ unit: "tsp", grams: 5, label: "Teaspoon" });
      options.push({ unit: "tbsp", grams: 15, label: "Tablespoon" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Dominos": {
      // Differentiate pizza from non-pizza items (garlic bread, sides, etc.)
      const isPizza = matchesAnyKeyword(n, ["pizza"]);
      if (isPizza) {
        options.push({ unit: "Piece", grams: 100, label: "Piece" });
        options.push({ unit: "Regular (4 Pieces)", grams: 400, label: "Regular (4 Pieces)" });
        options.push({ unit: "Medium (6 Pieces)", grams: 600, label: "Medium (6 Pieces)" });
        options.push({ unit: "Large (8 Pieces)", grams: 800, label: "Large (8 Pieces)" });
      } else {
        options.push({ unit: "piece", grams: 100, label: "Piece" });
        options.push({ unit: "g", grams: 1, label: "Gram" });
      }
      break;
    }

    case "Drinks":
      options.push({ unit: "ml", grams: 1, label: "Millilitre" });
      options.push({ unit: "cup", grams: 150, label: "Cup" });
      options.push({ unit: "glass", grams: 200, label: "Glass" });
      break;

    case "Energy Drinks":
      options.push({ unit: "ml", grams: 1, label: "Millilitre" });
      options.push({ unit: "can", grams: 250, label: "Can" });
      break;

    case "Fast Foods": {
      const fpw = inferPieceWeight(name, category) || 100;
      options.push({ unit: "piece", grams: fpw, label: "Piece" });
      options.push({ unit: "plate", grams: 200, label: "Plate" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Fruits": {
      // Use realistic per-fruit piece weights
      const fruitPw = inferPieceWeight(name, "Fruits") || 100;
      options.push({ unit: "piece", grams: fruitPw, label: "Piece" });
      options.push({ unit: "katori", grams: 150, label: "Katori (chopped)" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Gym Supplements":
      options.push({ unit: "scoop", grams: 30, label: "Scoop" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Indian Meals":
      options.push({ unit: "katori", grams: 150, label: "Katori" });
      options.push({ unit: "small katori", grams: 100, label: "Small Katori" });
      options.push({ unit: "large katori", grams: 250, label: "Large Katori" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Lays":
      options.push({ unit: "packet", grams: 52, label: "Packet (52g)" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "McDonald's":
      options.push({ unit: "piece", grams: 100, label: "Piece" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Non-Vegetarian": {
      // Differentiate piece items (eggs, kebabs, tikka) from curry items (chicken curry, mutton curry)
      const isCurryStyle = matchesAnyKeyword(n, ["curry", "masala", "gravy", "korma", "bhuna", "kadhai", "kadahi", "biryani", "keema"]);
      if (isCurryStyle) {
        options.push({ unit: "katori", grams: 150, label: "Katori" });
        options.push({ unit: "small katori", grams: 100, label: "Small Katori" });
        options.push({ unit: "large katori", grams: 250, label: "Large Katori" });
      } else {
        const nvPw = inferPieceWeight(name, category) || 100;
        options.push({ unit: "piece", grams: nvPw, label: "Piece" });
      }
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "O'cean":
      options.push({ unit: "bottle", grams: 500, label: "Bottle" });
      options.push({ unit: "ml", grams: 1, label: "Millilitre" });
      break;

    case "Protein Foods":
      options.push({ unit: "piece", grams: 100, label: "Piece" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Rice & Bowls":
      options.push({ unit: "katori", grams: 150, label: "Katori" });
      options.push({ unit: "bowl", grams: 250, label: "Bowl" });
      options.push({ unit: "plate", grams: 300, label: "Plate" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;

    case "Snacks & Street Foods": {
      const snackPw = inferPieceWeight(name, category) || 100;
      options.push({ unit: "piece", grams: snackPw, label: "Piece" });
      options.push({ unit: "plate", grams: 200, label: "Plate" });
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Soft Drinks":
      options.push({ unit: "ml", grams: 1, label: "Millilitre" });
      options.push({ unit: "can", grams: 300, label: "Can" });
      options.push({ unit: "bottle", grams: 600, label: "Bottle" });
      break;

    case "Soups & Salads": {
      const isSoup = matchesAnyKeyword(n, ["soup", "shorba", "rasam", "yakhni"]);
      if (isSoup) {
        options.push({ unit: "bowl", grams: 200, label: "Bowl" });
        options.push({ unit: "cup", grams: 150, label: "Cup" });
      } else {
        options.push({ unit: "katori", grams: 150, label: "Katori" });
        options.push({ unit: "small katori", grams: 100, label: "Small Katori" });
      }
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    case "Sweets & Desserts": {
      // Differentiate piece items (ladoo, barfi) from pourable/katori items (kheer, halwa)
      const isPieceSweet = matchesAnyKeyword(n, [
        "ladoo", "laddu", "barfi", "burfi", "katli", "rasgulla", "rasmalai",
        "gulab jamun", "jalebi", "chikki", "brownie", "cookie", "pastry",
        "donut", "doughnut", "eclair", "cake", "pie", "tart",
      ]);
      if (isPieceSweet) {
        const sweetPw = inferPieceWeight(name, category) || 30;
        options.push({ unit: "piece", grams: sweetPw, label: "Piece" });
      } else {
        options.push({ unit: "katori", grams: 150, label: "Katori" });
        options.push({ unit: "small katori", grams: 100, label: "Small Katori" });
      }
      options.push({ unit: "g", grams: 1, label: "Gram" });
      break;
    }

    default:
      options.push({ unit: "g", grams: 1, label: "Gram" });
      options.push({ unit: "katori", grams: 150, label: "Katori" });
      break;
  }

  return options;
}

function extractQuantityFromName(name) {
  if (!name) return null;
  // Match patterns like "250 ml", "250ml", "1 kg", "500g", "(200 ml)", "- 250 ml"
  const regex = /(?:^|\s|\()(\d+(?:\.\d+)?)\s*(ml|g|kg|l)\b/i;
  const match = name.match(regex);
  if (match) {
    let value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "kg" || unit === "l") {
      value *= 1000;
    }
    return { value, unit: unit === "l" || unit === "ml" ? "ml" : "g" };
  }
  return null;
}



function normalizeMeasurementOptions(measurementOptions, name, category) {
  return buildMeasurementOptions({ name, category });
}

function buildFoodKey(food) {
  return [food.name, food.category || ""]
    .map((value) => normalizeText(value).toLowerCase())
    .join("::");
}

function normalizeFoodDocument(raw, fallbackCreatedBy = null) {
  let originalName = raw.name || raw["Dish Name"] || raw["Food Item"] || "";
  let name = normalizeText(originalName);

  // Extract quantity before stripping suffixes
  const extracted = extractQuantityFromName(originalName);

  // Strip common weight/volume suffixes from the name (e.g., " - 250 ml" or "(250 ml)")
  name = name.replace(/\s*-\s*\d+(?:\.\d+)?\s*(ml|g|kg|l)\s*$/i, "").trim();
  name = name.replace(/\s*\(\d+(?:\.\d+)?\s*(ml|g|kg|l)\)\s*$/i, "").trim();

  const category = inferCategory(name, raw.category, raw.brand);
  const measurementCategory = toMeasurementCategory(category, name);
  const section = toSectionCategory(category, name);

  // Differentiate liquids for serving unit
  const isAmulLiquid = section === "Amul" && isAmulLiquidItem(name);
  const servingUnit = (["Beverages", "Soups"].includes(measurementCategory) || isAmulLiquid) ? "ml" : "g";

  // Use extracted quantity as servingSize if it exists, otherwise fallback to raw or 100
  let servingSize = toNumber(raw.servingSize, 0);
  if (servingSize <= 0 || servingSize === 100) {
    if (extracted && extracted.value > 0) {
      servingSize = extracted.value;
    } else if (isAmulLiquid) {
      servingSize = inferAmulPackSize(name);
    } else {
      servingSize = 100;
    }
  }

  const measurementOptions = normalizeMeasurementOptions(raw.measurementOptions, name, category);
  const defaultMeasurementUnit = chooseDefaultMeasurementUnit(
    name,
    category,
    measurementOptions
  );

  return {
    _id: typeof raw._id === "string" ? raw._id : randomUUID(),
    name,
    brand: normalizeText(raw.brand) || null,
    category,
    servingSize,
    servingUnit,
    defaultMeasurementUnit,
    defaultQuantity: raw.defaultQuantity ? toNumber(raw.defaultQuantity, 1) : 1,
    measurementOptions,
    caloriesPer: toNumber(raw.caloriesPer ?? raw["Calories (kcal)"], 0),
    proteinG: toNumber(raw.proteinG ?? raw["Protein (g)"], 0),
    carbsG: toNumber(raw.carbsG ?? raw["Carbohydrates (g)"], 0),
    fatG: toNumber(raw.fatG ?? raw["Fat (g)"] ?? raw["Fats (g)"], 0),
    fibreG: toNumber(raw.fibreG ?? raw["Fibre (g)"], 0),
    sugarG: toNumber(raw.sugarG ?? raw["Free Sugar (g)"], 0),
    sodiumMg: toNumber(raw.sodiumMg ?? raw["Sodium (mg)"], 0),
    isVerified:
      typeof raw.isVerified === "boolean"
        ? raw.isVerified
        : true,
    createdBy: raw.createdBy ? String(raw.createdBy) : fallbackCreatedBy,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  };
}

module.exports = {
  STANDARD_CATEGORIES,
  buildFoodKey,
  buildMeasurementOptions,
  chooseDefaultMeasurementUnit,
  inferCategory,
  normalizeFoodDocument,
  toSectionCategory,
  normalizeText,
};
