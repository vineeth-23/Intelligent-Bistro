import type { MenuItem } from "./types";

const itemImage = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "spicy_chicken_sandwich",
    name: "Spicy Chicken Sandwich",
    description: "Buttermilk fried chicken, chili honey glaze, pickles, herb aioli, toasted brioche.",
    category: "sandwiches",
    basePrice: 14.5,
    imageUrl: itemImage("photo-1606755962773-d324e0a13086"),
    accentColor: "#D94924",
    tags: ["crispy", "popular", "contains gluten"],
    spiceLevel: 2,
    variants: [
      { id: "classic", label: "Classic", priceDelta: 0 },
      { id: "extra_spicy", label: "Extra spicy", priceDelta: 0.75 },
      { id: "double_chicken", label: "Double chicken", priceDelta: 4.5 }
    ],
    modifiers: [
      { id: "no_aioli", label: "No aioli", priceDelta: 0 },
      { id: "extra_pickles", label: "Extra pickles", priceDelta: 0.5 },
      { id: "add_cheddar", label: "Add cheddar", priceDelta: 1.25 }
    ]
  },
  {
    id: "truffle_mushroom_burger",
    name: "Truffle Mushroom Burger",
    description: "Seared beef, roasted mushrooms, truffle fonduta, arugula, sesame milk bun.",
    category: "sandwiches",
    basePrice: 17.25,
    imageUrl: itemImage("photo-1550547660-d9450f859349"),
    accentColor: "#7C5B3E",
    tags: ["savory", "chef pick"],
    spiceLevel: 0,
    variants: [
      { id: "single", label: "Single patty", priceDelta: 0 },
      { id: "double", label: "Double patty", priceDelta: 5 },
      { id: "lettuce_wrap", label: "Lettuce wrap", priceDelta: 0 }
    ],
    modifiers: [
      { id: "no_mushrooms", label: "No mushrooms", priceDelta: 0 },
      { id: "extra_truffle", label: "Extra truffle fonduta", priceDelta: 1.75 },
      { id: "add_bacon", label: "Add bacon", priceDelta: 2.5 }
    ]
  },
  {
    id: "saffron_salmon_bowl",
    name: "Saffron Salmon Bowl",
    description: "Crisp-skinned salmon, saffron rice, cucumber, herbs, lemon yogurt.",
    category: "bowls",
    basePrice: 19.75,
    imageUrl: itemImage("photo-1519708227418-c8fd9a32b7a2"),
    accentColor: "#E09F3E",
    tags: ["protein-rich", "gluten-free"],
    spiceLevel: 0,
    variants: [
      { id: "regular", label: "Regular", priceDelta: 0 },
      { id: "extra_salmon", label: "Extra salmon", priceDelta: 7 },
      { id: "greens_base", label: "Greens base", priceDelta: 0 }
    ],
    modifiers: [
      { id: "sauce_side", label: "Sauce on side", priceDelta: 0 },
      { id: "extra_yogurt", label: "Extra lemon yogurt", priceDelta: 0.75 },
      { id: "add_avocado", label: "Add avocado", priceDelta: 2.25 }
    ]
  },
  {
    id: "garden_risotto",
    name: "Garden Risotto",
    description: "Arborio rice, spring vegetables, parmesan, basil oil, toasted pine nuts.",
    category: "chef-specials",
    basePrice: 18,
    imageUrl: itemImage("photo-1476124369491-e7addf5db371"),
    accentColor: "#5F8D4E",
    tags: ["vegetarian", "creamy"],
    spiceLevel: 0,
    variants: [
      { id: "parmesan", label: "Parmesan", priceDelta: 0 },
      { id: "vegan", label: "Vegan", priceDelta: 0 },
      { id: "add_shrimp", label: "Add shrimp", priceDelta: 6 }
    ],
    modifiers: [
      { id: "no_nuts", label: "No pine nuts", priceDelta: 0 },
      { id: "extra_parmesan", label: "Extra parmesan", priceDelta: 1 },
      { id: "light_basil_oil", label: "Light basil oil", priceDelta: 0 }
    ]
  },
  {
    id: "harissa_fries",
    name: "Harissa Fries",
    description: "Crispy shoestring fries dusted with harissa salt and parsley.",
    category: "sides",
    basePrice: 7.5,
    imageUrl: itemImage("photo-1573080496219-bb080dd4f877"),
    accentColor: "#B02E0C",
    tags: ["shareable", "spicy"],
    spiceLevel: 1,
    variants: [
      { id: "regular", label: "Regular", priceDelta: 0 },
      { id: "large", label: "Large", priceDelta: 2.25 }
    ],
    modifiers: [
      { id: "sauce_side", label: "Dipping sauce on side", priceDelta: 0 },
      { id: "extra_crispy", label: "Extra crispy", priceDelta: 0 },
      { id: "no_harissa", label: "No harissa", priceDelta: 0 }
    ]
  },
  {
    id: "large_water",
    name: "Still Water",
    description: "Chilled mineral water served still or sparkling.",
    category: "drinks",
    basePrice: 3,
    imageUrl: itemImage("photo-1523362628745-0c100150b504"),
    accentColor: "#4A90A4",
    tags: ["refreshing"],
    spiceLevel: 0,
    variants: [
      { id: "regular", label: "Regular", priceDelta: 0 },
      { id: "large", label: "Large", priceDelta: 1 },
      { id: "sparkling", label: "Sparkling", priceDelta: 1.25 }
    ],
    modifiers: [
      { id: "no_ice", label: "No ice", priceDelta: 0 },
      { id: "lemon", label: "Lemon", priceDelta: 0 }
    ]
  },
  {
    id: "citrus_spritz",
    name: "Citrus Spritz",
    description: "Blood orange, yuzu, mint, soda, and a salted citrus rim.",
    category: "drinks",
    basePrice: 6.75,
    imageUrl: itemImage("photo-1544145945-f90425340c7e"),
    accentColor: "#F28C28",
    tags: ["zero-proof", "bright"],
    spiceLevel: 0,
    variants: [
      { id: "regular", label: "Regular", priceDelta: 0 },
      { id: "pitcher", label: "Pitcher", priceDelta: 13 }
    ],
    modifiers: [
      { id: "no_mint", label: "No mint", priceDelta: 0 },
      { id: "light_ice", label: "Light ice", priceDelta: 0 },
      { id: "extra_yuzu", label: "Extra yuzu", priceDelta: 0.75 }
    ]
  },
  {
    id: "chocolate_budino",
    name: "Chocolate Budino",
    description: "Dark chocolate custard, whipped mascarpone, olive oil crumble.",
    category: "desserts",
    basePrice: 9.5,
    imageUrl: itemImage("photo-1606313564200-e75d5e30476c"),
    accentColor: "#4F2D24",
    tags: ["dessert", "rich"],
    spiceLevel: 0,
    variants: [
      { id: "single", label: "Single", priceDelta: 0 },
      { id: "for_two", label: "For two", priceDelta: 6 }
    ],
    modifiers: [
      { id: "no_crumble", label: "No crumble", priceDelta: 0 },
      { id: "extra_mascarpone", label: "Extra mascarpone", priceDelta: 1.25 }
    ]
  }
];

export const getMenuItem = (menuItemId: string, menu: MenuItem[] = MENU_ITEMS) =>
  menu.find((item) => item.id === menuItemId);
